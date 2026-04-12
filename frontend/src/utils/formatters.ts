/**
 * Format a number as currency (INR or USD)
 */
export function formatCurrency(
  value: number,
  currency: 'INR' | 'USD' = 'INR',
  compact = false
): string {
  const numValue = Number(value) || 0;
  if (compact && Math.abs(numValue) >= 1_000_000) {
    const v = numValue / 1_000_000;
    const prefix = currency === 'INR' ? '₹' : '$';
    return `${prefix}${v.toFixed(2)}M`;
  }
  if (compact && Math.abs(numValue) >= 1_000) {
    const v = numValue / 1_000;
    const prefix = currency === 'INR' ? '₹' : '$';
    return `${prefix}${v.toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format a decimal (0–1) as a percentage string, e.g. 0.87 → "87%"
 */
export function formatPercent(value: number, decimals = 1): string {
  const numValue = Number(value) || 0;
  const pct = numValue > 1 ? numValue : numValue * 100;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format a large number with commas
 */
export function formatNumber(value: number): string {
  const numValue = Number(value) || 0;
  return new Intl.NumberFormat('en-IN').format(numValue);
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
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
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Return a + or - prefixed string for change values
 */
export function formatChange(value: number, prefix = ''): string {
  const numValue = Number(value) || 0;
  const sign = numValue >= 0 ? '+' : '';
  return `${sign}${prefix}${numValue.toFixed(2)}`;
}

/**
 * Clamp a confidence value between 0 and 1
 */
export function clampConfidence(value: number): number {
  const numValue = Number(value) || 0;
  return Math.max(0, Math.min(1, numValue));
}
