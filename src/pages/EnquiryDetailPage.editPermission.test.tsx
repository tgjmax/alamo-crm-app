import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import EnquiryDetailPage from './EnquiryDetailPage';
import * as enquiriesApi from '../api/enquiries.api';
import * as auditApi from '../api/audit.api';
import { useAuthStore, UserPermissions } from '../stores/authStore';

vi.mock('../api/audit.api', async (importActual) => ({
  ...(await importActual<typeof auditApi>()),
  listAuditEntries: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
  useParams: () => ({ enquiryId: 'e1' }),
}));

vi.mock('../api/enquiries.api', async (importActual) => ({
  ...(await importActual<typeof enquiriesApi>()),
  getEnquiry: vi.fn(),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const NO_PERMISSIONS: UserPermissions = {
  bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: false, import: false, export: false, sendInvoice: false },
  customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: false },
  groups: { createShared: false },
  data: { viewReports: false },
  enquiries: { sendQuote: false, edit: false, delete: false },
};

const ENQUIRY: enquiriesApi.Enquiry = {
  id: 'e1',
  enquirer: { name: 'Johny Smith', phone: '555-0100', email: 'johny@example.com' },
  trip: {
    tripType: 'round' as const,
    segments: [{ from: 'IAH', to: 'LAX', date: '2026-07-08' }],
    pax: { adults: 1, children: 0, infants: 0 },
    cabins: [],
    preferredAirlines: [],
  },
  notes: 'Morning preferred',
  status: 'New',
  fareOptions: [
    {
      airlineCode: 'NK',
      airlineName: 'Spirit Airlines',
      prices: { adult: 220 },
      segments: [{ from: 'IAH', to: 'LAX', date: '2026-07-08' }],
    },
  ],
  quoteSentAt: null,
  createdAt: '2026-07-12T10:00:00.000Z',
};

function signIn(permissions: UserPermissions, role: 'agent' | 'admin' = 'agent') {
  useAuthStore.getState().setSession('token', {
    id: 'u1', name: 'Agent', email: 'a@a.test', role, permissions,
  });
}

beforeEach(() => {
  vi.mocked(enquiriesApi.getEnquiry).mockResolvedValue(ENQUIRY);
});

/**
 * The enquiry-mutating affordances all issue the same PATCH /api/enquiries/:id, which is now
 * gated by `enquiries.edit`. Showing a control that can only ever 403 is a dead end, so each
 * one is hidden rather than left to fail on click.
 */
describe('EnquiryDetailPage edit affordances honour enquiries.edit', () => {
  it('hides the Edit button from an agent without enquiries.edit', async () => {
    signIn(NO_PERMISSIONS);
    renderWithClient(<EnquiryDetailPage />);

    await screen.findByRole('heading', { name: /Enquiry — Johny Smith/ });
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('hides the status picker from an agent without enquiries.edit', async () => {
    signIn(NO_PERMISSIONS);
    renderWithClient(<EnquiryDetailPage />);

    await screen.findByRole('heading', { name: /Enquiry — Johny Smith/ });
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });

  it('hides the per-fare-option edit control from an agent without enquiries.edit', async () => {
    signIn(NO_PERMISSIONS);
    renderWithClient(<EnquiryDetailPage />);

    await screen.findByText(/Spirit Airlines/);
    expect(screen.queryByRole('button', { name: 'Edit option 1' })).not.toBeInTheDocument();
  });

  it('shows the Edit button to an agent that holds enquiries.edit', async () => {
    signIn({ ...NO_PERMISSIONS, enquiries: { sendQuote: false, edit: true, delete: false } });
    renderWithClient(<EnquiryDetailPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument());
  });

  it('shows the Edit button to an admin, who holds it by role', async () => {
    signIn(NO_PERMISSIONS, 'admin');
    renderWithClient(<EnquiryDetailPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument());
  });
});
