import { ConditionOperator } from '../api/groups.api';

/** Operator labels shared by the condition builder and any place that renders a stored
 * condition back to the user (e.g. the Groups results page header) — without this map,
 * relative-date operators like `thisYear` would render as raw camelCase keys. */
export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'equals',
  contains: 'contains',
  in: 'is one of',
  between: 'between',
  greaterThan: 'after',
  lessThan: 'before',
  inLastDays: 'in the last (days)',
  thisMonth: 'this month',
  thisYear: 'this year',
};
