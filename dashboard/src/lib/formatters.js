function getSignedPrefix(value) {
  const amount = Number(value);
  if (amount > 0) {
    return "+";
  }
  if (amount < 0) {
    return "\u2212";
  }
  return "";
}

export function formatCurrency(value) {
  return `\u00A3${Math.round(Number(value)).toLocaleString("en-GB")}`;
}

export function formatSignedCurrency(value) {
  const amount = Math.round(Number(value));
  return `${getSignedPrefix(amount)}\u00A3${Math.abs(amount).toLocaleString("en-GB")}`;
}

export function formatBn(value) {
  return `\u00A3${Number(value).toFixed(1)}bn`;
}

export function formatSignedBn(value) {
  const amount = Number(value);
  return `${getSignedPrefix(amount)}\u00A3${Math.abs(amount).toFixed(1)}bn`;
}

export function formatPct(value, digits = 1) {
  return `${Number(value).toFixed(digits)}%`;
}

export function formatSignedPct(value, digits = 1) {
  return `${getSignedPrefix(value)}${formatPct(Math.abs(Number(value)), digits)}`;
}

export function formatPercentagePointChange(value, digits = 2) {
  return `${getSignedPrefix(value)}${Math.abs(Number(value)).toFixed(digits)}pp`;
}

export function formatTn(value) {
  return `\u00A3${Number(value).toFixed(1)}tn`;
}

export function formatCompactCurrency(value) {
  const formatter = new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return `\u00A3${formatter.format(Number(value))}`;
}
