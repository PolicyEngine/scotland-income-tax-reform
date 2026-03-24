"""
Pipeline for Reform UK Scotland income tax proposal analysis.

Two phases:
  Phase 1: Align Scottish income tax with rUK, then cut by 1p
  Phase 2: Align Scottish income tax with rUK, then cut by 4p
"""

import json

from scotland_income_tax_reform import (
    DATA_DIR,
    DASHBOARD_DATA_DIR,
    DEFAULT_YEAR,
    RESULTS_FILENAME,
)
from scotland_income_tax_reform.analysis import (
    build_article_comparison,
    build_baseline_deciles,
    build_decile_distribution,
    build_rate_comparison_table,
    build_scotland_revenue_summary,
    build_winners_losers,
)


CURRENT_SCOTTISH_RATES = [
    {"band": "Starter", "threshold": 0, "rate": 19},
    {"band": "Basic", "threshold": 14_876, "rate": 20},
    {"band": "Intermediate", "threshold": 26_561, "rate": 21},
    {"band": "Higher", "threshold": 43_662, "rate": 42},
    {"band": "Advanced", "threshold": 75_000, "rate": 45},
    {"band": "Top", "threshold": 125_140, "rate": 48},
]

RUK_RATES = [
    {"band": "Basic", "threshold": 0, "rate": 20},
    {"band": "Higher", "threshold": 37_700, "rate": 40},
    {"band": "Additional", "threshold": 125_140, "rate": 45},
]


def make_reform(rate_cut_pp):
    """Return a simulation modifier that aligns Scottish rates with rUK
    then cuts by rate_cut_pp pence in the pound."""
    from policyengine_core.periods import instant

    def apply(sim):
        scot = sim.tax_benefit_system.parameters.gov.hmrc.income_tax.rates.scotland.rates
        start = instant("2026-01-01")
        stop = instant("2027-12-31")

        cut = rate_cut_pp / 100

        # rUK 2026: basic 20%, higher 40%, additional 45%
        # Minus cut_pp from each
        schedule = [
            (0, 0.20 - cut),
            (1, 0.20 - cut),
            (2, 0.20 - cut),
            (37_700, 0.40 - cut),
            (125_140, 0.45 - cut),
            (10_000_000, 0.45 - cut),
        ]

        for i, (threshold, rate) in enumerate(schedule):
            scot.brackets[i].rate.update(start=start, stop=stop, value=rate)
            scot.brackets[i].threshold.update(
                start=start, stop=stop, value=threshold
            )

        sim.tax_benefit_system.reset_parameter_caches()
        sim.reset_calculations()

    return apply


def _scot_totals(sim, year, is_scot, is_scot_hh):
    """Calculate Scotland-only totals for a simulation."""
    it = float(sim.calculate("income_tax", year)[is_scot].sum())
    earned = float(sim.calculate("earned_income_tax", year)[is_scot].sum())
    hh_inc = float(
        sim.calculate("household_net_income", year)[is_scot_hh].sum()
    )
    return it, earned, hh_inc


def _run_simulation(rate_cut_pp=None):
    """Run a PolicyEngine UK microsimulation, optionally with a reform."""
    from policyengine_uk import Microsimulation

    if rate_cut_pp is not None:
        from policyengine_uk.utils.scenario import Scenario

        return Microsimulation(
            scenario=Scenario(simulation_modifier=make_reform(rate_cut_pp))
        )
    return Microsimulation()


def _extract_decile_data(sim, year, is_scot_hh, hh_weights):
    """Extract per-decile income data for Scottish households."""
    hh_income = sim.calculate("household_net_income", year).values
    deciles = sim.calculate("household_income_decile", year).values
    return hh_income[is_scot_hh], deciles[is_scot_hh], hh_weights[is_scot_hh]


def build_results(year=DEFAULT_YEAR):
    """Run all simulations and return results dict."""
    print("Loading baseline ...")
    baseline = _run_simulation()

    print("Loading phase 1 reform (rUK minus 1p) ...")
    phase1_sim = _run_simulation(rate_cut_pp=1)

    print("Loading phase 2 reform (rUK minus 4p) ...")
    phase2_sim = _run_simulation(rate_cut_pp=4)

    # Scotland masks
    is_scot = (
        baseline.calculate("pays_scottish_income_tax", year)
        .values.astype(bool)
    )
    is_scot_hh = (
        baseline.calculate("pays_scottish_income_tax", year, map_to="household")
        .values.astype(bool)
    )

    # Totals
    b_it, b_earned, b_hh = _scot_totals(baseline, year, is_scot, is_scot_hh)
    p1_it, p1_earned, p1_hh = _scot_totals(
        phase1_sim, year, is_scot, is_scot_hh
    )
    p2_it, p2_earned, p2_hh = _scot_totals(
        phase2_sim, year, is_scot, is_scot_hh
    )

    n_scottish_sample = int(is_scot.sum())

    # Weighted count of Scottish taxpayers (those with positive IT liability)
    # MicroSeries .sum() on boolean gives weighted count
    person_it = baseline.calculate("income_tax", year)
    scot_it = person_it[is_scot]
    n_scottish_weighted = int((scot_it > 0).sum())

    phase1_cost = b_it - p1_it
    phase2_cost = b_it - p2_it
    phase2_additional = phase2_cost - phase1_cost

    # Decile distributions
    hh_weights = baseline.calculate(
        "household_weight", year
    ).values

    b_income, b_deciles, b_weights = _extract_decile_data(
        baseline, year, is_scot_hh, hh_weights
    )
    p1_income, _, _ = _extract_decile_data(
        phase1_sim, year, is_scot_hh, hh_weights
    )
    p2_income, _, _ = _extract_decile_data(
        phase2_sim, year, is_scot_hh, hh_weights
    )

    # Baseline income tax per household (mapped to household level)
    b_hh_it = baseline.calculate(
        "income_tax", year, map_to="household"
    ).values[is_scot_hh]

    baseline_decile_data = build_baseline_deciles(
        b_income, b_hh_it, b_deciles, b_weights
    )

    # rUK baseline deciles for comparison
    is_ruk_hh = ~is_scot_hh
    ruk_hh_income = baseline.calculate(
        "household_net_income", year
    ).values[is_ruk_hh]
    ruk_hh_it = baseline.calculate(
        "income_tax", year, map_to="household"
    ).values[is_ruk_hh]
    ruk_deciles = baseline.calculate(
        "household_income_decile", year
    ).values[is_ruk_hh]
    ruk_weights = hh_weights[is_ruk_hh]
    ruk_baseline_decile_data = build_baseline_deciles(
        ruk_hh_income, ruk_hh_it, ruk_deciles, ruk_weights
    )

    phase1_distribution = build_decile_distribution(
        b_income, p1_income, b_deciles, b_weights
    )
    phase2_distribution = build_decile_distribution(
        b_income, p2_income, b_deciles, b_weights
    )

    phase1_winners_losers = build_winners_losers(
        b_income, p1_income, b_deciles, b_weights
    )
    phase2_winners_losers = build_winners_losers(
        b_income, p2_income, b_deciles, b_weights
    )

    # Phase result dicts
    phase1 = build_scotland_revenue_summary(
        b_it, p1_it, b_earned, p1_earned, b_hh, p1_hh
    )
    phase2 = build_scotland_revenue_summary(
        b_it, p2_it, b_earned, p2_earned, b_hh, p2_hh
    )

    # Reform rate schedules
    phase1_rates = [
        {"band": "Basic", "threshold": 0, "rate": 19},
        {"band": "Higher", "threshold": 37_700, "rate": 39},
        {"band": "Additional", "threshold": 125_140, "rate": 44},
    ]
    phase2_rates = [
        {"band": "Basic", "threshold": 0, "rate": 16},
        {"band": "Higher", "threshold": 37_700, "rate": 36},
        {"band": "Additional", "threshold": 125_140, "rate": 41},
    ]

    rate_comparison = build_rate_comparison_table(
        CURRENT_SCOTTISH_RATES, RUK_RATES, phase1_rates, phase2_rates
    )

    comparison = build_article_comparison(
        phase1_cost, phase2_cost, phase2_additional
    )

    # Per-household impact and % better off (using native MicroSeries)
    b_hh_income_ms = baseline.calculate("household_net_income", year)[is_scot_hh]
    p1_hh_income_ms = phase1_sim.calculate("household_net_income", year)[is_scot_hh]
    p2_hh_income_ms = phase2_sim.calculate("household_net_income", year)[is_scot_hh]

    p1_avg_hh_impact = float((p1_hh_income_ms - b_hh_income_ms).mean())
    p2_avg_hh_impact = float((p2_hh_income_ms - b_hh_income_ms).mean())

    p1_pct_better = float(
        ((p1_hh_income_ms - b_hh_income_ms) > 1).mean() * 100
    )
    p2_pct_better = float(
        ((p2_hh_income_ms - b_hh_income_ms) > 1).mean() * 100
    )

    # PE time series: compute mean/median HH net income and IT for 2020-2030
    # All using native MicroSeries .mean() and .median() (weighted automatically)
    print("Computing PE time series (2020-2030) ...")
    pe_time_series = []
    for ts_year in range(2020, 2031):
        print(f"  Year {ts_year} ...")
        ts_is_scot_hh = (
            baseline.calculate("pays_scottish_income_tax", ts_year, map_to="household")
            .values.astype(bool)
        )

        if ts_is_scot_hh.sum() == 0:
            print(f"    Skipping {ts_year}: no Scottish HH data")
            continue

        ts_equiv = baseline.calculate("equiv_household_net_income", ts_year)[ts_is_scot_hh]
        ts_income = baseline.calculate("household_net_income", ts_year)[ts_is_scot_hh]
        ts_it = baseline.calculate("income_tax", ts_year, map_to="household")[ts_is_scot_hh]
        ts_ni = baseline.calculate("national_insurance", ts_year, map_to="household")[ts_is_scot_hh]
        ts_ct = baseline.calculate("council_tax", ts_year, map_to="household")[ts_is_scot_hh]
        ts_deductions = ts_it + ts_ni + ts_ct

        pe_time_series.append({
            "year": ts_year,
            "mean_equiv_net_income": round(float(ts_equiv.mean()), 0),
            "median_equiv_net_income": round(float(ts_equiv.median()), 0),
            "mean_hh_net_income": round(float(ts_income.mean()), 0),
            "median_hh_net_income": round(float(ts_income.median()), 0),
            "mean_hh_income_tax": round(float(ts_it.mean()), 0),
            "median_hh_income_tax": round(float(ts_it.median()), 0),
            "mean_total_deductions": round(float(ts_deductions.mean()), 0),
            "median_total_deductions": round(float(ts_deductions.median()), 0),
        })

    return {
        "year": year,
        "n_scottish_taxpayers": n_scottish_weighted,
        "n_scottish_sample": n_scottish_sample,
        "current_scottish_rates": CURRENT_SCOTTISH_RATES,
        "ruk_rates": RUK_RATES,
        "phase1": {
            **phase1,
            "reform_rates": phase1_rates,
            "label": "rUK minus 1p",
            "avg_hh_impact": round(p1_avg_hh_impact, 1),
            "pct_better_off": round(p1_pct_better, 1),
        },
        "phase2": {
            **phase2,
            "reform_rates": phase2_rates,
            "label": "rUK minus 4p",
            "avg_hh_impact": round(p2_avg_hh_impact, 1),
            "pct_better_off": round(p2_pct_better, 1),
        },
        "distribution_by_decile": {
            "phase1": phase1_distribution,
            "phase2": phase2_distribution,
        },
        "winners_losers": {
            "phase1": phase1_winners_losers,
            "phase2": phase2_winners_losers,
        },
        "baseline_deciles": baseline_decile_data,
        "ruk_baseline_deciles": ruk_baseline_decile_data,
        "pe_time_series": pe_time_series,
        "rate_comparison": rate_comparison,
        "article_comparison": comparison,
    }


def generate_results_file(year=DEFAULT_YEAR, output_path=None, sync_dashboard=False):
    """Generate results JSON file."""
    results = build_results(year)

    if output_path is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        output_path = DATA_DIR / RESULTS_FILENAME

    with open(output_path, "w") as f:
        json.dump(results, f, indent=2, default=str)

    print(f"Results written to {output_path}")

    if sync_dashboard:
        DASHBOARD_DATA_DIR.mkdir(parents=True, exist_ok=True)
        dashboard_path = DASHBOARD_DATA_DIR / RESULTS_FILENAME
        with open(dashboard_path, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"Dashboard data synced to {dashboard_path}")

    return results
