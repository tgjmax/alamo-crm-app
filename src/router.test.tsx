// src/router.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { createAppRouter } from './router';
import { useAuthStore } from './stores/authStore';

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
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it('redirects unauthenticated /customers to /login', async () => {
    const router = renderApp('/customers');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
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
});
