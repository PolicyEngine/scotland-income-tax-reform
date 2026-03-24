export function getPhaseData(data, phase) {
  if (phase === "phase1") return data.phase1;
  if (phase === "phase2") return data.phase2;
  return data.phase1;
}

export function getPhaseDistribution(data, phase) {
  return data.distribution_by_decile?.[phase] || [];
}

export function formatRateBand(threshold, rate) {
  const thresholdStr = threshold === 0
    ? "\u00A30"
    : `\u00A3${Number(threshold).toLocaleString("en-GB")}`;
  return `${thresholdStr}+ at ${rate}%`;
}
