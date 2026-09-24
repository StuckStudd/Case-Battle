const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number): string {
  return moneyFormatter.format(Number.isFinite(value) ? value : 0);
}

/** Short money for axis labels: $950, $16K, $1.5M, $2B. */
export function formatCompactMoney(value: number): string {
  const abs = Math.abs(value);
  const [div, suffix] = abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : abs >= 1e3 ? [1e3, 'K'] : [1, ''];
  const n = value / div;
  const digits = suffix === '' ? (abs < 10 ? 2 : 0) : Math.abs(n) < 10 ? 1 : 0;
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(digits).replace(/\.0+$/, '')}${suffix}`;
}

export function formatSignedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatMoney(Math.abs(value))}`;
}

export function formatPercent(value: number, digits = 2): string {
  return `${(Number.isFinite(value) ? value : 0).toFixed(digits)}%`;
}

export function formatMultiplier(value: number): string {
  return `x${value >= 100 ? value.toFixed(0) : value.toFixed(2)}`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
