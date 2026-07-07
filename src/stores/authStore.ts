import { create } from 'zustand';

export interface UserPermissions {
  bookings: { create: boolean; edit: boolean; delete: boolean; createAdjustment: boolean; viewAll: boolean };
  customers: { create: boolean; edit: boolean; delete: boolean; viewPassport: boolean };
  groups: { createShared: boolean };
  data: { import: boolean; export: boolean; viewReports: boolean };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  permissions?: UserPermissions;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearSession: () => set({ accessToken: null, user: null }),
}));
