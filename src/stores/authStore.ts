import { create } from 'zustand';

export interface UserPermissions {
  bookings: {
    create: boolean; edit: boolean; delete: boolean; createAdjustment: boolean;
    viewAll: boolean; import: boolean; export: boolean; sendInvoice: boolean;
  };
  customers: {
    create: boolean; edit: boolean; delete: boolean; viewPassport: boolean;
    import: boolean; export: boolean;
  };
  groups: { createShared: boolean };
  data: { viewReports: boolean };
  enquiries: { sendQuote: boolean; edit: boolean; delete: boolean };
}

export type UserRole = 'superadmin' | 'admin' | 'agent';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: UserPermissions;
  photoUrl?: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** Whether a boot-time session-restore attempt has already run this app load — see sessionRestore.ts. */
  sessionRestoreAttempted: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  markSessionRestoreAttempted: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  sessionRestoreAttempted: false,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ accessToken: null, user: null }),
  markSessionRestoreAttempted: () => set({ sessionRestoreAttempted: true }),
}));
