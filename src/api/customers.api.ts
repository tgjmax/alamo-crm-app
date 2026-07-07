import { apiClient } from './client';
import { downloadFile } from './download';

export interface CustomerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  /** Computed by the API (firstName + ' ' + middleName); read-only, not user-inputtable. */
  givenName?: string;
  phone: string;
  passportNumber?: string;
}

export async function searchCustomers(query: string): Promise<CustomerSearchResult[]> {
  const res = await apiClient.get<CustomerSearchResult[]>('/customers/search', { params: { q: query } });
  return res.data;
}

export interface CustomerPassportInfo {
  number?: string;
  issuingCountry: string;
  expiryDate: string;
  hasPhoto: boolean;
}

export interface CustomerListItem {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  givenName?: string;
  paxType: 'INF' | 'CHD' | 'ADT';
  /** MM-DD-YYYY */
  dob: string;
  gender: string;
  phone: string;
  email?: string;
  verified: boolean;
  passport?: CustomerPassportInfo;
}

export interface CustomerListPage {
  customers: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export const CUSTOMER_PAGE_SIZES = [10, 25, 50, 100] as const;

export interface CustomerListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: 'verified' | 'unverified';
  sortBy?: 'givenName' | 'lastName';
  sortDir?: 'asc' | 'desc';
}

export async function listCustomers(params: CustomerListParams = {}): Promise<CustomerListPage> {
  const res = await apiClient.get<CustomerListPage>('/customers', { params });
  return res.data;
}

export interface CustomerPassportInput {
  number: string;
  issuingCountry: string;
  expiryDate: string;
  photoS3Key?: string;
}

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  /** MM-DD-YYYY */
  dob: string;
  gender: string;
  phone: string;
  email?: string;
  verified?: boolean;
  passport?: CustomerPassportInput;
}

export async function createCustomer(input: CreateCustomerInput): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/customers', input);
  return res.data;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/customers/${id}`, input);
  return res.data;
}

export interface PassportUploadUrlResponse {
  uploadUrl: string;
  key: string;
}

export async function getPassportUploadUrl(fileName: string, contentType: string): Promise<PassportUploadUrlResponse> {
  const res = await apiClient.post<PassportUploadUrlResponse>('/customers/passport-upload-url', {
    fileName,
    contentType,
  });
  return res.data;
}

export async function uploadPassportFile(file: File): Promise<string> {
  const { uploadUrl, key } = await getPassportUploadUrl(file.name, file.type);
  await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  return key;
}

export async function getPassportDownloadUrl(customerId: string, download = false): Promise<string> {
  const res = await apiClient.get<{ url: string }>(`/customers/${customerId}/passport-download-url`, {
    params: download ? { download: 'true' } : undefined,
  });
  return res.data.url;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`/customers/${id}`);
}

export async function bulkDeleteCustomers(ids: string[]): Promise<{ deletedCount: number }> {
  const res = await apiClient.post<{ deletedCount: number }>('/customers/bulk-delete', { ids });
  return res.data;
}

export interface ImportCustomerRow {
  firstName: string;
  lastName: string;
  middleName?: string;
  /** MM-DD-YYYY */
  dob: string;
  gender?: string;
  phone: string;
  email?: string;
  verified?: boolean;
  forceImport?: boolean;
}

export interface ImportRowResult {
  index: number;
  status: 'imported' | 'would_import' | 'flagged_duplicate' | 'failed';
  reason?: string;
}

export async function importCustomers(rows: ImportCustomerRow[], dryRun: boolean): Promise<ImportRowResult[]> {
  const res = await apiClient.post<{ results: ImportRowResult[] }>('/customers/import', { dryRun, rows });
  return res.data.results;
}

export async function exportCustomers(): Promise<void> {
  await downloadFile('/customers/export', 'customers.xlsx');
}
