// src/router.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { vi } from 'vitest';
import { createAppRouter } from './router';
import { useAuthStore } from './stores/authStore';
import * as authApi from './api/auth.api';

function renderApp(initialPath: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [initialPath] }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

describe('app router', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, sessionRestoreAttempted: false });
  });

  it('redirects unauthenticated /customers to /login', async () => {
    vi.spyOn(authApi, 'refreshRequest').mockRejectedValue(new Error('no session'));
    const router = renderApp('/customers');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('restores an existing session from the refresh cookie on boot, instead of bouncing to /login', async () => {
    vi.spyOn(authApi, 'refreshRequest').mockResolvedValue({ accessToken: 'restored-token' });
    vi.spyOn(authApi, 'meRequest').mockResolvedValue({
      id: '1', name: 'Admin', email: 'a@alamo.test', role: 'admin',
    });
    const router = renderApp('/customers');
    expect(await screen.findByRole('heading', { name: 'Customers' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/customers');
    expect(useAuthStore.getState().accessToken).toBe('restored-token');
    expect(useAuthStore.getState().user).toMatchObject({ id: '1', name: 'Admin' });
  });

  it('renders the customers page at /customers when signed in', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: { id: '1', name: 'Admin', email: 'a@alamo.test', role: 'admin' },
    });
    renderApp('/customers');
    expect(await screen.findByRole('heading', { name: 'Customers' })).toBeInTheDocument();
  });

  it('redirects / to /dashboard when signed in', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: { id: '1', name: 'Admin', email: 'a@alamo.test', role: 'admin' },
    });
    const router = renderApp('/');
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('redirects an agent without data.viewReports away from /sales', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: {
        id: '1', name: 'Agent', email: 'a@alamo.test', role: 'agent',
        permissions: {
          bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: false },
          customers: { create: false, edit: false, delete: false, viewPassport: false },
          groups: { createShared: false },
          data: { import: false, export: false, viewReports: false },
        },
      },
    });
    const router = renderApp('/sales');
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('lets an admin view /sales', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: { id: '1', name: 'Admin', email: 'a@alamo.test', role: 'admin' },
    });
    renderApp('/sales');
    expect(await screen.findByRole('heading', { name: 'Sales' })).toBeInTheDocument();
  });
});
