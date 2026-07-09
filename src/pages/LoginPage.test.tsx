// src/pages/LoginPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { vi } from 'vitest';
import { createAppRouter } from '../router';
import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth.api';

function renderAtLogin() {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/login'] }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, sessionRestoreAttempted: false });
    vi.spyOn(authApi, 'refreshRequest').mockRejectedValue(new Error('no session'));
  });

  it('shows the Alamo Travels logo', async () => {
    renderAtLogin();
    expect(await screen.findByRole('img', { name: 'Alamo Travels' })).toBeInTheDocument();
  });

  it('logs in, stores the session, and navigates to /dashboard', async () => {
    vi.spyOn(authApi, 'loginRequest').mockResolvedValue({
      accessToken: 'token-123',
      user: { id: '1', name: 'Admin', email: 'admin@alamo.test', role: 'admin' },
    });
    const router = renderAtLogin();
    await screen.findByRole('heading', { name: 'Sign in' });

    await userEvent.type(screen.getByLabelText('Email'), 'admin@alamo.test');
    await userEvent.type(screen.getByLabelText('Password'), 'supersecret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('token-123');
      expect(router.state.location.pathname).toBe('/dashboard');
    });
  });

  it('shows an error message on invalid credentials and stays on /login', async () => {
    vi.spyOn(authApi, 'loginRequest').mockRejectedValue(new Error('Invalid'));
    const router = renderAtLogin();
    await screen.findByRole('heading', { name: 'Sign in' });

    await userEvent.type(screen.getByLabelText('Email'), 'admin@alamo.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });
});
