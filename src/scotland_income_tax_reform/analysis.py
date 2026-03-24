"""Pure analysis functions — testable without PolicyEngine."""

import numpy as np


def weighted_sum(values, weights):
    """Weighted sum of values."""
    return float(np.sum(np.asarray(values) * np.asarray(weights)))


def weighted_mean(values, weights):
    """Weighted mean of values."""
    w = np.asarray(weights)
    total_weight = w.sum()
    if total_weight == 0:
        return 0.0
    return float(np.sum(np.asarray(values) * w) / total_weight)


def build_rate_comparison_table(current_scottish, ruk, phase1, phase2):
    """Build a comparison table of rate schedules.

    Returns a list of dicts with keys: band, threshold, current_rate,
    ruk_rate, phase1_rate, phase2_rate.
    """
    rows = []

    # Map rUK, phase1, phase2 bands by threshold for lookup
    ruk_by_threshold = {r["threshold"]: r["rate"] for r in ruk}
    p1_by_threshold = {r["threshold"]: r["rate"] for r in phase1}
    p2_by_threshold = {r["threshold"]: r["rate"] for r in phase2}

    # All unique thresholds
    all_thresholds = sorted(
        set(
            [r["threshold"] for r in current_scottish]
            + [r["threshold"] for r in ruk]
            + [r["threshold"] for r in phase1]
            + [r["threshold"] for r in phase2]
        )
    )

    for threshold in all_thresholds:
        current = next(
            (r for r in current_scottish if r["threshold"] == threshold), None
        )
        rows.append(
            {
                "threshold": threshold,
                "current_band": current["band"] if current else None,
                "current_rate": current["rate"] if current else None,
                "ruk_rate": ruk_by_threshold.get(threshold),
                "phase1_rate": p1_by_threshold.get(threshold),
                "phase2_rate": p2_by_threshold.get(threshold),
            }
        )

    return rows


def build_scotland_revenue_summary(
    baseline_it,
    reform_it,
    baseline_earned,
    reform_earned,
    baseline_hh,
    reform_hh,
):
    """Build revenue summary comparing baseline and reform.

    All inputs in raw pounds (not billions). Returns dict with values in
    billions.
    """
    return {
        "baseline_it_bn": round(baseline_it / 1e9, 2),
        "reform_it_bn": round(reform_it / 1e9, 2),
        "it_change_bn": round((reform_it - baseline_it) / 1e9, 2),
        "baseline_earned_bn": round(baseline_earned / 1e9, 2),
        "reform_earned_bn": round(reform_earned / 1e9, 2),
        "earned_change_bn": round((reform_earned - baseline_earned) / 1e9, 2),
        "baseline_hh_bn": round(baseline_hh / 1e9, 2),
        "reform_hh_bn": round(reform_hh / 1e9, 2),
        "hh_change_bn": round((reform_hh - baseline_hh) / 1e9, 2),
        "revenue_cost_bn": round((baseline_it - reform_it) / 1e9, 2),
    }


def build_decile_distribution(
    baseline_income, reform_income, deciles, weights
):
    """Build per-decile distribution of income changes.

    Args:
        baseline_income: array of baseline household incomes (Scotland only)
        reform_income: array of reformed household incomes (Scotland only)
        deciles: array of income decile assignments (1-10)
        weights: array of household weights

    Returns:
        List of dicts with per-decile averages.
    """
    baseline_income = np.asarray(baseline_income)
    reform_income = np.asarray(reform_income)
    deciles = np.asarray(deciles)
    weights = np.asarray(weights)

    change = reform_income - baseline_income

    rows = []
    for d in range(1, 11):
        mask = deciles == d
        if not mask.any():
            continue

        d_weights = weights[mask]
        d_baseline = baseline_income[mask]
        d_change = change[mask]

        avg_baseline = weighted_mean(d_baseline, d_weights)
        avg_change = weighted_mean(d_change, d_weights)
        avg_change_pct = (
            round(avg_change / avg_baseline * 100, 2) if avg_baseline != 0 else 0.0
        )

        rows.append(
            {
                "decile": d,
                "avg_baseline_income": round(avg_baseline, 0),
                "avg_income_change": round(avg_change, 0),
                "avg_income_change_pct": avg_change_pct,
            }
        )

    return rows


def build_baseline_deciles(hh_income, hh_it, deciles, weights):
    """Build per-decile baseline summary for Scottish households.

    Returns list of dicts with avg HH net income and avg income tax per decile.
    """
    hh_income = np.asarray(hh_income)
    hh_it = np.asarray(hh_it)
    deciles = np.asarray(deciles)
    weights = np.asarray(weights)

    rows = []
    for d in range(1, 11):
        mask = deciles == d
        if not mask.any():
            continue
        d_weights = weights[mask]
        avg_income = weighted_mean(hh_income[mask], d_weights)
        avg_it = weighted_mean(hh_it[mask], d_weights)
        rows.append({
            "decile": d,
            "avg_hh_net_income": round(avg_income, 0),
            "avg_hh_income_tax": round(avg_it, 0),
        })
    return rows


def build_winners_losers(baseline_income, reform_income, deciles, weights, threshold=1.0):
    """Build per-decile winners/losers breakdown.

    A household is a 'winner' if net income rises by more than threshold,
    a 'loser' if it falls by more than threshold, unchanged otherwise.
    """
    baseline_income = np.asarray(baseline_income)
    reform_income = np.asarray(reform_income)
    deciles = np.asarray(deciles)
    weights = np.asarray(weights)

    change = reform_income - baseline_income

    rows = []
    for d in range(1, 11):
        mask = deciles == d
        if not mask.any():
            continue
        d_weights = weights[mask]
        d_change = change[mask]
        total_w = d_weights.sum()
        if total_w == 0:
            continue

        winners = float((d_weights[d_change > threshold]).sum() / total_w * 100)
        losers = float((d_weights[d_change < -threshold]).sum() / total_w * 100)
        unchanged = 100.0 - winners - losers

        rows.append({
            "decile": d,
            "pct_winners": round(winners, 1),
            "pct_unchanged": round(unchanged, 1),
            "pct_losers": round(losers, 1),
        })
    return rows


def build_article_comparison(phase1_cost, phase2_cost, phase2_additional):
    """Build comparison table: PolicyEngine vs article claims.

    Inputs in raw pounds. Returns dict with values in billions.
    """
    p1_bn = phase1_cost / 1e9
    p2_bn = phase2_cost / 1e9
    p2_add_bn = phase2_additional / 1e9

    return {
        "phase1": {
            "article_claim": "~2",
            "pe_estimate_bn": round(p1_bn, 1),
            "description": "Phase 1: align with rUK + 1p cut",
        },
        "phase2_additional": {
            "article_claim": "3.7",
            "pe_estimate_bn": round(p2_add_bn, 1),
            "description": "Phase 2: further 3p cut (additional cost)",
        },
        "total": {
            "article_claim": "~5.7",
            "pe_estimate_bn": round(p2_bn, 1),
            "description": "Total cost (4p below rUK)",
        },
        "growth_per_pp_ifs_bn": 0.3,
        "growth_needed_phase1_pp": round(p1_bn / 0.3, 0),
        "growth_needed_total_pp": round(p2_bn / 0.3, 0),
    }
