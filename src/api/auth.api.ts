import { apiClient } from './client';
import { AuthUser } from '../stores/authStore';

export interface LoginResponse {
  accessToken: string;
  user: { id: string; name: string; email: string; role: 'admin' | 'agent' };
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

export interface RefreshResponse {
  accessToken: string;
}

export async function refreshRequest(): Promise<RefreshResponse> {
  const res = await apiClient.post<RefreshResponse>('/auth/refresh');
  return res.data;
}

export async function meRequest(): Promise<AuthUser> {
  const res = await apiClient.get<AuthUser>('/auth/me');
  return res.data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post('/auth/logout');
}
