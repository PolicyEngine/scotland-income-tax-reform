# Scotland Income Tax Change Dashboard

**Live dashboard:** [scotland-income-tax-reform.vercel.app](https://scotland-income-tax-reform.vercel.app)

Data pipeline and interactive dashboard estimating the fiscal and distributional effects of Reform UK Scotland's income tax proposal using [PolicyEngine UK](https://github.com/PolicyEngine/policyengine-uk).

Reform UK Scotland [proposes](https://ifs.org.uk/articles/analysis-reform-uk-proposal-income-tax-cuts-scotland) aligning Scottish income tax with rest-of-UK rates, then cutting by a further 1p (Phase 1) or 4p (Phase 2) in the pound. This dashboard uses PolicyEngine to estimate the static revenue cost, distributional impact, and winners and losers using the Enhanced FRS microdata.

## Key findings

- **Phase 1** (align with rUK, cut 1p): ~£2.1 bn static revenue cost, ~72% of Scottish households better off
- **Phase 2** (align with rUK, cut 4p): ~£4.4 bn total static revenue cost, ~78% of Scottish households better off
- Self-funding via growth would require ~7–15pp GDP growth — implausible per [IFS analysis](https://ifs.org.uk/articles/analysis-reform-uk-proposal-income-tax-cuts-scotland)

## Data sources

| Source | Description |
|--------|-------------|
| Enhanced FRS 2023-24 | Household microdata via PolicyEngine UK |
| HMRC Scottish IT statistics | External validation of Scottish taxpayer counts and revenue |
| DWP Stat-Xplore (HBAI) | Official household income data for Scotland |

## Project structure

```
├── src/scotland_income_tax_reform/   # Python pipeline
│   ├── analysis.py                   # Pure analysis functions
│   ├── pipeline.py                   # PolicyEngine simulation + results builder
│   └── cli.py                        # CLI entry point
├── tests/                            # Unit tests for analysis functions
├── data/                             # Generated results JSON
├── dashboard/                        # Next.js interactive dashboard
│   ├── app/                          # App router pages
│   └── src/components/               # React components
└── pyproject.toml
```

## Running locally

### Simulation pipeline

```bash
pip install -e '.[simulation,dev]'
pytest -q                                        # run tests
scotland-it-reform-build --sync-dashboard        # generate results
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev     # development server at localhost:3000
npm run build   # production build
```

## Deployment

The dashboard auto-deploys to Vercel on push to `main`. Vercel is configured with root directory set to `dashboard/`. No backend required — the dashboard is a static Next.js site that reads pre-generated `reform_results.json` at build time.
