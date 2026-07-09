import { apiClient } from './client';
import { AuthUser } from '../stores/authStore';

export interface DirectoryUser {
  id: string;
  name: string;
}

export async function getUserDirectory(): Promise<DirectoryUser[]> {
  const res = await apiClient.get<{ users: DirectoryUser[] }>('/users/directory');
  return res.data.users;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  photoS3Key?: string | null;
}

export async function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  const res = await apiClient.patch<AuthUser>('/users/me', input);
  return res.data;
}

export interface PhotoUploadUrlResponse {
  uploadUrl: string;
  key: string;
}

export async function getPhotoUploadUrl(contentType: string): Promise<PhotoUploadUrlResponse> {
  const res = await apiClient.post<PhotoUploadUrlResponse>('/users/photo-upload-url', { contentType });
  return res.data;
}

export async function uploadProfilePhotoFile(file: File): Promise<string> {
  const { uploadUrl, key } = await getPhotoUploadUrl(file.type);
  await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  return key;
}
