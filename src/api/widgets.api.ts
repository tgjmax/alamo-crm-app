import { apiClient } from './client';
import { GroupCondition } from './groups.api';

export type WidgetVizType = 'number' | 'table' | 'chart';
export type ChartType = 'bar' | 'line' | 'pie';

export const WIDGET_PERIODS = ['all', 'thisMonth', 'lastMonth', 'thisYear', 'last30Days', 'last12Months'] as const;
export type WidgetPeriod = (typeof WIDGET_PERIODS)[number];

/** What the user picks in the editor. */
export const WIDGET_PERIOD_LABELS: Record<WidgetPeriod, string> = {
  all: 'All time',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  thisYear: 'This year',
  last30Days: 'Last 30 days',
  last12Months: 'Last 12 months',
};

/**
 * What the delta is measured AGAINST. Never let the card just say "vs previous" — the user cannot
 * otherwise tell whether a 12% rise is against last month or last year.
 */
export const WIDGET_COMPARISON_LABELS: Record<WidgetPeriod, string> = {
  all: '',
  thisMonth: 'vs last month',
  lastMonth: 'vs the month before',
  thisYear: 'vs last year',
  last30Days: 'vs the previous 30 days',
  last12Months: 'vs the previous 12 months',
};

export interface WidgetAggregation {
  fn: 'count' | 'sum' | 'avg';
  field?: 'amount' | 'paymentAmount';
  groupBy?: string;
}

export interface WidgetSharing {
  mode: 'private' | 'shared';
  users: string[];
}

export interface WidgetSummary {
  id: string;
  name: string;
  owner: { id: string; name: string };
  sharedWith: WidgetSharing;
  vizType: WidgetVizType;
  aggregation: WidgetAggregation;
  chartType?: ChartType;
  period: WidgetPeriod;
  updatedAt: string;
}

export interface WidgetDetail {
  id: string;
  name: string;
  sharedWith: WidgetSharing;
  conditions?: GroupCondition[];
  vizType: WidgetVizType;
  aggregation: WidgetAggregation;
  chartType?: ChartType;
  period: WidgetPeriod;
}

export type WidgetData =
  | {
      kind: 'scalar';
      value: number;
      previousValue?: number;
      changePct?: number | null;
      series?: { key: string; value: number }[];
    }
  | { kind: 'breakdown'; rows: { key: string; value: number }[] };

export interface GroupByDimension {
  key: string;
  label: string;
}

export interface LayoutEntry {
  widget: string;
  order: number;
  size: 'small' | 'large';
}

export interface WidgetInput {
  name: string;
  conditions: GroupCondition[];
  vizType: WidgetVizType;
  aggregation: WidgetAggregation;
  chartType?: ChartType;
  period: WidgetPeriod;
  sharedWith?: { mode: 'private' | 'shared'; users?: string[] };
}

export interface WidgetPreviewInput {
  conditions: GroupCondition[];
  vizType: WidgetVizType;
  aggregation: WidgetAggregation;
  chartType?: ChartType;
  period: WidgetPeriod;
}

export async function getDimensions(): Promise<GroupByDimension[]> {
  const res = await apiClient.get<{ dimensions: GroupByDimension[] }>('/widgets/dimensions');
  return res.data.dimensions;
}

export async function listWidgets(): Promise<{ widgets: WidgetSummary[]; layout: LayoutEntry[] }> {
  const res = await apiClient.get<{ widgets: WidgetSummary[]; layout: LayoutEntry[] }>('/widgets');
  return res.data;
}

export async function getWidget(id: string): Promise<WidgetDetail> {
  const res = await apiClient.get<WidgetDetail>(`/widgets/${id}`);
  return res.data;
}

export async function createWidget(input: WidgetInput): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/widgets', input);
  return res.data;
}

export async function updateWidget(id: string, input: WidgetInput): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/widgets/${id}`, input);
  return res.data;
}

export async function deleteWidget(id: string): Promise<void> {
  await apiClient.delete(`/widgets/${id}`);
}

export async function getWidgetData(id: string): Promise<WidgetData> {
  const res = await apiClient.get<WidgetData>(`/widgets/${id}/data`);
  return res.data;
}

export async function previewWidget(input: WidgetPreviewInput): Promise<WidgetData> {
  const res = await apiClient.post<WidgetData>('/widgets/preview', input);
  return res.data;
}

export async function saveLayout(entries: LayoutEntry[]): Promise<void> {
  await apiClient.put('/dashboard/layout', { entries });
}
