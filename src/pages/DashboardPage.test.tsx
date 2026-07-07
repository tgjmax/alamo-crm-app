// src/pages/DashboardPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { vi } from 'vitest';
import { createAppRouter } from '../router';
import { useAuthStore } from '../stores/authStore';
import * as widgetsApi from '../api/widgets.api';
import * as usersApi from '../api/users.api';

function renderAtDashboard() {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/dashboard'] }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

const W1 = {
  id: 'w1', name: 'QR count', owner: { id: 'u1', name: 'Admin' },
  sharedWith: { mode: 'private' as const, users: [] }, vizType: 'number' as const,
  aggregation: { fn: 'count' as const }, hasInlineConditions: true, updatedAt: '2026-07-06T00:00:00.000Z',
};
const W2 = {
  id: 'w2', name: 'By airline', owner: { id: 'u1', name: 'Admin' },
  sharedWith: { mode: 'private' as const, users: [] }, vizType: 'table' as const,
  aggregation: { fn: 'count' as const, groupBy: 'airlineCode' }, hasInlineConditions: true, updatedAt: '2026-07-05T00:00:00.000Z',
};

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 't', user: { id: 'u1', name: 'Admin', email: 'a@t.test', role: 'admin' } });
    vi.spyOn(usersApi, 'getUserDirectory').mockResolvedValue([{ id: 'u1', name: 'Admin' }]);
  });

  it('renders cards in layout order and shows their data', async () => {
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({
      widgets: [W1, W2],
      layout: [{ widget: 'w2', order: 0, size: 'small' }, { widget: 'w1', order: 1, size: 'small' }],
    });
    vi.spyOn(widgetsApi, 'getWidgetData').mockImplementation(async (id) =>
      id === 'w1' ? { kind: 'scalar', value: 7 } : { kind: 'breakdown', rows: [{ key: 'QR', value: 7 }] }
    );
    renderAtDashboard();

    expect(await screen.findByRole('heading', { name: 'By airline' })).toBeInTheDocument();
    expect(await screen.findByText('7')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['By airline', 'QR count']);
  });

  it('persists a reorder when Move down is clicked', async () => {
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({
      widgets: [W1, W2],
      layout: [{ widget: 'w1', order: 0, size: 'small' }, { widget: 'w2', order: 1, size: 'small' }],
    });
    vi.spyOn(widgetsApi, 'getWidgetData').mockResolvedValue({ kind: 'scalar', value: 1 });
    const save = vi.spyOn(widgetsApi, 'saveLayout').mockResolvedValue();
    renderAtDashboard();

    await screen.findByRole('heading', { name: 'QR count' });
    await userEvent.click(screen.getByRole('button', { name: 'Move QR count down' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith([
        { widget: 'w2', order: 0, size: 'small' },
        { widget: 'w1', order: 1, size: 'small' },
      ])
    );
  });

  it('deletes a widget after confirmation', async () => {
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({
      widgets: [W1], layout: [{ widget: 'w1', order: 0, size: 'small' }],
    });
    vi.spyOn(widgetsApi, 'getWidgetData').mockResolvedValue({ kind: 'scalar', value: 1 });
    const del = vi.spyOn(widgetsApi, 'deleteWidget').mockResolvedValue();
    renderAtDashboard();

    await screen.findByRole('heading', { name: 'QR count' });
    await userEvent.click(screen.getByRole('button', { name: 'Delete QR count' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('w1'));
  });
});
