import { apiClient } from './client';

export interface DirectoryUser {
  id: string;
  name: string;
}

export async function getUserDirectory(): Promise<DirectoryUser[]> {
  const res = await apiClient.get<{ users: DirectoryUser[] }>('/users/directory');
  return res.data.users;
}
