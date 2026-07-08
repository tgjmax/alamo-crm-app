import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { vi } from 'vitest';
import { createAppRouter } from '../router';
import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth.api';

function renderAuthedApp(initialPath: string) {
  useAuthStore.setState({
    accessToken: 't',
    user: { id: '1', name: 'Admin User', email: 'admin@alamo.test', role: 'admin' },
  });
  const router = createAppRouter(createMemoryHistory({ initialEntries: [initialPath] }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

describe('AppShell', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, sessionRestoreAttempted: false });
    vi.spyOn(authApi, 'refreshRequest').mockRejectedValue(new Error('no session'));
  });

  it('shows sidebar links and the signed-in user', async () => {
    renderAuthedApp('/customers');
    expect(await screen.findByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bookings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Groups' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('hides the Sales link from an agent without data.viewReports', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: {
        id: '2', name: 'Agent', email: 'agent@alamo.test', role: 'agent',
        permissions: {
          bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: false },
          customers: { create: false, edit: false, delete: false, viewPassport: false },
          groups: { createShared: false },
          data: { import: false, export: false, viewReports: false },
        },
      },
    });
    const router = createAppRouter(createMemoryHistory({ initialEntries: ['/customers'] }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
    await screen.findByRole('link', { name: 'Dashboard' });
    expect(screen.queryByRole('link', { name: 'Sales' })).not.toBeInTheDocument();
  });

  it('navigates between pages via sidebar links', async () => {
    const router = renderAuthedApp('/customers');
    await screen.findByRole('link', { name: 'Bookings' });
    await userEvent.click(screen.getByRole('link', { name: 'Bookings' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/bookings');
    });
  });

  it('signs out and redirects to /login', async () => {
    const logout = vi.spyOn(authApi, 'logoutRequest').mockResolvedValue(undefined);
    const router = renderAuthedApp('/customers');
    await screen.findByRole('button', { name: 'Sign out' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(router.state.location.pathname).toBe('/login');
    });
  });
});
