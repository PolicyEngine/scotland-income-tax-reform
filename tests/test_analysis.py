import numpy as np

from scotland_income_tax_reform.analysis import (
    build_article_comparison,
    build_decile_distribution,
    build_rate_comparison_table,
    build_scotland_revenue_summary,
    weighted_mean,
    weighted_sum,
)


def test_weighted_sum():
    assert weighted_sum([10, 20], [1, 3]) == 70.0


def test_weighted_mean():
    assert weighted_mean([10, 20], [1, 3]) == 17.5


def test_weighted_mean_zero_weights():
    assert weighted_mean([10, 20], [0, 0]) == 0.0


def test_build_rate_comparison_table():
    current = [
        {"band": "Starter", "threshold": 0, "rate": 19},
        {"band": "Basic", "threshold": 14_876, "rate": 20},
    ]
    ruk = [
        {"band": "Basic", "threshold": 0, "rate": 20},
    ]
    phase1 = [
        {"band": "Basic", "threshold": 0, "rate": 19},
    ]
    phase2 = [
        {"band": "Basic", "threshold": 0, "rate": 16},
    ]

    table = build_rate_comparison_table(current, ruk, phase1, phase2)

    assert len(table) == 2
    # Threshold 0 row
    row0 = table[0]
    assert row0["threshold"] == 0
    assert row0["current_band"] == "Starter"
    assert row0["current_rate"] == 19
    assert row0["ruk_rate"] == 20
    assert row0["phase1_rate"] == 19
    assert row0["phase2_rate"] == 16

    # Threshold 14876 row
    row1 = table[1]
    assert row1["threshold"] == 14_876
    assert row1["current_band"] == "Basic"
    assert row1["current_rate"] == 20
    assert row1["ruk_rate"] is None


def test_build_scotland_revenue_summary():
    summary = build_scotland_revenue_summary(
        baseline_it=20e9,
        reform_it=18e9,
        baseline_earned=15e9,
        reform_earned=13.5e9,
        baseline_hh=200e9,
        reform_hh=202e9,
    )

    assert summary["baseline_it_bn"] == 20.0
    assert summary["reform_it_bn"] == 18.0
    assert summary["it_change_bn"] == -2.0
    assert summary["revenue_cost_bn"] == 2.0
    assert summary["hh_change_bn"] == 2.0


def test_build_decile_distribution():
    baseline = np.array([10000, 20000, 30000, 40000])
    reform = np.array([10500, 20800, 31000, 41500])
    deciles = np.array([1, 1, 2, 2])
    weights = np.array([1, 3, 2, 2])

    result = build_decile_distribution(baseline, reform, deciles, weights)

    assert len(result) == 2

    # Decile 1: weighted avg baseline = (10000*1 + 20000*3)/4 = 17500
    # weighted avg change = (500*1 + 800*3)/4 = 725
    assert result[0]["decile"] == 1
    assert result[0]["avg_baseline_income"] == 17500
    assert result[0]["avg_income_change"] == 725
    assert result[0]["avg_income_change_pct"] == 4.14

    # Decile 2: weighted avg baseline = (30000*2 + 40000*2)/4 = 35000
    # weighted avg change = (1000*2 + 1500*2)/4 = 1250
    assert result[1]["decile"] == 2
    assert result[1]["avg_baseline_income"] == 35000
    assert result[1]["avg_income_change"] == 1250
    assert result[1]["avg_income_change_pct"] == 3.57


def test_build_article_comparison():
    result = build_article_comparison(
        phase1_cost=2.1e9,
        phase2_cost=4.4e9,
        phase2_additional=2.3e9,
    )

    assert result["phase1"]["pe_estimate_bn"] == 2.1
    assert result["phase2_additional"]["pe_estimate_bn"] == 2.3
    assert result["total"]["pe_estimate_bn"] == 4.4
    assert result["growth_per_pp_ifs_bn"] == 0.3
    assert result["growth_needed_phase1_pp"] == 7.0
    assert result["growth_needed_total_pp"] == 15.0
