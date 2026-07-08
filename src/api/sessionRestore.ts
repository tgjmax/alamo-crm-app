import { useAuthStore } from '../stores/authStore';
import { refreshRequest, meRequest } from './auth.api';

/**
 * Attempts to repopulate the in-memory session from the httpOnly refresh
 * cookie on a fresh app load (e.g. after a hard page reload, which wipes
 * Zustand's in-memory accessToken/user). Runs at most once per app load —
 * safe to call from every route's beforeLoad.
 */
export async function restoreSession(): Promise<void> {
  const { user, sessionRestoreAttempted, markSessionRestoreAttempted } = useAuthStore.getState();
  if (user || sessionRestoreAttempted) return;
  markSessionRestoreAttempted();

  try {
    const { accessToken } = await refreshRequest();
    useAuthStore.getState().setAccessToken(accessToken);
    const restoredUser = await meRequest();
    useAuthStore.getState().setSession(accessToken, restoredUser);
  } catch {
    useAuthStore.getState().clearSession();
  }
}
