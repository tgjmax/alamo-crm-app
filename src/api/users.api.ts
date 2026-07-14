import { apiClient } from './client';
import { AuthUser, UserPermissions, UserRole } from '../stores/authStore';

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

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: UserPermissions;
  active: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  permissions?: Partial<UserPermissions>;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  permissions?: Partial<UserPermissions>;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const res = await apiClient.get<{ users: ManagedUser[] }>('/users');
  return res.data.users;
}

export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  const res = await apiClient.post<ManagedUser>('/users', input);
  return res.data;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser> {
  const res = await apiClient.patch<ManagedUser>(`/users/${id}`, input);
  return res.data;
}

export async function setUserPassword(id: string, newPassword: string): Promise<void> {
  await apiClient.patch(`/users/${id}/password`, { newPassword });
}

export async function setUserActive(id: string, active: boolean): Promise<ManagedUser> {
  const res = await apiClient.patch<ManagedUser>(`/users/${id}/active`, { active });
  return res.data;
}

export const USERS_QUERY_KEY = ['users'] as const;
