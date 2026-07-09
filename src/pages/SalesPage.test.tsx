import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import SalesPage from './SalesPage';
import * as bookingsApi from '../api/bookings.api';
import * as salesApi from '../api/sales.api';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

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
  });

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

  it('defaults to the current UTC month/year and page size 15', async () => {
    const now = new Date();
    const expectedYear = now.getUTCFullYear();
    const expectedMonth = now.getUTCMonth() + 1;
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
    const now = new Date();
    const expectedYear = now.getUTCFullYear();
    const expectedMonth = now.getUTCMonth() + 1;
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
});
