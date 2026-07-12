import { apiClient } from './client';

export interface Branding {
  name: string;
  tagline: string;
  logoUrl: string | null;
  invoiceTerms: string | null;
}

export async function getBranding(): Promise<Branding> {
  const res = await apiClient.get<Branding>('/organization/branding');
  return res.data;
}

export interface UpdateBrandingInput {
  name?: string;
  tagline?: string;
  logoS3Key?: string;
  invoiceTerms?: string;
}

export interface UpdateBrandingResponse {
  name: string;
  tagline: string;
  logoS3Key: string | null;
}

export async function updateBranding(input: UpdateBrandingInput): Promise<UpdateBrandingResponse> {
  const res = await apiClient.patch<UpdateBrandingResponse>('/organization/branding', input);
  return res.data;
}

export interface LogoUploadUrlResponse {
  uploadUrl: string;
  key: string;
}

export async function getLogoUploadUrl(fileName: string, contentType: string): Promise<LogoUploadUrlResponse> {
  const res = await apiClient.post<LogoUploadUrlResponse>('/organization/logo-upload-url', { fileName, contentType });
  return res.data;
}

export async function uploadLogoFile(file: File): Promise<string> {
  const { uploadUrl, key } = await getLogoUploadUrl(file.name, file.type);
  await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  return key;
}
