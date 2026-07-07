import { vi } from 'vitest';
import { apiClient } from './client';
import { useAuthStore, AuthUser } from '../stores/authStore';

interface MockConfig {
  url?: string;
  headers: Record<string, string>;
  _retriedAfterRefresh?: boolean;
}

function unauthorized(config: MockConfig, code: string) {
  return Promise.reject({
    isAxiosError: true,
    config,
    response: { status: 401, data: { error: { code } }, statusText: 'Unauthorized', headers: {}, config },
    message: 'Request failed with status code 401',
  });
}

function ok(config: MockConfig, data: unknown = { ok: true }) {
  return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config });
}

const ADMIN: AuthUser = { id: 'u1', name: 'Admin', email: 'a@t.test', role: 'admin' };

describe('apiClient auth interceptor', () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('attaches the Authorization header when an access token is present', async () => {
    useAuthStore.setState({ accessToken: 'token-123', user: null });
    const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
    apiClient.defaults.adapter = adapter;

    await apiClient.get('/whatever');

    const config = adapter.mock.calls[0][0];
    expect(config.headers.Authorization).toBe('Bearer token-123');
  });

  it('sends no Authorization header when there is no access token', async () => {
    const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
    apiClient.defaults.adapter = adapter;

    await apiClient.get('/whatever');

    const config = adapter.mock.calls[0][0];
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('on an expired access token (401 INVALID_TOKEN), refreshes once and retries the original request', async () => {
    useAuthStore.setState({ accessToken: 'old-token', user: ADMIN });
    const adapter = vi.fn().mockImplementation((config: MockConfig) => {
      if (config.url === '/auth/refresh') return ok(config, { accessToken: 'new-token' });
      if (!config._retriedAfterRefresh) return unauthorized(config, 'INVALID_TOKEN');
      return ok(config);
    });
    apiClient.defaults.adapter = adapter;

    const res = await apiClient.get('/protected');

    expect(res.data).toEqual({ ok: true });
    expect(useAuthStore.getState().accessToken).toBe('new-token');
    expect(useAuthStore.getState().user).toEqual(ADMIN); // preserved, not wiped
    expect(adapter).toHaveBeenCalledTimes(3); // failed original, refresh, retried original
    const retried = adapter.mock.calls[2][0];
    expect(retried.headers.Authorization).toBe('Bearer new-token');
  });

  it('shares a single in-flight refresh across concurrent 401s', async () => {
    useAuthStore.setState({ accessToken: 'old-token', user: ADMIN });
    const adapter = vi.fn().mockImplementation((config: MockConfig) => {
      if (config.url === '/auth/refresh') return ok(config, { accessToken: 'new-token' });
      if (!config._retriedAfterRefresh) return unauthorized(config, 'INVALID_TOKEN');
      return ok(config);
    });
    apiClient.defaults.adapter = adapter;

    const [a, b] = await Promise.all([apiClient.get('/protected-a'), apiClient.get('/protected-b')]);

    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
    const refreshCalls = adapter.mock.calls.filter(([config]) => config.url === '/auth/refresh');
    expect(refreshCalls).toHaveLength(1);
  });

  it('clears the session and propagates the error when the refresh itself fails', async () => {
    useAuthStore.setState({ accessToken: 'old-token', user: ADMIN });
    const adapter = vi.fn().mockImplementation((config: MockConfig) => {
      if (config.url === '/auth/refresh') return unauthorized(config, 'MISSING_REFRESH_TOKEN');
      return unauthorized(config, 'INVALID_TOKEN');
    });
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      response: { data: { error: { code: 'MISSING_REFRESH_TOKEN' } } },
    });
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('does not attempt a refresh for non-token errors (e.g. a plain 500)', async () => {
    useAuthStore.setState({ accessToken: 'old-token', user: ADMIN });
    const adapter = vi.fn().mockImplementation((config: MockConfig) =>
      Promise.reject({
        isAxiosError: true,
        config,
        response: { status: 500, data: { error: { code: 'INTERNAL' } }, statusText: 'Error', headers: {}, config },
        message: 'Request failed with status code 500',
      })
    );
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.get('/protected')).rejects.toMatchObject({ response: { status: 500 } });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe('old-token'); // untouched
  });
});
