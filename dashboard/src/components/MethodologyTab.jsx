export default function MethodologyTab({ data }) {
  return (
    <div className="space-y-8">
      <div className="section-card">
        <div className="eyebrow text-slate-500">Overview</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          How the model works
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          This dashboard uses PolicyEngine UK, a static microsimulation model,
          to estimate the first-round fiscal and distributional effects of
          Reform UK Scotland&apos;s income tax proposal. It models two phases:
          aligning Scottish rates with rest of UK then cutting by 1p (Phase 1) or 4p
          (Phase 2) in the pound. All figures are for the 2026-27 fiscal year.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="section-card">
          <div className="eyebrow text-slate-500">Included</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            What the model captures
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Scottish earned income tax under the current six-band structure and
            under the reformed three-band structure. Rate schedule changes,
            revenue costs, household income changes, and distributional effects
            by income decile for Scottish taxpayers.
          </p>
        </div>

        <div className="section-card">
          <div className="eyebrow text-slate-500">Excluded</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            What the model omits
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Behavioural responses (migration, labour supply changes), economic
            growth effects, Laffer dynamics, savings and dividend income tax
            (which uses UK-wide rates and is unaffected by this reform), and
            any second-round fiscal effects from changed spending patterns.
          </p>
        </div>

        <div className="section-card">
          <div className="eyebrow text-slate-500">Sources</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            Data and calibration
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Household microdata comes from the Enhanced Family Resources Survey
            2023-24 via PolicyEngine UK. Scottish taxpayer identification uses
            the <code>pays_scottish_income_tax</code> variable. HMRC Scottish
            income tax statistics provide external validation targets.
          </p>
        </div>
      </div>

      <div className="section-card">
        <div className="eyebrow text-slate-500">Replication</div>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">
          Code and data pipeline
        </h3>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          A Python pipeline generates <code>reform_results.json</code>, which
          the dashboard consumes at build time. All source code, data
          processing scripts, and configuration are available in the{" "}
          <a
            href="https://github.com/PolicyEngine/scotland-income-tax-reform"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            public repository
          </a>.
        </p>
      </div>
    </div>
  );
}
