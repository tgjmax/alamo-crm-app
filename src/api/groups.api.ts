import { apiClient } from './client';
import { downloadFile } from './download';

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
  owner: { id: string; name: string };
  sharedWith: GroupSharing;
  conditions: GroupCondition[];
  /** How many rows have been checked off. Drives the "Excluded (N)" button's badge. */
  excludedCount: number;
  view?: GroupView;
}

export const GROUP_PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_GROUP_PAGE_SIZE = 25;

export type GroupSortBy =
  | 'date' | 'invoiceNumber' | 'passengerName' | 'amount' | 'pnr' | 'airlineCode'
  | 'depCity' | 'arrCity' | 'depDate' | 'arrDate';

export interface GroupResultParams {
  page: number;
  pageSize: number;
  sortBy?: GroupSortBy;
  sortDir?: 'asc' | 'desc';
  /** true → list ONLY the excluded rows (the restore view). The backend ignores the group's
   * conditions in this mode, so a row that has since stopped matching is still listed and can
   * still be restored. Omit or false for the normal view, which hides excluded rows. */
  excluded?: boolean;
}

export interface GroupView {
  hiddenColumns: string[];
  sort?: { id: GroupSortBy; desc: boolean };
}

export interface GroupResultRow {
  id: string;
  date: string;
  invoiceNumber?: string;
  passengerName: string;
  bookingType: string;
  pnr?: string;
  airlineCode?: string;
  depCity?: string;
  arrCity?: string;
  depDate?: string;
  arrDate?: string;
  amount: number;
  paymentStatus?: 'paid' | 'pending';
  paymentAmount?: number;
  remark?: string;
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

export async function updateGroupView(id: string, view: GroupView): Promise<GroupView> {
  const res = await apiClient.patch<{ view: GroupView }>(`/groups/${id}/view`, view);
  return res.data.view;
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

export async function getGroupResults(id: string, params: GroupResultParams): Promise<GroupQueryResult> {
  const res = await apiClient.get<GroupQueryResult>(`/groups/${id}/results`, { params });
  return res.data;
}

export interface ExclusionUpdate {
  add?: string[];
  remove?: string[];
}

/** Deltas, never the whole array — two agents can be checking rows off in the same group at once,
 * and a whole-array write would silently discard the other's progress. Returns the new count. */
export async function updateGroupExclusions(id: string, update: ExclusionUpdate): Promise<number> {
  const res = await apiClient.patch<{ excludedCount: number }>(`/groups/${id}/exclusions`, update);
  return res.data.excludedCount;
}

export async function previewGroup(
  conditions: GroupCondition[],
  params: GroupResultParams
): Promise<GroupQueryResult> {
  const res = await apiClient.post<GroupQueryResult>('/groups/preview', { conditions, ...params });
  return res.data;
}

/** Mirror of the backend's Group-<name>.pdf attachment filename. */
function safeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-');
  return cleaned.length ? cleaned : 'Group';
}

export async function getGroupReport(groupId: string, groupName: string): Promise<void> {
  await downloadFile(`/groups/${groupId}/report`, `Group-${safeFilename(groupName)}.pdf`);
}
