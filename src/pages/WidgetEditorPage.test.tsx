import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { vi } from 'vitest';
import { createAppRouter } from '../router';
import { useAuthStore, AuthUser } from '../stores/authStore';
import * as widgetsApi from '../api/widgets.api';
import * as groupsApi from '../api/groups.api';
import * as usersApi from '../api/users.api';

const ADMIN: AuthUser = { id: 'u1', name: 'Admin', email: 'a@t.test', role: 'admin' };

function renderAt(path: string, user: AuthUser = ADMIN) {
  useAuthStore.setState({ accessToken: 't', user });
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

async function pick(name: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

describe('WidgetEditorPage', () => {
  beforeEach(() => {
    vi.spyOn(widgetsApi, 'getDimensions').mockResolvedValue([
      { key: 'month', label: 'Month' }, { key: 'airlineCode', label: 'Airline' },
    ]);
    vi.spyOn(groupsApi, 'listGroups').mockResolvedValue([
      { id: 'g1', name: 'QR', owner: { id: 'u1', name: 'Admin' }, sharedWith: { mode: 'private', users: [] }, conditionCount: 1, updatedAt: '2026-07-06T00:00:00.000Z' },
    ]);
    vi.spyOn(groupsApi, 'getGroupFields').mockResolvedValue([
      { key: 'airlineCode', label: 'Airline', type: 'string', operators: ['equals', 'contains', 'in'] },
    ]);
    vi.spyOn(usersApi, 'getUserDirectory').mockResolvedValue([{ id: 'u1', name: 'Admin' }]);
  });

  it('creates a group-backed table widget and navigates to /dashboard', async () => {
    const create = vi.spyOn(widgetsApi, 'createWidget').mockResolvedValue({ id: 'w9' });
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({ widgets: [], layout: [] });
    const router = renderAt('/dashboard/widgets/new');

    await userEvent.type(await screen.findByLabelText('Widget name'), 'By airline');
    await pick('Source', 'Saved group');
    await pick('Group', 'QR');
    await pick('Metric', 'Count');
    await pick('Group by', 'Airline');
    await pick('Display', 'Table');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save widget' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'By airline',
        group: 'g1',
        vizType: 'table',
        aggregation: { fn: 'count', field: undefined, groupBy: 'airlineCode' },
        chartType: undefined,
        sharedWith: { mode: 'private', users: [] },
      });
      expect(router.state.location.pathname).toBe('/dashboard');
    });
  });

  it('previews a number widget from the chosen source', async () => {
    const preview = vi.spyOn(widgetsApi, 'previewWidget').mockResolvedValue({ kind: 'scalar', value: 12 });
    renderAt('/dashboard/widgets/new');

    await userEvent.type(await screen.findByLabelText('Widget name'), 'Total');
    await pick('Source', 'Saved group');
    await pick('Group', 'QR');
    await pick('Metric', 'Sum of amount');
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() =>
      expect(preview).toHaveBeenCalledWith({
        group: 'g1',
        vizType: 'number',
        aggregation: { fn: 'sum', field: 'amount', groupBy: undefined },
        chartType: undefined,
      })
    );
    expect(await screen.findByText('12')).toBeInTheDocument();
  });

  it('loads an existing chart widget and updates it', async () => {
    vi.spyOn(widgetsApi, 'getWidget').mockResolvedValue({
      id: 'w1', name: 'Monthly', sharedWith: { mode: 'private', users: [] }, group: 'g1',
      vizType: 'chart', aggregation: { fn: 'sum', field: 'amount', groupBy: 'month' }, chartType: 'bar',
    });
    const update = vi.spyOn(widgetsApi, 'updateWidget').mockResolvedValue({ id: 'w1' });
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({ widgets: [], layout: [] });
    renderAt('/dashboard/widgets/w1');

    const nameInput = await screen.findByLabelText('Widget name');
    await waitFor(() => expect(nameInput).toHaveValue('Monthly'));
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Monthly sales');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save widget' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('w1', {
        name: 'Monthly sales',
        group: 'g1',
        vizType: 'chart',
        aggregation: { fn: 'sum', field: 'amount', groupBy: 'month' },
        chartType: 'bar',
        sharedWith: { mode: 'private', users: [] },
      })
    );
  });
});
