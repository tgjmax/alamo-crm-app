import { ChartType, WidgetPeriod } from '@/api/widgets.api';

/**
 * Starter widgets offered on "New widget". Each is expressed in the API's own aggregation
 * vocabulary (fn/field/groupBy/period/…); the editor converts `fn`+`field` to its internal metric
 * string when seeding. Every template has ZERO conditions — only possible because of the
 * conditions-free-widget change. Picking one lands in the normal editor, fully editable.
 */
export interface WidgetTemplate {
  id: string;
  label: string;
  description: string;
  name: string;
  fn: 'count' | 'sum' | 'avg';
  field?: 'amount' | 'paymentAmount';
  groupBy?: string;
  display?: 'table' | 'chart';
  chartType?: ChartType;
  period: WidgetPeriod;
}

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'revenue-this-month',
    label: 'Revenue this month',
    description: 'A running total of this month’s revenue, with a trend vs last month.',
    name: 'Revenue this month',
    fn: 'sum',
    field: 'amount',
    period: 'thisMonth',
  },
  {
    id: 'bookings-by-airline',
    label: 'Bookings by airline',
    description: 'This month’s bookings broken down by carrier, as a bar chart.',
    name: 'Bookings by airline',
    fn: 'count',
    groupBy: 'airlineCode',
    display: 'chart',
    chartType: 'bar',
    period: 'thisMonth',
  },
  {
    id: 'outstanding-balance',
    label: 'Outstanding balance',
    description: 'All money still owed across the ledger, all-time.',
    name: 'Outstanding balance',
    fn: 'sum',
    field: 'paymentAmount',
    period: 'all',
  },
  {
    id: 'revenue-by-month',
    label: 'Revenue by month',
    description: 'The last 12 months of revenue as a line chart.',
    name: 'Revenue by month',
    fn: 'sum',
    field: 'amount',
    groupBy: 'month',
    display: 'chart',
    chartType: 'line',
    period: 'last12Months',
  },
  {
    id: 'bookings-by-agent',
    label: 'Bookings by agent',
    description: 'This month’s bookings by the agent who entered them.',
    name: 'Bookings by agent',
    fn: 'count',
    groupBy: 'createdBy',
    display: 'chart',
    chartType: 'bar',
    period: 'thisMonth',
  },
];

export function widgetTemplateById(id: string | undefined): WidgetTemplate | undefined {
  return id === undefined ? undefined : WIDGET_TEMPLATES.find((t) => t.id === id);
}
