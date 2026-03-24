"use client";

import { useMemo, useState } from "react";
import { colors } from "@policyengine/design-system/tokens/colors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SectionHeading from "./SectionHeading";
import ChartLogo from "./ChartLogo";
import { formatCurrency, formatCompactCurrency } from "../lib/formatters";

const PALETTE = {
  border: colors.border.light,
  grid: colors.border.light,
  text: colors.gray[700],
  muted: colors.gray[500],
  bar: colors.primary[600],
  barLight: colors.primary[400],
};

const AXIS_STYLE = {
  fontSize: 12,
  fill: colors.gray[500],
};

// HBAI official data: Scotland, equivalised HH net income (weekly, real 2023-24 prices)
// Source: DWP Stat-Xplore, HBAI dataset, BHC measure
const OFFICIAL_HH_INCOME = [
  { year: "2021-22", mean_weekly: 742, median_weekly: 618 },
  { year: "2022-23", mean_weekly: 792, median_weekly: 649 },
  { year: "2023-24", mean_weekly: 741, median_weekly: 665 },
];

// FRS official data: Scotland, gross HH income (weekly, real terms)
// Source: DWP Stat-Xplore, FRSHH dataset
const OFFICIAL_GROSS_INCOME = [
  { year: "2021-22", mean_weekly: 912, median_weekly: 702 },
  { year: "2022-23", mean_weekly: 1020, median_weekly: 717 },
  { year: "2023-24", mean_weekly: 974, median_weekly: 749 },
];

function CustomTooltip({ active, payload, label, prefix = "£" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg">
      {label ? <div className="mb-2 font-semibold text-slate-800">{label}</div> : null}
      {payload.filter((e) => e.value != null).map((entry) => (
        <div className="flex items-center justify-between gap-4" key={entry.name}>
          <span className="flex items-center gap-2 text-slate-600">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.stroke }}
            />
            {entry.name}
          </span>
          <span className="font-medium text-slate-800">
            {prefix}{Number(entry.value).toLocaleString("en-GB")}
          </span>
        </div>
      ))}
    </div>
  );
}

function yearLabel(y) {
  return `${y}-${(y + 1).toString().slice(2)}`;
}

// CPI deflators for nominal -> real conversion (2023-24 = 1.00)
// Based on OBR inflation forecasts
const CPI_DEFLATORS = {
  2023: 1.00, 2024: 1.03, 2025: 1.05, 2026: 1.07,
  2027: 1.09, 2028: 1.11, 2029: 1.13, 2030: 1.16,
};

const MEASURE_OPTIONS = [
  { value: "income", label: "Household net income" },
  { value: "tax", label: "Household tax burden" },
];

function LivingStandardsChart({ peTimeSeries }) {
  const [measure, setMeasure] = useState("income");
  const [statType, setStatType] = useState("mean");
  const [adjustment, setAdjustment] = useState("nominal");
  const [viewMode, setViewMode] = useState("both");

  const chartData = useMemo(() => {
    const byYear = {};

    if (measure === "income") {
      // Official HBAI (real 2023-24 prices, weekly -> annual)
      for (const d of OFFICIAL_HH_INCOME) {
        const meanAnnual = Math.round(d.mean_weekly * 52);
        const medianAnnual = Math.round(d.median_weekly * 52);
        byYear[d.year] = {
          year: d.year,
          official: statType === "mean" ? meanAnnual : medianAnnual,
          forecast: null,
        };
      }
      // PE projections
      for (const d of peTimeSeries) {
        const label = yearLabel(d.year);
        let val = statType === "mean" ? d.mean_equiv_net_income : d.median_equiv_net_income;
        if (adjustment === "real" && CPI_DEFLATORS[d.year]) {
          val = Math.round(val / CPI_DEFLATORS[d.year]);
        }
        if (byYear[label]) {
          byYear[label].forecast = val;
        } else {
          byYear[label] = { year: label, official: null, forecast: val };
        }
      }
    } else {
      // Tax: official implied burden (gross - net)
      for (const gross of OFFICIAL_GROSS_INCOME) {
        const net = OFFICIAL_HH_INCOME.find((n) => n.year === gross.year);
        if (!net) continue;
        const meanBurden = Math.round((gross.mean_weekly - net.mean_weekly) * 52);
        const medianBurden = Math.round((gross.median_weekly - net.median_weekly) * 52);
        byYear[gross.year] = {
          year: gross.year,
          official: statType === "mean" ? meanBurden : medianBurden,
          forecast: null,
        };
      }
      // PE: IT + NI + CT
      for (const d of peTimeSeries) {
        const label = yearLabel(d.year);
        let val = statType === "mean" ? d.mean_total_deductions : d.median_total_deductions;
        if (adjustment === "real" && CPI_DEFLATORS[d.year]) {
          val = Math.round(val / CPI_DEFLATORS[d.year]);
        }
        if (byYear[label]) {
          byYear[label].forecast = val;
        } else {
          byYear[label] = { year: label, official: null, forecast: val };
        }
      }
    }

    return Object.values(byYear).sort((a, b) => a.year.localeCompare(b.year));
  }, [peTimeSeries, measure, statType, adjustment]);

  // Summary text
  const summary = useMemo(() => {
    const forecasts = chartData.filter((d) => d.forecast != null);
    if (forecasts.length < 2) return null;
    const first = forecasts[0];
    const last = forecasts[forecasts.length - 1];
    const pctChange = ((last.forecast - first.forecast) / first.forecast * 100).toFixed(0);
    const label = statType === "mean" ? "Mean" : "Median";
    const what = measure === "income" ? "household income" : "household tax burden";
    const suffix = adjustment === "real" ? " (in 2023-24 prices)" : "";
    return `${label} ${what} is forecast to ${Number(pctChange) >= 0 ? "increase" : "decrease"} by ${Math.abs(pctChange)}% from £${(first.forecast / 1000).toFixed(0)}k to £${(last.forecast / 1000).toFixed(0)}k by ${last.year}${suffix}.`;
  }, [chartData, statType, measure, adjustment]);

  const showOfficial = viewMode === "both" || viewMode === "outturn";
  const showForecast = viewMode === "both" || viewMode === "forecast";

  const title = measure === "income" ? "Living standards" : "Tax burden";
  const baseDescription = measure === "income"
    ? `Solid lines show official data (DWP HBAI via Stat-Xplore, equivalised, Scotland); dashed lines show PolicyEngine projections.`
    : `Solid lines show official data (DWP FRS & HBAI via Stat-Xplore, Scotland); dashed lines show PolicyEngine projections (IT + NI + council tax).`;

  return (
    <div className="section-card">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {summary && <>{summary}{" "}</>}
          {baseDescription}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={`${measure}-${statType}`}
          onChange={(e) => {
            const [m, s] = e.target.value.split("-");
            setMeasure(m);
            setStatType(s);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          {MEASURE_OPTIONS.flatMap((m) =>
            ["mean", "median"].map((s) => (
              <option key={`${m.value}-${s}`} value={`${m.value}-${s}`}>
                {s === "mean" ? "Mean" : "Median"} {m.label.toLowerCase()}
              </option>
            ))
          )}
        </select>

        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          {["nominal", "real"].map((v) => (
            <button
              key={v}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                adjustment === v
                  ? "bg-slate-700 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              } ${v !== "real" ? "border-r border-slate-200" : ""}`}
              onClick={() => setAdjustment(v)}
            >
              {v === "nominal" ? "Nominal" : "Real"}
            </button>
          ))}
        </div>

        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          {[
            { value: "outturn", label: "Outturn" },
            { value: "both", label: "Both" },
            { value: "forecast", label: "Forecast" },
          ].map((v, i) => (
            <button
              key={v.value}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === v.value
                  ? "bg-slate-700 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              } ${i < 2 ? "border-r border-slate-200" : ""}`}
              onClick={() => setViewMode(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
            <XAxis
              dataKey="year"
              tick={AXIS_STYLE}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={55}
            />
            <YAxis
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
              domain={[0, "auto"]}
              label={{
                value: measure === "income"
                  ? `Household income${adjustment === "real" ? " (2023-24 prices)" : ""}`
                  : `Tax burden${adjustment === "real" ? " (2023-24 prices)" : ""}`,
                angle: -90,
                position: "insideLeft",
                offset: 4,
                style: { ...AXIS_STYLE, textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showOfficial && (
              <Line
                type="monotone"
                dataKey="official"
                name="Official (historical)"
                stroke="#9CA3AF"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#9CA3AF", stroke: "white", strokeWidth: 2 }}
                connectNulls={false}
              />
            )}
            {showForecast && (
              <Line
                type="monotone"
                dataKey="forecast"
                name="PolicyEngine (projection)"
                stroke={colors.primary[600]}
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={{ r: 5, fill: colors.primary[600], stroke: "white", strokeWidth: 2 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartLogo />
    </div>
  );
}

function RateBand({ band, threshold, rate, maxRate = 48, color }) {
  const barWidth = (rate / maxRate) * 100;
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-24 shrink-0 text-sm font-medium text-slate-700">{band}</div>
      <div className="w-20 shrink-0 text-xs text-slate-500 tabular-nums">
        {formatCurrency(threshold)}
      </div>
      <div className="flex flex-1 items-center gap-2">
        <div
          className="h-6 rounded-r-md transition-all"
          style={{ width: `${barWidth}%`, backgroundColor: color, minWidth: 4 }}
        />
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {rate}%
        </span>
      </div>
    </div>
  );
}

const SCOT_COLOR = colors.primary[700];
const RUK_COLOR = colors.gray[300];

export default function ScottishBaselineTab({ data }) {
  const baselineDeciles = data.baseline_deciles || [];
  const rukDeciles = data.ruk_baseline_deciles || [];
  const peTimeSeries = data.pe_time_series || [];

  // Merge Scotland & rUK decile data for grouped bar chart
  const mergedDeciles = useMemo(() => {
    return baselineDeciles.map((s) => {
      const r = rukDeciles.find((d) => d.decile === s.decile);
      return {
        decile: s.decile,
        scotland: s.avg_hh_income_tax,
        ruk: r ? r.avg_hh_income_tax : 0,
        scot_income: s.avg_hh_net_income,
        ruk_income: r ? r.avg_hh_net_income : 0,
      };
    });
  }, [baselineDeciles, rukDeciles]);

  const earnedIT = data.phase1?.baseline_earned_bn ?? data.phase1?.baseline_it_bn;

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Scottish income tax baseline"
        description="An overview of Scotland's current income tax system before any reform. This section covers the rate structure, taxpayer numbers, revenue, and how the tax burden compares with the rest of UK across the income distribution."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Scottish taxpayers
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {(data.n_scottish_taxpayers / 1e6).toFixed(1)}m
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Estimated number of individuals with a positive income tax liability under Scottish rates in 2026-27 (PolicyEngine).
          </div>
        </div>
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Baseline Scottish earned IT
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            £{Number(earnedIT).toFixed(1)} bn
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Total earned income tax collected from Scottish taxpayers in 2026-27, excluding savings and dividend tax (PolicyEngine).
          </div>
        </div>
      </div>

      {/* Rate structures — visual comparison */}
      <div className="section-card">
        <SectionHeading
          title="Rate structures (2026-27)"
          description={<>Scotland has six income tax bands with rates from 19% to 48%, while the rest of UK has three bands from 20% to 45%. The higher Scottish rates — particularly the 42% higher, 45% advanced, and 48% top bands — are the gap <a href="https://ifs.org.uk/articles/analysis-reform-uk-proposal-income-tax-cuts-scotland" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">Reform UK Scotland proposes</a> to close.</>}
        />
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>System</th>
                <th>Band</th>
                <th>Threshold</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.current_scottish_rates.map((row, i) => (
                <tr key={`scot-${row.band}`}>
                  {i === 0 && (
                    <td rowSpan={data.current_scottish_rates.length} className="font-semibold text-slate-700 align-top">
                      Scotland
                    </td>
                  )}
                  <td className="font-medium">{row.band}</td>
                  <td>{formatCurrency(row.threshold)}</td>
                  <td>{row.rate}%</td>
                </tr>
              ))}
              {data.ruk_rates.map((row, i) => (
                <tr key={`ruk-${row.band}`}>
                  {i === 0 && (
                    <td rowSpan={data.ruk_rates.length} className="font-semibold text-slate-700 align-top">
                      Rest of UK
                    </td>
                  )}
                  <td className="font-medium">{row.band}</td>
                  <td>{formatCurrency(row.threshold)}</td>
                  <td>{row.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Income tax per household decile — Scotland vs rUK */}
        <div className="section-card">
          <SectionHeading
            title="Average income tax by household income decile"
            description="Average household income tax in Scotland versus the rest of UK by UK-wide income decile (2026-27). Scottish households in the upper deciles pay more due to higher Scottish rates."
          />
          <div className="mb-3 flex items-center gap-5 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: SCOT_COLOR }} />
              Scotland
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: RUK_COLOR }} />
              Rest of UK
            </span>
          </div>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mergedDeciles} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
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
                  tick={AXIS_STYLE}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = mergedDeciles.find((r) => r.decile === label);
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg">
                        <div className="mb-2 font-semibold text-slate-800">Decile {label}</div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SCOT_COLOR }} />
                            Scotland IT
                          </span>
                          <span className="font-medium text-slate-800">{formatCurrency(row?.scotland)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: RUK_COLOR }} />
                            Rest of UK IT
                          </span>
                          <span className="font-medium text-slate-800">{formatCurrency(row?.ruk)}</span>
                        </div>
                        {row && (
                          <div className="mt-1 border-t border-slate-100 pt-1 text-xs text-slate-400">
                            Avg net income: Scotland {formatCurrency(row.scot_income)} · rUK {formatCurrency(row.ruk_income)}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="scotland"
                  name="Scotland"
                  fill={SCOT_COLOR}
                />
                <Bar
                  dataKey="ruk"
                  name="Rest of UK"
                  fill={RUK_COLOR}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLogo />
        </div>

        {/* Living standards time series */}
        <LivingStandardsChart peTimeSeries={peTimeSeries} />
      </div>

    </div>
  );
}
