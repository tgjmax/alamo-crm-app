import { WidgetAggregation } from '../api/widgets.api';
import { DirectoryUser } from '../api/users.api';

/** The literal the aggregation's `$ifNull` emits for a row whose dimension value is missing. */
export const UNSPECIFIED_KEY = '(none)';

const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_KEY = /^(\d{4})-(\d{2})$/;

const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COUNT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const CURRENCY_COMPACT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const COUNT_COMPACT = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * Both aggregatable fields are money — `amount` (ticket price) and `paymentAmount` (outstanding
 * balance) — so the rule is simply: a count is a count, everything else is USD. If a non-money
 * aggregatable field is ever added, THIS is the one function that must learn about it.
 */
export function formatWidgetValue(value: number, aggregation: WidgetAggregation): string {
  return aggregation.fn === 'count' ? COUNT.format(value) : CURRENCY.format(value);
}

/**
 * Axis ticks must stay narrow — full precision lives in the tooltip, not on the axis. A real
 * `sum:amount` tick like `$124,500.50` (~70-75px at the axis's `fontSize: 12`) is wider than the
 * `YAxis`'s reserved 64px and gets clipped by the SVG viewport; `notation: 'compact'` keeps every
 * tick short (`$124.5K`) regardless of magnitude. Use this ONLY for the `YAxis` tickFormatter —
 * the tooltip, the `sr-only` list, the table and the scalar number must all keep using
 * `formatWidgetValue` for full precision. `minimumFractionDigits: 0` so a round value renders as
 * `$0`/`$1K`, not `$0.0`/`$1.0K` — but a real `0` still renders as `$0`/`0`, never blank.
 */
export function formatAxisValue(value: number, aggregation: WidgetAggregation): string {
  return aggregation.fn === 'count' ? COUNT_COMPACT.format(value) : CURRENCY_COMPACT.format(value);
}

/**
 * Turns a raw aggregation key into display text. `keyLabel` is the caller's id -> name mapper
 * (the dashboard supplies one for the `createdBy` dimension); the raw key is still what React
 * and Recharts key on, because two agents can share a display name but never an id.
 */
export function formatWidgetKey(
  key: string,
  groupBy?: string,
  keyLabel?: (key: string) => string
): string {
  if (key === UNSPECIFIED_KEY) return 'Unspecified';

  if (groupBy === 'month') {
    const match = MONTH_KEY.exec(key);
    if (match) {
      const abbreviation = MONTH_ABBREVIATIONS[Number(match[2]) - 1];
      if (abbreviation) return `${abbreviation} ${match[1]}`;
    }
  }

  return keyLabel ? keyLabel(key) : key;
}

/**
 * The single mapper both `DashboardPage` and `WidgetEditorPage` must use to build the `keyLabel`
 * they pass to `WidgetView` — a widget cannot read "Priya Nair" on one screen and a raw Mongo
 * ObjectId (`66a1f0c3e4b09a…`) on the other. `createdBy` is the only dimension whose raw key is
 * an opaque id; every other dimension's key is already human-readable, so this is an identity
 * function unless `groupBy === 'createdBy'`. An id with no match in the directory (e.g. a
 * deactivated user) passes through unchanged rather than rendering blank.
 */
export function buildKeyLabel(
  groupBy: string | undefined,
  directory: DirectoryUser[]
): (key: string) => string {
  if (groupBy !== 'createdBy') return (key) => key;
  const nameById = new Map(directory.map((u) => [u.id, u.name]));
  return (key) => nameById.get(key) ?? key;
}
