"use client";

import { useMemo, useState } from "react";
import { colors } from "@policyengine/design-system/tokens/colors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SectionHeading from "./SectionHeading";
import { getPhaseData, getPhaseDistribution } from "../lib/dataHelpers";
import {
  formatBn,
  formatCompactCurrency,
  formatCurrency,
  formatSignedBn,
  formatSignedCurrency,
  formatSignedPct,
} from "../lib/formatters";
import { getNiceTicks, getTickDomain } from "../lib/chartUtils";
import ChartLogo from "./ChartLogo";

const PALETTE = {
  border: colors.border.light,
  grid: colors.border.light,
  text: colors.gray[700],
  muted: colors.gray[500],
  gain: colors.primary[700],
  loss: colors.error,
  neutral: colors.gray[300],
  phase1: colors.primary[600],
  phase2: colors.primary[800],
};

const AXIS_STYLE = {
  fontSize: 12,
  fill: colors.gray[500],
};

const PHASE_OPTIONS = [
  { id: "phase1", label: "Phase 1: Rest of UK minus 1pp", shortLabel: "Phase 1" },
  { id: "phase2", label: "Phase 2: Rest of UK minus 4pp", shortLabel: "Phase 2" },
];

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg">
      {label ? <div className="mb-2 font-semibold text-slate-800">{label}</div> : null}
      {payload.map((entry) => (
        <div className="flex items-center justify-between gap-4" key={entry.name}>
          <span className="flex items-center gap-2 text-slate-600">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-medium text-slate-800">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const BASELINE_COLOR = colors.gray[400];
const REFORM_COLOR = colors.primary[600];

function buildStepData(rateComparison) {
  // Build a series of points for each schedule, suitable for a step line chart.
  // X = income threshold, Y = marginal tax rate.
  // We need to create step transitions: at each threshold, the rate changes.
  const scheduleKeys = ["current_rate", "ruk_rate", "phase1_rate", "phase2_rate"];
  const dataKeys = ["current", "ruk", "phase1", "phase2"];

  // Collect all thresholds + a max point
  const thresholds = rateComparison.map((r) => r.threshold);
  const maxThreshold = Math.max(...thresholds);
  const ceiling = maxThreshold + 50000;

  // For each schedule, track the "last known rate" as we move through thresholds
  const points = [];
  const lastRate = {};

  for (const t of thresholds) {
    const row = rateComparison.find((r) => r.threshold === t);
    const point = { income: t };
    scheduleKeys.forEach((sk, i) => {
      if (row[sk] != null) lastRate[dataKeys[i]] = row[sk];
      point[dataKeys[i]] = lastRate[dataKeys[i]] ?? null;
    });
    points.push(point);
  }

  // Add ceiling point to extend lines to the right
  const endPoint = { income: ceiling };
  dataKeys.forEach((dk) => { endPoint[dk] = lastRate[dk] ?? null; });
  points.push(endPoint);

  return points;
}

function RateScheduleChart({ rateComparison, selectedPhase }) {
  const stepData = useMemo(() => buildStepData(rateComparison), [rateComparison]);
  const reformKey = selectedPhase;
  const reformLabel = selectedPhase === "phase1"
    ? "Phase 1 (rUK minus 1pp)"
    : "Phase 2 (rUK minus 4pp)";

  const formatIncome = (v) =>
    v === 0 ? "£0" : `£${(v / 1000).toFixed(0)}k`;

  return (
    <div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stepData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
            <XAxis
              dataKey="income"
              type="number"
              domain={[0, "dataMax"]}
              ticks={[0, 25000, 50000, 75000, 100000, 125000, 150000, 175000]}
              tick={AXIS_STYLE}
              tickLine={false}
              tickFormatter={formatIncome}
              label={{
                value: "Taxable income",
                position: "insideBottom",
                offset: -12,
                style: AXIS_STYLE,
              }}
            />
            <YAxis
              domain={[0, 52]}
              ticks={[0, 10, 20, 30, 40, 50]}
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              label={{
                value: "Marginal rate",
                angle: -90,
                position: "insideLeft",
                offset: 4,
                style: { ...AXIS_STYLE, textAnchor: "middle" },
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg">
                    <div className="mb-2 font-semibold text-slate-800">
                      Income above {formatIncome(label)}
                    </div>
                    {payload.filter((e) => e.value != null).map((entry) => (
                      <div className="flex items-center justify-between gap-4" key={entry.name}>
                        <span className="flex items-center gap-2 text-slate-600">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.name}
                        </span>
                        <span className="font-medium text-slate-800">{entry.value}%</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: 13 }}
            />
            <Line
              type="stepAfter"
              dataKey="current"
              name="Current Scottish (baseline)"
              stroke={BASELINE_COLOR}
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="stepAfter"
              dataKey={reformKey}
              name={reformLabel}
              stroke={REFORM_COLOR}
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartLogo />
    </div>
  );
}

export default function ReformTab({ data }) {
  const [selectedPhase, setSelectedPhase] = useState("phase1");
  const [impactView, setImpactView] = useState("abs");

  const phaseData = useMemo(() => getPhaseData(data, selectedPhase), [data, selectedPhase]);
  const distribution = useMemo(() => getPhaseDistribution(data, selectedPhase), [data, selectedPhase]);
  const comparison = data.article_comparison;

  const impactDataKey = impactView === "pct" ? "avg_income_change_pct" : "avg_income_change";
  const impactFormatter = impactView === "pct"
    ? (value) => formatSignedPct(value)
    : (value) => formatSignedCurrency(value);
  const impactYFormatter = impactView === "pct"
    ? (value) => `${value}%`
    : (value) => formatCompactCurrency(value);

  const impactTicks = useMemo(() => {
    const values = distribution.map((row) => Number(row[impactDataKey] || 0));
    return getNiceTicks([Math.min(0, ...values), Math.max(0, ...values)]);
  }, [distribution, impactDataKey]);

  return (
    <div className="space-y-8">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Reform UK Scotland income tax proposal
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This section covers the revenue cost, distributional impact and winners
          and losers of each phase for Scottish taxpayers in 2026-27. Phase 1
          replaces Scotland{"'"}s six bands with the rest-of-UK structure and cuts
          every rate by 1pp; Phase 2 cuts by 4pp instead.{" "}
          <a
            href="https://www.belfasttelegraph.co.uk/news/uk/reform-hits-out-at-ifs-analysis-of-scottish-tax-plans/a/144198262.html"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Reform UK
          </a>{" "}
          puts the Phase 1 cost at £{comparison.phase1.article_claim} bn;
          PolicyEngine estimates £{comparison.phase1.pe_estimate_bn} bn.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {PHASE_OPTIONS.map((option) => (
          <button
            key={option.id}
            className={`toggle-button ${selectedPhase === option.id ? "active" : ""}`}
            onClick={() => setSelectedPhase(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Revenue cost
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {formatBn(phaseData.revenue_cost_bn)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Reduction in Scottish income tax revenue in 2026-27.
          </div>
        </div>
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Households better off
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {phaseData.pct_better_off ?? "–"}%
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Share of Scottish households gaining more than £1/year in net income.
          </div>
        </div>
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Average household impact
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {phaseData.avg_hh_impact != null
              ? `+£${Number(phaseData.avg_hh_impact).toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
              : "–"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Average annual gain in net income per Scottish household.
          </div>
        </div>
      </div>

      <div className="section-card">
        <SectionHeading
          title="Rate schedule comparison"
          description="Marginal income tax rates at each income level. Use the dropdowns to compare any two schedules — current Scottish, rest of UK, Phase 1, or Phase 2. The step chart shows where rates jump at each band threshold."
        />
        <RateScheduleChart rateComparison={data.rate_comparison} selectedPhase={selectedPhase} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="section-card">
          <SectionHeading
            title="Distributional impact by decile"
            description={`Average change in household net income under ${PHASE_OPTIONS.find((o) => o.id === selectedPhase)?.shortLabel}. Decile 1 is the poorest tenth; decile 10 is the richest.`}
          />
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              className={`toggle-button ${impactView === "abs" ? "active" : ""}`}
              onClick={() => setImpactView("abs")}
            >
              Absolute (£)
            </button>
            <button
              className={`toggle-button ${impactView === "pct" ? "active" : ""}`}
              onClick={() => setImpactView("pct")}
            >
              % of income
            </button>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
                <XAxis
                  dataKey="decile"
                  tick={AXIS_STYLE}
                  tickLine={false}
                  label={{
                    value: "Income decile",
                    position: "insideBottom",
                    offset: -12,
                    style: AXIS_STYLE,
                  }}
                />
                <YAxis
                  ticks={impactTicks}
                  domain={getTickDomain(impactTicks)}
                  tick={AXIS_STYLE}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={impactYFormatter}
                />
                <ReferenceLine y={0} stroke={colors.gray[400]} strokeWidth={1} />
                <Tooltip
                  content={<CustomTooltip formatter={impactFormatter} />}
                />
                <Bar
                  dataKey={impactDataKey}
                  name="Income change"
                >
                  {distribution.map((row) => (
                    <Cell
                      key={`d${row.decile}`}
                      fill={Number(row[impactDataKey]) >= 0 ? PALETTE.gain : PALETTE.loss}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLogo />
        </div>

        <div className="section-card">
          <SectionHeading
            title="Winners and losers"
            description={`Share of Scottish households better off, unchanged, or worse off under ${PHASE_OPTIONS.find((o) => o.id === selectedPhase)?.shortLabel}. A household counts as better or worse off if its net income changes by more than £1/year.`}
          />
          <div className="h-[320px] w-full mt-[42px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.winners_losers?.[selectedPhase] || []} margin={{ top: 10, right: 12, left: 4, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
                <XAxis
                  dataKey="decile"
                  tick={AXIS_STYLE}
                  tickLine={false}
                  label={{
                    value: "Income decile",
                    position: "insideBottom",
                    offset: -12,
                    style: AXIS_STYLE,
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={AXIS_STYLE}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={<CustomTooltip formatter={(value) => `${value}%`} />}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 13 }} />
                <Bar
                  dataKey="pct_winners"
                  name="Better off"
                  stackId="shares"
                  fill={PALETTE.gain}
                />
                <Bar
                  dataKey="pct_unchanged"
                  name="No change"
                  stackId="shares"
                  fill={PALETTE.neutral}
                />
                <Bar
                  dataKey="pct_losers"
                  name="Worse off"
                  stackId="shares"
                  fill={PALETTE.loss}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <ChartLogo />
        </div>
      </div>

    </div>
  );
}
