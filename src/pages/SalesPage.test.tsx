import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { toast } from 'sonner';
import SalesPage from './SalesPage';
import * as bookingsApi from '../api/bookings.api';
import * as salesApi from '../api/sales.api';
import * as organizationApi from '../api/organization.api';
import { agencyYearMonth } from '../utils/agencyTime';
import { useAuthStore } from '../stores/authStore';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const SUPERADMIN = { id: 'u0', name: 'Super', email: 'super@a.test', role: 'superadmin' as const };

const BASE_ROW: bookingsApi.BookingRow = {
  id: 'p1',
  invoiceNumber: '0000150',
  bookingDate: '2026-07-04',
  passengerName: 'JOSEPH/SHINY S',
  amount: 2400.02,
  pnr: 'GUDBFX',
  airlineCode: 'EK',
  paymentStatus: 'paid',
  bookingType: 'New',
};

const SUMMARY: salesApi.SalesSummary = {
  year: 2026, month: 7, isCurrentMonth: true,
  revenue: 400, lastMonthRevenue: 200, lastMonthChangePct: 100,
  lastYearRevenue: 800, lastYearChangePct: -50,
  topAirline: { code: 'QR', count: 2 }, refundCount: 1,
  avgBookingValue: 150, pendingCount: 3, pendingAmount: 90,
};

describe('SalesPage', () => {
  beforeEach(() => {
    vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({ bookings: [BASE_ROW], total: 1, page: 1, pageSize: 15 });
    vi.spyOn(salesApi, 'getSalesSummary').mockResolvedValue(SUMMARY);
    // SalesPage reads the agency timezone from branding to pick its default month.
    vi.spyOn(organizationApi, 'getBranding').mockResolvedValue({
      name: 'Alamo Travels', tagline: 'Internal CRM', logoUrl: null, invoiceTerms: null, timeZone: 'America/Chicago',
    });
    // A superadmin by default so the Print report button (data.viewReports-gated) is visible for
    // every pre-existing behavioral test below. The gating test overrides this with its own
    // useAuthStore.setState(...) before rendering.
    useAuthStore.setState({ accessToken: 't', user: SUPERADMIN });
  });

  // Unmount before resetting the store: BookingsTable subscribes to useAuthStore directly, so
  // resetting it while still mounted would update the store outside act() (RTL's own auto-cleanup
  // afterEach is registered outside any describe and always runs after this one).
  afterEach(() => {
    cleanup();
    useAuthStore.setState({ accessToken: null, user: null });
  });

  // The page derives its default month from the agency timezone, so the expectation must use the
  // SAME helper — computing it in UTC would flake at a month boundary.
  const agencyNow = () => agencyYearMonth('America/Chicago');

  it('renders the summary cards', async () => {
    renderWithClient(<SalesPage />);
    expect(await screen.findByText('$400.00')).toBeInTheDocument();
    expect(screen.getByText('+100%')).toBeInTheDocument();
    expect(screen.getByText('-50%')).toBeInTheDocument();
    expect(screen.getByText('QR')).toBeInTheDocument();
  });

  it('renders the bookings table scoped to the selected month', async () => {
    renderWithClient(<SalesPage />);
    expect(await screen.findByText('0000150')).toBeInTheDocument();
    expect(screen.getByText(/JOSEPH\/SHINY S/)).toBeInTheDocument();
  });

  it('defaults to the agency current month/year and page size 15', async () => {
    const { year: expectedYear, month: expectedMonth } = agencyNow();
    renderWithClient(<SalesPage />);
    await screen.findByText('0000150');
    expect(salesApi.getSalesSummary).toHaveBeenCalledWith(expectedYear, expectedMonth);
    const lastCall = vi.mocked(bookingsApi.listBookings).mock.calls.slice(-1)[0]?.[0];
    expect(lastCall).toMatchObject({ year: expectedYear, month: expectedMonth, pageSize: 15 });
  });

  it('disables stepping to a future month/year from the default (current month) view', async () => {
    renderWithClient(<SalesPage />);
    await screen.findByText('0000150');
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
  });

  it('stepping the month toggle backward requests the previous month for both the cards and the table', async () => {
    const { year: expectedYear, month: expectedMonth } = agencyNow();
    const prevMonth = expectedMonth === 1 ? 12 : expectedMonth - 1;
    const prevYear = expectedMonth === 1 ? expectedYear - 1 : expectedYear;

    renderWithClient(<SalesPage />);
    await screen.findByText('0000150');
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    await waitFor(() => {
      expect(salesApi.getSalesSummary).toHaveBeenLastCalledWith(prevYear, prevMonth);
      const lastCall = vi.mocked(bookingsApi.listBookings).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ year: prevYear, month: prevMonth });
    });
  });

  it('debounces the search box into a server-side q param', async () => {
    renderWithClient(<SalesPage />);
    await screen.findByText('0000150');
    await userEvent.type(screen.getByLabelText('Search bookings'), 'GUD');

    await waitFor(() => {
      const lastCall = vi.mocked(bookingsApi.listBookings).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ q: 'GUD' });
    });
  });

  it('filters by payment status via the faceted filter', async () => {
    renderWithClient(<SalesPage />);
    await screen.findByText('0000150');
    await userEvent.click(screen.getByRole('button', { name: /Payment Status/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Pending' }));

    await waitFor(() => {
      const lastCall = vi.mocked(bookingsApi.listBookings).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ paymentStatus: 'pending' });
    });
  });

  it('downloads the report for the selected month when Print report is clicked', async () => {
    const spy = vi.spyOn(salesApi, 'getSalesReport').mockResolvedValue();
    const { year: expectedYear, month: expectedMonth } = agencyNow();
    renderWithClient(<SalesPage />);
    await screen.findByText('0000150');

    const btn = await screen.findByRole('button', { name: /print report/i });
    await userEvent.click(btn);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expectedYear, expectedMonth);
  });

  it('toasts an error when the report download fails', async () => {
    vi.spyOn(salesApi, 'getSalesReport').mockRejectedValue(new Error('x'));
    const errorSpy = vi.spyOn(toast, 'error');
    renderWithClient(<SalesPage />);
    await screen.findByText('0000150');

    const btn = await screen.findByRole('button', { name: /print report/i });
    await userEvent.click(btn);

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
  });

  it('hides the Print report button for a user without data.viewReports', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: {
        id: 'u2',
        name: 'Agent',
        email: 'agent@a.test',
        role: 'agent',
        permissions: {
          bookings: {
            create: false, edit: false, delete: false, createAdjustment: false,
            viewAll: false, import: false, export: false, sendInvoice: false,
          },
          customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: false },
          groups: { createShared: false },
          data: { viewReports: false },
          enquiries: { sendQuote: false },
        },
      },
    });
    renderWithClient(<SalesPage />);
    await screen.findByText('0000150');
    expect(screen.queryByRole('button', { name: /print report/i })).not.toBeInTheDocument();
  });
});
