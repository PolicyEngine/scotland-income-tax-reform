"""CLI entry point for building reform results."""

import argparse

from scotland_income_tax_reform import DEFAULT_YEAR
from scotland_income_tax_reform.pipeline import generate_results_file


def main():
    parser = argparse.ArgumentParser(
        description="Build Reform UK Scotland income tax reform results."
    )
    parser.add_argument(
        "--year",
        type=int,
        default=DEFAULT_YEAR,
        help=f"Tax year to simulate (default: {DEFAULT_YEAR})",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output path for results JSON",
    )
    parser.add_argument(
        "--sync-dashboard",
        action="store_true",
        help="Also copy results to dashboard/public/data/",
    )

    args = parser.parse_args()
    generate_results_file(
        year=args.year,
        output_path=args.output,
        sync_dashboard=args.sync_dashboard,
    )


if __name__ == "__main__":
    main()
