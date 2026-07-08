import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import BookingsPage from './BookingsPage';
import * as bookingsApi from '../api/bookings.api';
import * as customersApi from '../api/customers.api';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

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
};

describe('BookingsPage', () => {
  beforeEach(() => {
    vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
      bookings: [BASE_ROW],
      total: 1,
      page: 1,
      pageSize: 25,
    });
  });

  it('lists bookings with the requested columns', async () => {
    renderWithClient(<BookingsPage />);
    expect(await screen.findByText('0000150')).toBeInTheDocument();
    expect(screen.getByText(/JOSEPH\/SHINY S/)).toBeInTheDocument();
    expect(screen.getByText('GUDBFX')).toBeInTheDocument();
    expect(screen.getByText('QR')).toBeInTheDocument();
    expect(screen.getByText('DXB')).toBeInTheDocument();
    expect(screen.getByText('COK')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Handle with care')).toBeInTheDocument();
  });

  it('displays the booking, departure, and arrival dates as "DD Mon YYYY"', async () => {
    renderWithClient(<BookingsPage />);
    expect(await screen.findByText('04 May 2026')).toBeInTheDocument();
    expect(screen.getByText('08 May 2026')).toBeInTheDocument();
    expect(screen.getByText('28 May 2026')).toBeInTheDocument();
  });

  it('debounces the search box into a server-side q param', async () => {
    renderWithClient(<BookingsPage />);
    await userEvent.type(screen.getByLabelText('Search bookings'), 'GUD');

    await waitFor(() => {
      const lastCall = vi.mocked(bookingsApi.listBookings).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ q: 'GUD' });
    });
  });

  it('filters by payment status via the faceted filter', async () => {
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: /Payment Status/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Pending' }));

    await waitFor(() => {
      const lastCall = vi.mocked(bookingsApi.listBookings).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ paymentStatus: 'pending' });
    });
  });

  it('sorts by Amount when its column header is clicked', async () => {
    renderWithClient(<BookingsPage />);
    await screen.findByText('0000150');
    await userEvent.click(screen.getByRole('button', { name: /Amount/ }));

    await waitFor(() => {
      const lastCall = vi.mocked(bookingsApi.listBookings).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ sortBy: 'amount', sortDir: 'asc' });
    });
  });

  it('changes rows per page via the pagination footer', async () => {
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Rows per page' }));
    await userEvent.click(await screen.findByRole('option', { name: '50' }));

    await waitFor(() => {
      const lastCall = vi.mocked(bookingsApi.listBookings).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ pageSize: 50 });
    });
  });

  it('paginates via numbered page links', async () => {
    vi.spyOn(bookingsApi, 'listBookings').mockImplementation((params = {}) =>
      Promise.resolve({
        bookings: [{ ...BASE_ROW, id: `p${params.page ?? 1}`, invoiceNumber: `INV-${params.page ?? 1}` }],
        total: 100,
        page: params.page ?? 1,
        pageSize: 25,
      })
    );
    renderWithClient(<BookingsPage />);

    expect(await screen.findByText('INV-1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: '2' }));
    expect(await screen.findByText('INV-2')).toBeInTheDocument();
  });

  it('applies airline and departure-date filters via the Filters popover', async () => {
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    await userEvent.type(await screen.findByLabelText('Airline'), 'QR');
    await userEvent.type(screen.getByLabelText('Departure date filter value'), '2026-05-01');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      const lastCall = vi.mocked(bookingsApi.listBookings).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({
        airlineCode: 'QR',
        depDate: { operator: 'before', from: '2026-05-01' },
      });
    });
  });

  it('shows matching customers when typing 3+ letters in the passenger name field', async () => {
    vi.spyOn(customersApi, 'searchCustomers').mockResolvedValue([
      { id: 'c1', firstName: 'Alexander', lastName: 'Varghese', phone: '555-0100' },
    ]);
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Passenger name'), 'Var');
    expect(await screen.findByText('Alexander Varghese')).toBeInTheDocument();
  });

  it('selecting a matched customer fills the passenger name field', async () => {
    vi.spyOn(customersApi, 'searchCustomers').mockResolvedValue([
      { id: 'c1', firstName: 'Alexander', lastName: 'Varghese', phone: '555-0100' },
    ]);
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Passenger name'), 'Var');
    await userEvent.click(await screen.findByText('Alexander Varghese'));
    expect(screen.getByLabelText('Passenger name')).toHaveValue('Alexander Varghese');
  });

  it('creates a booking on form submit', async () => {
    vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({
      id: 'b2',
      invoiceNumber: '0000200',
      passengers: [{ id: 'p2', passengerName: 'NEW/PAX', amount: 500 }],
    });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Invoice number'), '0000200');
    await userEvent.type(screen.getByLabelText('PNR'), 'ABC123');
    await userEvent.type(screen.getByLabelText('Airline code'), 'QR');
    await userEvent.type(screen.getByLabelText('Departure city'), 'DXB');
    await userEvent.type(screen.getByLabelText('Arrival city'), 'COK');
    await userEvent.type(screen.getByLabelText('Departure date'), '2026-06-01');
    await userEvent.type(screen.getByLabelText('Arrival date'), '2026-06-10');
    await userEvent.type(screen.getByLabelText('Passenger name'), 'NEW/PAX');
    await userEvent.type(screen.getByLabelText('Amount'), '500');
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));

    await waitFor(() => {
      expect(bookingsApi.createBooking).toHaveBeenCalled();
      const [firstCallArgs] = vi.mocked(bookingsApi.createBooking).mock.calls[0];
      expect(firstCallArgs).toEqual(
        expect.objectContaining({
          invoiceNumber: '0000200',
          pnr: 'ABC123',
          airlineCode: 'QR',
          depCity: 'DXB',
          arrCity: 'COK',
          passengers: [{ passengerName: 'NEW/PAX', amount: 500 }],
        })
      );
    });
  });

  it('creates a booking without a Departure city (historic data does not have it)', async () => {
    vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({
      id: 'b3',
      invoiceNumber: '0000201',
      passengers: [{ id: 'p3', passengerName: 'NEW/PAX', amount: 500 }],
    });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Invoice number'), '0000201');
    await userEvent.type(screen.getByLabelText('PNR'), 'ABC123');
    await userEvent.type(screen.getByLabelText('Airline code'), 'QR');
    await userEvent.type(screen.getByLabelText('Arrival city'), 'COK');
    await userEvent.type(screen.getByLabelText('Departure date'), '2026-06-01');
    await userEvent.type(screen.getByLabelText('Arrival date'), '2026-06-10');
    await userEvent.type(screen.getByLabelText('Passenger name'), 'NEW/PAX');
    await userEvent.type(screen.getByLabelText('Amount'), '500');
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));

    await waitFor(() => {
      expect(bookingsApi.createBooking).toHaveBeenCalled();
      const [firstCallArgs] = vi.mocked(bookingsApi.createBooking).mock.calls[0];
      expect(firstCallArgs.depCity).toBeUndefined();
    });
  });

  it('shows a dash for Payment Status on a voided booking with no payment on file', async () => {
    vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
      bookings: [
        {
          id: 'pv1',
          invoiceNumber: 'VOID-001',
          bookingDate: '2026-05-04',
          passengerName: 'JOSEPH/SHINY S',
          amount: 0,
          remark: 'VOID',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderWithClient(<BookingsPage />);
    expect(await screen.findByText('VOID-001')).toBeInTheDocument();
    expect(screen.getByText('VOID')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('creates a reissue adjustment for a passenger', async () => {
    vi.spyOn(bookingsApi, 'createAdjustment').mockResolvedValue({
      id: 'adj1',
      bookingType: 'Reissue',
      parentRef: 'p1',
      amount: 280,
    });
    renderWithClient(<BookingsPage />);

    await screen.findByText('0000150');
    await userEvent.click(screen.getByRole('button', { name: /Reissue\/Refund/ }));
    await userEvent.type(screen.getByLabelText('Adjustment booking date'), '2026-09-14');
    await userEvent.type(screen.getByLabelText('Adjustment PNR'), 'WXITNF');
    await userEvent.type(screen.getByLabelText('Adjustment airline code'), 'AF');
    await userEvent.type(screen.getByLabelText('Adjustment departure city'), 'DXB');
    await userEvent.type(screen.getByLabelText('Adjustment arrival city'), 'IAH');
    await userEvent.type(screen.getByLabelText('Adjustment departure date'), '2026-09-15');
    await userEvent.type(screen.getByLabelText('Adjustment arrival date'), '2026-09-16');
    await userEvent.type(screen.getByLabelText('Adjustment amount'), '280');
    await userEvent.click(screen.getByRole('button', { name: 'Save adjustment' }));

    await waitFor(() => {
      expect(bookingsApi.createAdjustment).toHaveBeenCalled();
      const [passengerId, payload] = vi.mocked(bookingsApi.createAdjustment).mock.calls[0];
      expect(passengerId).toBe('p1');
      expect(payload).toEqual(
        expect.objectContaining({
          bookingType: 'Reissue', bookingDate: '2026-09-14', amount: 280, pnr: 'WXITNF', airlineCode: 'AF', depCity: 'DXB',
        })
      );
    });
  });

  it('creates a refund adjustment for a passenger', async () => {
    vi.spyOn(bookingsApi, 'createAdjustment').mockResolvedValue({
      id: 'adj2',
      bookingType: 'Refund',
      parentRef: 'p1',
      amount: 150,
    });
    renderWithClient(<BookingsPage />);

    await screen.findByText('0000150');
    await userEvent.click(screen.getByRole('button', { name: /Reissue\/Refund/ }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Adjustment type' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Refund' }));
    await userEvent.type(screen.getByLabelText('Adjustment booking date'), '2026-09-14');
    await userEvent.type(screen.getByLabelText('Adjustment PNR'), 'WXITNF');
    await userEvent.type(screen.getByLabelText('Adjustment airline code'), 'AF');
    await userEvent.type(screen.getByLabelText('Adjustment departure city'), 'DXB');
    await userEvent.type(screen.getByLabelText('Adjustment arrival city'), 'IAH');
    await userEvent.type(screen.getByLabelText('Adjustment departure date'), '2026-09-15');
    await userEvent.type(screen.getByLabelText('Adjustment arrival date'), '2026-09-16');
    await userEvent.type(screen.getByLabelText('Adjustment amount'), '150');
    await userEvent.click(screen.getByRole('button', { name: 'Save adjustment' }));

    await waitFor(() => {
      expect(bookingsApi.createAdjustment).toHaveBeenCalled();
      const [passengerId, payload] = vi.mocked(bookingsApi.createAdjustment).mock.calls[0];
      expect(passengerId).toBe('p1');
      expect(payload).toEqual(
        expect.objectContaining({
          bookingType: 'Refund', bookingDate: '2026-09-14', amount: 150, pnr: 'WXITNF', airlineCode: 'AF', depCity: 'DXB',
        })
      );
    });
  });

  it('toggles column visibility via the View dropdown', async () => {
    renderWithClient(<BookingsPage />);
    await screen.findByText('0000150');

    await userEvent.click(screen.getByRole('button', { name: 'View' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Remark' }));

    await waitFor(() => {
      expect(screen.queryByText('Handle with care')).not.toBeInTheDocument();
    });
  });

  it('imports bookings via the Import Bookings dialog', async () => {
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Import Bookings' }));
    expect(await screen.findByLabelText('Booking import file')).toBeInTheDocument();
  });

  it('exports bookings via the Export dialog', async () => {
    vi.spyOn(bookingsApi, 'exportBookings').mockResolvedValue(undefined);
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(await screen.findByText('Export bookings')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(bookingsApi.exportBookings).toHaveBeenCalled());
  });

  it('shows an error in the export dialog when export fails', async () => {
    vi.spyOn(bookingsApi, 'exportBookings').mockRejectedValueOnce(new Error('network down'));
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(await screen.findByText('Export failed. Check your connection and try again.')).toBeInTheDocument();
  });
});
