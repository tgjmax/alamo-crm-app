import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as auditApi from '@/api/audit.api';
import { AuditHistoryPanel } from './audit-history-panel';

vi.mock('@/api/audit.api', async (importActual) => ({
  ...(await importActual<typeof auditApi>()),
  listAuditEntries: vi.fn(),
}));

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuditHistoryPanel filter={{ bookingRef: 'b1' }} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(auditApi.listAuditEntries).mockReset();
});

describe('AuditHistoryPanel', () => {
  it('renders a field change as from → to', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a1',
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

    renderPanel();

    expect(await screen.findByText('Booking edited')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText(/pnr/)).toBeInTheDocument();
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
    expect(screen.getByText(/XYZ789/)).toBeInTheDocument();
  });

  // A cleared field is the void case — the whole reason booking.void is split out.
  it('renders a cleared value as "(cleared)", not blank', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a2',
          actor: { id: 'u1', name: 'Priya Nair', email: 'p@example.com' },
          action: 'booking.void',
          targetCollection: 'bookings',
          targetId: 'b1',
          summary: { changes: [{ path: 'pnr', from: 'ABC123', to: undefined }] },
          createdAt: '2026-07-18T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });

    renderPanel();
    expect(await screen.findByText(/\(cleared\)/)).toBeInTheDocument();
  });

  // A real 0/false must survive — a truthiness guard would eat both and print '(cleared)'.
  it('renders a real 0 or false, not "(cleared)"', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a5',
          actor: { id: 'u1', name: 'Priya Nair', email: 'p@example.com' },
          action: 'passenger.paymentUpdate',
          targetCollection: 'passengers',
          targetId: 'p1',
          bookingRef: 'b1',
          summary: {
            changes: [
              { path: 'payment.amount', from: 450, to: 0 },
              { path: 'voided', from: true, to: false },
            ],
          },
          createdAt: '2026-07-18T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });

    renderPanel();

    expect(await screen.findByText(/payment\.amount/)).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('no')).toBeInTheDocument();
    expect(screen.queryByText(/\(cleared\)/)).not.toBeInTheDocument();
  });

  it('renders "No field changes recorded." for an empty changes list', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a6',
          actor: { id: 'u1', name: 'Priya Nair', email: 'p@example.com' },
          action: 'booking.update',
          targetCollection: 'bookings',
          targetId: 'b1',
          summary: { changes: [] },
          createdAt: '2026-07-18T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });

    renderPanel();
    expect(await screen.findByText('No field changes recorded.')).toBeInTheDocument();
  });

  it('renders "No details recorded." for an empty snapshot', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a7',
          actor: { id: 'u1', name: 'Priya Nair', email: 'p@example.com' },
          action: 'passenger.delete',
          targetCollection: 'passengers',
          targetId: 'p1',
          bookingRef: 'b1',
          summary: { snapshot: {} },
          createdAt: '2026-07-18T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });

    renderPanel();
    expect(await screen.findByText('No details recorded.')).toBeInTheDocument();
  });

  it('keeps showing rows during a background refetch, not a skeleton', async () => {
    const page: auditApi.AuditEntryPage = {
      entries: [
        {
          id: 'a8',
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
    };
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue(page);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <AuditHistoryPanel filter={{ bookingRef: 'b1' }} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Booking edited')).toBeInTheDocument();
    expect(screen.queryAllByTestId('audit-skeleton')).toHaveLength(0);

    // Trigger a background refetch with a genuinely new object (structural sharing would
    // otherwise hand back the same reference and prove nothing) while data is on screen.
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({ ...page, entries: [...page.entries] });
    await client.invalidateQueries({ queryKey: [...auditApi.AUDIT_QUERY_KEY, 'record', { bookingRef: 'b1' }] });

    expect(await screen.findByText('Booking edited')).toBeInTheDocument();
    expect(screen.queryAllByTestId('audit-skeleton')).toHaveLength(0);
  });

  it('renders an error message when the fetch fails', async () => {
    vi.mocked(auditApi.listAuditEntries).mockRejectedValue(new Error('network error'));
    renderPanel();
    expect(await screen.findByText('Could not load history.')).toBeInTheDocument();
  });

  it('renders a delete snapshot', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a3',
          actor: { id: 'u1', name: 'Priya Nair', email: 'p@example.com' },
          action: 'passenger.delete',
          targetCollection: 'passengers',
          targetId: 'p1',
          bookingRef: 'b1',
          summary: { snapshot: { passengerName: 'ANN LEE', amount: 450 } },
          createdAt: '2026-07-18T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });

    renderPanel();
    expect(await screen.findByText('Passenger deleted')).toBeInTheDocument();
    expect(screen.getByText(/ANN LEE/)).toBeInTheDocument();
  });

  // invoice.send has no persisted document to point at (this app stores no Invoice
  // collection) so the backend sends no targetId at all — the panel must render this
  // entry without crashing or printing "undefined".
  it('renders an entry with no targetId without crashing', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a9',
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

    renderPanel();

    expect(await screen.findByText('Invoice emailed')).toBeInTheDocument();
    expect(screen.getByText(/customer@example.com/)).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it('shows an empty state when there is no history', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
    renderPanel();
    expect(await screen.findByText('No recorded changes.')).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    vi.mocked(auditApi.listAuditEntries).mockReturnValue(new Promise(() => {}));
    renderPanel();
    expect(screen.getAllByTestId('audit-skeleton').length).toBeGreaterThan(0);
  });

  // A deleted actor must not crash the panel.
  it('renders "Unknown user" when the actor is null', async () => {
    vi.mocked(auditApi.listAuditEntries).mockResolvedValue({
      entries: [
        {
          id: 'a4',
          actor: null,
          action: 'group.delete',
          targetCollection: 'groups',
          targetId: 'g1',
          summary: { snapshot: { name: 'July' } },
          createdAt: '2026-07-18T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderPanel();
    expect(await screen.findByText('Unknown user')).toBeInTheDocument();
  });
});
