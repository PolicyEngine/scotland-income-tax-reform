export default function MethodologyTab({ data }) {
  return (
    <div className="space-y-8">
      <div className="section-card">
        <div className="eyebrow text-slate-500">Overview</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          How the model works
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          PolicyEngine UK is a static microsimulation model. It applies the
          current and reformed tax rules to every household in the Enhanced FRS
          microdata and compares the results. Two reform phases are modelled:
          replacing Scotland{"'"}s six income tax bands with the rest-of-UK
          structure and cutting every rate by 1pp (Phase 1) or 4pp (Phase 2).
          All figures are for 2026-27.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="section-card">
          <div className="eyebrow text-slate-500">Included</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            What the model captures
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Scottish earned income tax under the current six-band and reformed
            three-band structures. Rate schedule changes, revenue costs,
            household income changes, and distributional effects by income
            decile.
          </p>
        </div>

        <div className="section-card">
          <div className="eyebrow text-slate-500">Excluded</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            What this analysis omits
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Behavioural responses (migration, labour supply), economic growth
            effects, Laffer dynamics, savings and dividend tax (UK-wide rates,
            unaffected by this reform), and second-round fiscal effects from
            changed spending.
          </p>
        </div>

        <div className="section-card">
          <div className="eyebrow text-slate-500">Sources</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            Data and calibration
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Household microdata from the Enhanced Family Resources Survey
            2023-24 via PolicyEngine UK. Scottish taxpayers identified by
            the <code>pays_scottish_income_tax</code> variable. HMRC Scottish
            income tax statistics used for validation.
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
          the dashboard reads at build time. Source code, data processing, and
          configuration are in the{" "}
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
