import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as auditApi from '@/api/audit.api';
import * as usersApi from '@/api/users.api';
import { useAuthStore } from '@/stores/authStore';
import { AuditPage } from './AuditPage';

vi.mock('@/api/audit.api', async (importActual) => ({
  ...(await importActual<typeof auditApi>()),
  listAuditEntries: vi.fn(),
  listAuditActions: vi.fn(),
}));
vi.mock('@/api/users.api', async (importActual) => ({
  ...(await importActual<typeof usersApi>()),
  getUserDirectory: vi.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuditPage />
    </QueryClientProvider>
  );
}

const ONE_ENTRY: auditApi.AuditEntryPage = {
  entries: [
    {
      id: 'a1',
      actor: { id: 'u1', name: 'Priya Nair', email: 'p@example.com' },
      action: 'booking.delete',
      targetCollection: 'bookings',
      targetId: 'b1',
      summary: { snapshot: { invoiceNumber: 'A-1001' } },
      createdAt: '2026-07-18T10:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
};

beforeEach(() => {
  vi.mocked(auditApi.listAuditActions).mockResolvedValue(['booking.delete']);
  vi.mocked(usersApi.getUserDirectory).mockResolvedValue([{ id: 'u1', name: 'Priya Nair' }]);
  useAuthStore.setState({
    accessToken: 't',
    user: { id: 'u1', name: 'Root', email: 'r@example.com', role: 'superadmin' },
  });
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ accessToken: null, user: null });
});

describe('AuditPage', () => {
  it('renders entries', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue(ONE_ENTRY);

    renderPage();
    expect(await screen.findByText('Invoice deleted')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText(/A-1001/)).toBeInTheDocument();
  });

  it('shows a skeleton on first load, not an empty state', () => {
    vi.mocked(auditApi.listAuditEntries).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByTestId('table-skeleton-row').length).toBeGreaterThan(0);
    expect(screen.queryByText('No audit entries found.')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are none', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
    renderPage();
    expect(await screen.findByText('No audit entries found.')).toBeInTheDocument();
  });

  it('does not send empty filter values as literal strings', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue(ONE_ENTRY);
    renderPage();
    await screen.findByText('Invoice deleted');

    const calls = vi.mocked(auditApi.listAuditEntries).mock.calls;
    const lastCall = calls[calls.length - 1]?.[0];
    expect(lastCall?.actor).toBeUndefined();
    expect(lastCall?.action).toBeUndefined();
    expect(lastCall?.from).toBeUndefined();
    expect(lastCall?.to).toBeUndefined();
  });

  it('filters by actor and resets to page 1', async () => {
    const user = userEvent.setup();
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [ONE_ENTRY.entries[0]],
      total: 60,
      page: 1,
      pageSize: 25,
    });
    renderPage();
    await screen.findByText('Invoice deleted');

    // Move off page 1 first, so we can prove the filter resets it.
    await user.click(screen.getByRole('link', { name: /go to next page/i }));
    await waitFor(() => {
      const calls = vi.mocked(auditApi.listAuditEntries).mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last?.page).toBe(2);
    });

    await user.click(screen.getByRole('combobox', { name: /filter by user/i }));
    await user.click(await screen.findByRole('option', { name: 'Priya Nair' }));

    await waitFor(() => {
      const calls = vi.mocked(auditApi.listAuditEntries).mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last?.actor).toBe('u1');
      expect(last?.page).toBe(1);
    });
  });

  it('filters by action, showing the human label', async () => {
    const user = userEvent.setup();
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue(ONE_ENTRY);
    renderPage();
    await screen.findByText('Invoice deleted');

    await user.click(screen.getByRole('combobox', { name: /filter by action/i }));
    expect(await screen.findByRole('option', { name: 'Invoice deleted' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Invoice deleted' }));

    await waitFor(() => {
      const calls = vi.mocked(auditApi.listAuditEntries).mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last?.action).toBe('booking.delete');
    });
  });

  // invoice.send carries no targetId (no Invoice collection to point at) — the list
  // page must render it without crashing.
  it('renders an entry with no targetId without crashing', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a3',
          actor: { id: 'u1', name: 'Priya Nair', email: 'p@example.com' },
          action: 'invoice.send',
          targetCollection: 'invoices',
          summary: {
            snapshot: {
              toEmail: 'customer@example.com',
              invoiceNumber: 'A-1001',
              grandTotal: 450,
              lineItemCount: 2,
            },
          },
          createdAt: '2026-07-19T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderPage();
    expect(await screen.findByText('Invoice emailed')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it('renders the change details via AuditChangeList', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a2',
          actor: { id: 'u1', name: 'Priya Nair', email: 'p@example.com' },
          action: 'booking.update',
          targetCollection: 'bookings',
          targetId: 'b1',
          summary: { changes: [{ path: 'pnr', from: 'ABC123', to: 'XYZ789' }] },
          createdAt: '2026-07-18T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderPage();
    expect(await screen.findByText(/pnr/)).toBeInTheDocument();
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
    expect(screen.getByText(/XYZ789/)).toBeInTheDocument();
  });
});
