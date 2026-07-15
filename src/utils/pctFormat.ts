export function formatPct(pct: number | null): string {
  if (pct === null) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
}

/** Red for a decrease, green for an increase; no color for null/zero (nothing to compare, or unchanged). */
export function pctColorClass(pct: number | null): string {
  if (pct === null || pct === 0) return '';
  return pct > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
}
