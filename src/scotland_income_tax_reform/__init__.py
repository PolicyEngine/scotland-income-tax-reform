from pathlib import Path

DEFAULT_YEAR = 2026

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
DASHBOARD_DATA_DIR = ROOT_DIR / "dashboard" / "public" / "data"

RESULTS_FILENAME = "reform_results.json"

from scotland_income_tax_reform.pipeline import build_results, generate_results_file  # noqa: E402, F401
