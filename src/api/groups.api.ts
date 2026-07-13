import { apiClient } from './client';

export type ConditionOperator =
  | 'equals'
  | 'contains'
  | 'in'
  | 'between'
  | 'greaterThan'
  | 'lessThan'
  // Relative-date operators. The backend resolves their range against "now" on every evaluation,
  // so a saved "this year" widget rolls over on 1 January instead of going stale.
  | 'inLastDays'
  | 'thisMonth'
  | 'thisYear';
export type FieldType = 'string' | 'number' | 'date' | 'enum' | 'boolean' | 'user';
export type ConditionValue = string | number | boolean | string[] | number[] | undefined;

export interface GroupFieldMeta {
  key: string;
  label: string;
  type: FieldType;
  enumValues?: string[];
  operators: ConditionOperator[];
}

export interface GroupCondition {
  field: string;
  operator: ConditionOperator;
  /** Absent for the valueless relative-date operators (thisMonth, thisYear). */
  value?: ConditionValue;
}

export interface GroupSharing {
  mode: 'private' | 'shared';
  users: string[];
}

export interface GroupSummary {
  id: string;
  name: string;
  owner: { id: string; name: string };
  sharedWith: GroupSharing;
  conditionCount: number;
  updatedAt: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  sharedWith: GroupSharing;
  conditions: GroupCondition[];
}

export interface GroupResultRow {
  id: string;
  date: string;
  invoiceNumber?: string;
  passengerName: string;
  bookingType: string;
  pnr?: string;
  airlineCode?: string;
  arrCity?: string;
  amount: number;
  paymentStatus?: string;
}

export interface GroupQueryResult {
  rows: GroupResultRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GroupInput {
  name: string;
  conditions: GroupCondition[];
  sharedWith?: { mode: 'private' | 'shared'; users?: string[] };
}

export async function getGroupFields(): Promise<GroupFieldMeta[]> {
  const res = await apiClient.get<{ fields: GroupFieldMeta[] }>('/groups/fields');
  return res.data.fields;
}

export async function listGroups(): Promise<GroupSummary[]> {
  const res = await apiClient.get<{ groups: GroupSummary[] }>('/groups');
  return res.data.groups;
}

export async function getGroup(id: string): Promise<GroupDetail> {
  const res = await apiClient.get<GroupDetail>(`/groups/${id}`);
  return res.data;
}

export async function createGroup(input: GroupInput): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/groups', input);
  return res.data;
}

export async function updateGroup(id: string, input: GroupInput): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/groups/${id}`, input);
  return res.data;
}

export async function deleteGroup(id: string): Promise<void> {
  await apiClient.delete(`/groups/${id}`);
}

export async function getGroupResults(id: string, page: number): Promise<GroupQueryResult> {
  const res = await apiClient.get<GroupQueryResult>(`/groups/${id}/results`, { params: { page } });
  return res.data;
}

export async function previewGroup(conditions: GroupCondition[], page: number): Promise<GroupQueryResult> {
  const res = await apiClient.post<GroupQueryResult>('/groups/preview', { conditions, page });
  return res.data;
}
