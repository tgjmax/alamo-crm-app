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
  aggregation: { fn: 'count' as const }, hasInlineConditions: true, period: 'all' as const, updatedAt: '2026-07-06T00:00:00.000Z',
};
const W2 = {
  id: 'w2', name: 'By airline', owner: { id: 'u1', name: 'Admin' },
  sharedWith: { mode: 'private' as const, users: [] }, vizType: 'table' as const,
  aggregation: { fn: 'count' as const, groupBy: 'airlineCode' }, hasInlineConditions: true, period: 'all' as const, updatedAt: '2026-07-05T00:00:00.000Z',
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

  it('toasts and reverts the order when the layout save fails', async () => {
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({
      widgets: [W1, W2],
      layout: [{ widget: 'w1', order: 0, size: 'small' }, { widget: 'w2', order: 1, size: 'small' }],
    });
    vi.spyOn(widgetsApi, 'getWidgetData').mockResolvedValue({ kind: 'scalar', value: 1 });
    vi.spyOn(widgetsApi, 'saveLayout').mockRejectedValue(new Error('network'));
    renderAtDashboard();

    await screen.findByRole('heading', { name: 'QR count' });
    await userEvent.click(screen.getByRole('button', { name: 'Move QR count down' }));

    const toastText = await screen.findByText(/could not save/i);
    expect(toastText).toBeInTheDocument();
    // Pins the destructive styling path structurally — jsdom never applies sonner's injected
    // stylesheet, so this is the closest we can assert without a real browser: sonner marks an
    // error toast with data-type="error", which is what its CSS keys the destructive palette off.
    expect(toastText.closest('[data-sonner-toast]')).toHaveAttribute('data-type', 'error');

    // The board must snap back to the order the server actually holds, not keep showing a lie.
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      expect(headings).toEqual(['QR count', 'By airline']);
    });
  });

  it('reverts to the last server-confirmed layout (not the page-load layout) after two successful saves then a failed one', async () => {
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({
      widgets: [W1, W2],
      layout: [{ widget: 'w1', order: 0, size: 'small' }, { widget: 'w2', order: 1, size: 'small' }],
    });
    vi.spyOn(widgetsApi, 'getWidgetData').mockResolvedValue({ kind: 'scalar', value: 1 });
    const save = vi.spyOn(widgetsApi, 'saveLayout');
    save.mockClear();
    save
      .mockResolvedValueOnce(undefined) // 1st save succeeds: move QR count down -> [w2, w1]
      .mockResolvedValueOnce(undefined) // 2nd save succeeds: resize QR count to large (order stays [w2, w1])
      .mockRejectedValueOnce(new Error('network')); // 3rd save fails
    renderAtDashboard();

    await screen.findByRole('heading', { name: 'QR count' });

    // 1st successful reorder.
    await userEvent.click(screen.getByRole('button', { name: 'Move QR count down' }));
    await waitFor(() =>
      expect(save).toHaveBeenNthCalledWith(1, [
        { widget: 'w2', order: 0, size: 'small' },
        { widget: 'w1', order: 1, size: 'small' },
      ])
    );
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      expect(headings).toEqual(['By airline', 'QR count']);
    });

    // 2nd successful save: resize QR count to large. Order is unchanged ([w2, w1]) but this
    // is the state the `confirmed` ref must hold after this point -- distinct from BOTH the
    // page-load layout (w1 small, w2 small) and the mid-sequence state after save #1 alone.
    await userEvent.click(screen.getByRole('button', { name: 'Resize QR count' }));
    await waitFor(() =>
      expect(save).toHaveBeenNthCalledWith(2, [
        { widget: 'w2', order: 0, size: 'small' },
        { widget: 'w1', order: 1, size: 'large' },
      ])
    );
    expect(await screen.findByRole('button', { name: 'Resize QR count' })).toHaveTextContent('Small');

    // 3rd save fails: move By airline down -> attempted order [w1, w2].
    await userEvent.click(screen.getByRole('button', { name: 'Move By airline down' }));
    expect(await screen.findByText(/could not save/i)).toBeInTheDocument();

    // Must land on the last SERVER-CONFIRMED state -- order [By airline, QR count] with
    // QR count still large -- not the page-load order [QR count, By airline] with QR count
    // small, which is what a `confirmed` ref seeded only once at mount (i.e. a deleted
    // onSuccess handler) would incorrectly revert to.
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      expect(headings).toEqual(['By airline', 'QR count']);
    });
    expect(screen.getByRole('button', { name: 'Resize QR count' })).toHaveTextContent('Small');
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

  it("shows each widget's period on its card, so a bare number is never ambiguous", async () => {
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({
      widgets: [{ ...W1, period: 'thisMonth' }],
      layout: [{ widget: 'w1', order: 0, size: 'small' }],
    });
    vi.spyOn(widgetsApi, 'getWidgetData').mockResolvedValue({ kind: 'scalar', value: 7 });
    renderAtDashboard();
    expect(await screen.findByText('This month')).toBeInTheDocument();
  });

  it('shows no period label on an all-time widget', async () => {
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({
      widgets: [W1],
      layout: [{ widget: 'w1', order: 0, size: 'small' }],
    });
    vi.spyOn(widgetsApi, 'getWidgetData').mockResolvedValue({ kind: 'scalar', value: 7 });
    renderAtDashboard();
    await screen.findByRole('heading', { name: 'QR count' });
    expect(screen.queryByText('All time')).not.toBeInTheDocument();
  });

  it('shows the template gallery inline on an empty dashboard', async () => {
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({ widgets: [], layout: [] });
    renderAtDashboard();
    expect(await screen.findByText(/pick a starting point/i)).toBeInTheDocument();
    expect(screen.getByText('Revenue this month')).toBeInTheDocument();
    expect(screen.getByText('Blank widget')).toBeInTheDocument();
  });

  it('opens the gallery from New widget and navigates to the editor with the chosen template', async () => {
    vi.spyOn(widgetsApi, 'listWidgets').mockResolvedValue({
      widgets: [W1], layout: [{ widget: 'w1', order: 0, size: 'small' }],
    });
    vi.spyOn(widgetsApi, 'getWidgetData').mockResolvedValue({ kind: 'scalar', value: 1 });
    vi.spyOn(widgetsApi, 'getDimensions').mockResolvedValue([]);
    vi.spyOn(widgetsApi, 'getWidget').mockResolvedValue({} as never);
    const router = renderAtDashboard();

    await screen.findByRole('heading', { name: 'QR count' });
    await userEvent.click(screen.getByRole('button', { name: 'New widget' }));
    // The gallery card in the dialog:
    await userEvent.click(await screen.findByText('Bookings by airline'));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard/widgets/new');
      expect(router.state.location.search).toEqual({ template: 'bookings-by-airline' });
    });
  });
});
