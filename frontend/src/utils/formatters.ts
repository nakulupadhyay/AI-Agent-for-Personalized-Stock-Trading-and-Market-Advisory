/**
 * Format a number as currency (INR or USD)
 */
export function formatCurrency(
  value: number,
  currency: 'INR' | 'USD' = 'INR',
  compact = false
): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    const v = value / 1_000_000;
    const prefix = currency === 'INR' ? '₹' : '$';
    return `${prefix}${v.toFixed(2)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    const v = value / 1_000;
    const prefix = currency === 'INR' ? '₹' : '$';
    return `${prefix}${v.toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a decimal (0–1) as a percentage string, e.g. 0.87 → "87%"
 */
export function formatPercent(value: number, decimals = 1): string {
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format a large number with commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a timestamp to a short time string
 */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Return a + or - prefixed string for change values
 */
export function formatChange(value: number, prefix = ''): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${prefix}${value.toFixed(2)}`;
}

/**
 * Clamp a confidence value between 0 and 1
 */
export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}
