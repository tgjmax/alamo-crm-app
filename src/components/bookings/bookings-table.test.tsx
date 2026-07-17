import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { BookingsTable } from './bookings-table';
import * as bookingsApi from '@/api/bookings.api';
import { useAuthStore } from '@/stores/authStore';

const SUPERADMIN = { id: 'u0', name: 'Super', email: 'super@a.test', role: 'superadmin' as const };

const BASE_ROW: bookingsApi.BookingRow = {
  id: 'p1',
  invoiceNumber: '0000150',
  bookingDate: '2026-05-04',
  passengerName: 'JOSEPH/SHINY S',
  amount: 2400.02,
  pnr: 'GUDBFX',
  airlineCode: 'QR',
  depCity: 'DXB',
  arrCity: 'COK',
  depDate: '2026-05-08',
  arrDate: '2026-05-28',
  remark: 'Handle with care',
  paymentStatus: 'paid',
  bookingType: 'New',
  bookingId: 'bk0',
};

function renderTable() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <BookingsTable queryKeyPrefix="bookings" defaultPageSize={25} />
    </QueryClientProvider>
  );
}

describe('BookingsTable', () => {
  beforeEach(() => {
    vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
      bookings: [BASE_ROW],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    useAuthStore.setState({ accessToken: 't', user: SUPERADMIN });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it('shows skeleton rows while bookings are loading', () => {
    vi.mocked(bookingsApi.listBookings).mockReturnValue(new Promise(() => {}));
    renderTable();
    expect(screen.getAllByTestId('table-skeleton-row').length).toBeGreaterThan(0);
    expect(screen.queryByText('No bookings found.')).not.toBeInTheDocument();
  });

  it('lists bookings once loaded', async () => {
    renderTable();
    expect(await screen.findByText('0000150')).toBeInTheDocument();
    expect(screen.queryAllByTestId('table-skeleton-row').length).toBe(0);
  });
});
