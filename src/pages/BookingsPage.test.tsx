import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import BookingsPage from './BookingsPage';
import * as bookingsApi from '../api/bookings.api';
import * as customersApi from '../api/customers.api';
import * as flightDataApi from '../api/flightData.api';
import * as organizationApi from '../api/organization.api';
import { useAuthStore } from '../stores/authStore';

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
  bookingType: 'New',
  bookingId: 'bk0',
};

describe('BookingsPage', () => {
  beforeEach(() => {
    vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
      bookings: [BASE_ROW],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    // The airport/airline autocomplete fields fire server searches while typing city/airline
    // values in Create Booking tests — stub them to keep those tests offline.
    vi.spyOn(flightDataApi, 'searchAirports').mockResolvedValue([]);
    vi.spyOn(flightDataApi, 'searchAirlines').mockResolvedValue([]);
  });

  it('lists bookings with the requested columns, with Departure City hidden by default', async () => {
    renderWithClient(<BookingsPage />);
    expect(await screen.findByText('0000150')).toBeInTheDocument();
    expect(screen.getByText(/JOSEPH\/SHINY S/)).toBeInTheDocument();
    expect(screen.getByText('GUDBFX')).toBeInTheDocument();
    expect(screen.getByText('QR')).toBeInTheDocument();
    expect(screen.queryByText('DXB')).not.toBeInTheDocument();
    expect(screen.getByText('COK')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Handle with care')).toBeInTheDocument();
    expect(screen.queryByText(/due/)).not.toBeInTheDocument();
  });

  it('can re-show the hidden Departure City column via the View dropdown', async () => {
    renderWithClient(<BookingsPage />);
    await screen.findByText('0000150');

    await userEvent.click(screen.getByRole('button', { name: 'View' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Departure City' }));

    expect(await screen.findByText('DXB')).toBeInTheDocument();
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

  it('offers "+ Add new customer" in the passenger autocomplete once 3+ letters are typed', async () => {
    vi.spyOn(customersApi, 'searchCustomers').mockResolvedValue([]);
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Passenger name'), 'Zed');

    expect(await screen.findByRole('button', { name: '+ Add new customer' })).toBeInTheDocument();
  });

  it('creates a customer inline and fills the passenger name, preserving typed booking fields', async () => {
    vi.spyOn(customersApi, 'searchCustomers').mockResolvedValue([]);
    vi.spyOn(customersApi, 'createCustomer').mockResolvedValue({ id: 'c9' });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Invoice number'), '0000300');
    await userEvent.type(screen.getByLabelText('Passenger name'), 'Zed');
    await userEvent.click(await screen.findByRole('button', { name: '+ Add new customer' }));

    // The nested customer dialog is open
    expect(await screen.findByText('Add customer')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('First name'), 'Zed');
    await userEvent.type(screen.getByLabelText('Last name'), 'Newman');
    await userEvent.type(screen.getByLabelText('Date of birth'), '1990-01-01');
    await userEvent.type(screen.getByLabelText('Phone'), '555-0199');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(customersApi.createCustomer).toHaveBeenCalled();
      expect(screen.getByLabelText('Passenger name')).toHaveValue('Zed Newman');
    });
    // Booking dialog context preserved
    expect(screen.getByLabelText('Invoice number')).toHaveValue('0000300');
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
    await userEvent.type(screen.getByLabelText('Departure Date'), '2026-06-01');
    await userEvent.type(screen.getByLabelText('Arrival Date'), '2026-06-10');
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

  it('suggests airlines/airports while typing and stores the picked code', async () => {
    vi.spyOn(flightDataApi, 'searchAirlines').mockResolvedValue([{ code: 'QR', label: 'Qatar Airways' }]);
    vi.spyOn(flightDataApi, 'searchAirports').mockResolvedValue([
      { code: 'ORD', label: "Chicago O'Hare International Airport", sublabel: 'Chicago, United States' },
    ]);
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Airline code'), 'Qatar');
    await userEvent.click(await screen.findByText('Qatar Airways (QR)'));
    expect(screen.getByLabelText('Airline code')).toHaveValue('QR');

    await userEvent.type(screen.getByLabelText('Departure city'), 'Chicago');
    expect(await screen.findByText('Chicago, United States')).toBeInTheDocument();
    await userEvent.click(screen.getByText("Chicago O'Hare International Airport (ORD)"));
    expect(screen.getByLabelText('Departure city')).toHaveValue('ORD');
  });

  it('creates a booking with multiple passengers, each with its own amount', async () => {
    vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({
      id: 'b7',
      invoiceNumber: '0000210',
      passengers: [
        { id: 'p11', passengerName: 'JOSEPH/SHINY S', amount: 2400 },
        { id: 'p12', passengerName: 'JOSEPH/ANTON', amount: 1800 },
      ],
    });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Invoice number'), '0000210');
    await userEvent.type(screen.getByLabelText('PNR'), 'GUDBFX');
    await userEvent.type(screen.getByLabelText('Airline code'), 'QR');
    await userEvent.type(screen.getByLabelText('Passenger name'), 'JOSEPH/SHINY S');
    await userEvent.type(screen.getByLabelText('Amount'), '2400');

    await userEvent.click(screen.getByRole('button', { name: 'Add passenger' }));
    await userEvent.type(screen.getByLabelText('Passenger name 2'), 'JOSEPH/ANTON');
    await userEvent.type(screen.getByLabelText('Amount 2'), '1800');

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));

    await waitFor(() => {
      const [firstCallArgs] = vi.mocked(bookingsApi.createBooking).mock.calls[0];
      expect(firstCallArgs.passengers).toEqual([
        { passengerName: 'JOSEPH/SHINY S', amount: 2400 },
        { passengerName: 'JOSEPH/ANTON', amount: 1800 },
      ]);
    });
  });

  it('removes an added passenger row before submit', async () => {
    vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({
      id: 'b8',
      invoiceNumber: '0000211',
      passengers: [{ id: 'p13', passengerName: 'SOLO/PAX', amount: 100 }],
    });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    expect(screen.getByRole('button', { name: 'Remove passenger 1' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Add passenger' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove passenger 2' }));
    expect(screen.queryByLabelText('Passenger name 2')).not.toBeInTheDocument();
  });

  it('requires and submits an Amount owed value when Payment status is Pending', async () => {
    vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({
      id: 'b4',
      invoiceNumber: '0000202',
      passengers: [{ id: 'p4', passengerName: 'PEND/PAX', amount: 500 }],
    });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Invoice number'), '0000202');
    await userEvent.type(screen.getByLabelText('PNR'), 'ABC123');
    await userEvent.type(screen.getByLabelText('Airline code'), 'QR');
    await userEvent.type(screen.getByLabelText('Passenger name'), 'PEND/PAX');
    await userEvent.type(screen.getByLabelText('Amount'), '500');
    await userEvent.click(screen.getByRole('combobox', { name: 'Payment status' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Pending' }));
    await userEvent.type(screen.getByLabelText('Amount owed'), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));

    await waitFor(() => {
      expect(bookingsApi.createBooking).toHaveBeenCalled();
      const [firstCallArgs] = vi.mocked(bookingsApi.createBooking).mock.calls[0];
      expect(firstCallArgs.payment).toEqual({ status: 'pending', type: 'card', amount: 200 });
    });
  });

  it('hides Amount owed and submits amount 0 when Payment status is Paid', async () => {
    vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({
      id: 'b5',
      invoiceNumber: '0000203',
      passengers: [{ id: 'p5', passengerName: 'PAID/PAX', amount: 500 }],
    });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.type(screen.getByLabelText('Invoice number'), '0000203');
    await userEvent.type(screen.getByLabelText('PNR'), 'ABC123');
    await userEvent.type(screen.getByLabelText('Airline code'), 'QR');
    await userEvent.type(screen.getByLabelText('Passenger name'), 'PAID/PAX');
    await userEvent.type(screen.getByLabelText('Amount'), '500');
    expect(screen.queryByLabelText('Amount owed')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));

    await waitFor(() => {
      expect(bookingsApi.createBooking).toHaveBeenCalled();
      const [firstCallArgs] = vi.mocked(bookingsApi.createBooking).mock.calls[0];
      expect(firstCallArgs.payment).toEqual({ status: 'paid', type: 'card', amount: 0 });
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
    await userEvent.type(screen.getByLabelText('Departure Date'), '2026-06-01');
    await userEvent.type(screen.getByLabelText('Arrival Date'), '2026-06-10');
    await userEvent.type(screen.getByLabelText('Passenger name'), 'NEW/PAX');
    await userEvent.type(screen.getByLabelText('Amount'), '500');
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));

    await waitFor(() => {
      expect(bookingsApi.createBooking).toHaveBeenCalled();
      const [firstCallArgs] = vi.mocked(bookingsApi.createBooking).mock.calls[0];
      expect(firstCallArgs.depCity).toBeUndefined();
    });
  });

  it('hides trip and payment fields and submits voided:true when Mark as voided is checked', async () => {
    vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({
      id: 'b6',
      invoiceNumber: 'VOID-UI-1',
      passengers: [{ id: 'p6', passengerName: 'VOID/PAX', amount: 0 }],
    });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mark as voided' }));

    expect(screen.queryByLabelText('PNR')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Airline code')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Departure city')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Arrival city')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Departure Date')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Arrival Date')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Payment status')).not.toBeInTheDocument();
    // The Passengers section is hidden too — a placeholder VOID passenger is submitted instead.
    expect(screen.queryByLabelText('Passenger name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Invoice number'), 'VOID-UI-1');
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));

    await waitFor(() => {
      expect(bookingsApi.createBooking).toHaveBeenCalled();
      const [firstCallArgs] = vi.mocked(bookingsApi.createBooking).mock.calls[0];
      expect(firstCallArgs).toEqual(
        expect.objectContaining({
          invoiceNumber: 'VOID-UI-1',
          voided: true,
          pnr: undefined,
          airlineCode: undefined,
          depCity: undefined,
          arrCity: undefined,
          depDate: undefined,
          arrDate: undefined,
          payment: undefined,
          passengers: [{ passengerName: 'VOID', amount: 0 }],
        })
      );
    });
  });

  it('leaves the full form visible and submits voided:false by default', async () => {
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    expect(screen.getByLabelText('PNR')).toBeInTheDocument();
    expect(screen.getByLabelText('Payment status')).toBeInTheDocument();
  });

  it('defaults the Create Booking dialog to a New booking with the standard form', async () => {
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));

    expect(screen.getByRole('combobox', { name: 'Booking type' })).toHaveTextContent('New');
    expect(screen.getByLabelText('Invoice number')).toBeInTheDocument();
    expect(screen.queryByLabelText('Original PNR')).not.toBeInTheDocument();
  });

  it('switches to the adjustment form when Booking type is Reissue', async () => {
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Booking type' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Reissue' }));

    expect(screen.getByLabelText('Original PNR')).toBeInTheDocument();
    expect(screen.queryByLabelText('Invoice number')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Mark as voided' })).not.toBeInTheDocument();
  });

  it('switches to the adjustment form when Booking type is Refund', async () => {
    renderWithClient(<BookingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create booking' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Booking type' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Refund' }));

    expect(screen.getByLabelText('Original PNR')).toBeInTheDocument();
    expect(screen.queryByLabelText('Invoice number')).not.toBeInTheDocument();
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
          bookingType: 'New',
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

  it('shows the outstanding amount under a Pending payment badge', async () => {
    vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
      bookings: [{ ...BASE_ROW, id: 'p6', paymentStatus: 'pending', paymentAmount: 150, bookingType: 'New', bookingId: 'bk1' }],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderWithClient(<BookingsPage />);
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('$150.00 due')).toBeInTheDocument();
  });

  it('no longer offers a Reissue/Refund action on table rows', async () => {
    renderWithClient(<BookingsPage />);
    await screen.findByText('0000150');
    expect(screen.queryByRole('button', { name: /Reissue\/Refund/ })).not.toBeInTheDocument();
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

  it('opens the Voided Invoices dialog and lists only voided invoices', async () => {
    vi.spyOn(bookingsApi, 'listBookings').mockImplementation((params = {}) => {
      if (params.voided) {
        return Promise.resolve({
          bookings: [{
            ...BASE_ROW, id: 'pv1', invoiceNumber: 'VOID-100', bookingDate: '2026-06-01',
            remark: 'Duplicate print', voided: true,
          }],
          total: 1, page: 1, pageSize: 25,
        });
      }
      return Promise.resolve({ bookings: [BASE_ROW], total: 1, page: 1, pageSize: 25 });
    });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Voided Invoices' }));

    expect(await screen.findByText('VOID-100')).toBeInTheDocument();
    expect(screen.getByText('Duplicate print')).toBeInTheDocument();
    expect(vi.mocked(bookingsApi.listBookings)).toHaveBeenCalledWith(expect.objectContaining({ voided: true }));
  });

  it('opens the Send Invoice dialog from the toolbar', async () => {
    vi.spyOn(organizationApi, 'getBranding').mockResolvedValue({
      name: 'Alamo Travels',
      tagline: 'Internal CRM',
      logoUrl: null,
      invoiceTerms: null,
    });
    renderWithClient(<BookingsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Send Invoice' }));

    expect(await screen.findByLabelText('To email')).toBeInTheDocument();
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

  it('does not show Record Payment without an authenticated bookings.edit user', async () => {
    vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
      bookings: [{ ...BASE_ROW, id: 'p7', paymentStatus: 'pending', paymentAmount: 150, bookingType: 'New', bookingId: 'bk1' }],
      total: 1, page: 1, pageSize: 25,
    });
    renderWithClient(<BookingsPage />);
    await screen.findByText('0000150');
    // "Record payment" is a menuitem that isn't mounted until the row-actions dropdown opens, so
    // asserting it's absent proves nothing on its own. The real invariant for a user with neither
    // canEdit nor canDelete is that the row-actions trigger itself never renders at all
    // (booking-row-actions.tsx returns null in that case).
    expect(screen.queryByRole('button', { name: /Row actions for/ })).not.toBeInTheDocument();
  });

  describe('as an admin (bookings.edit)', () => {
    beforeEach(() => {
      useAuthStore.setState({
        accessToken: 't',
        user: { id: 'u1', name: 'Admin User', email: 'admin@alamo.test', role: 'admin' },
      });
    });

    afterEach(() => {
      // Unmount before resetting the store: BookingsTable subscribes to useAuthStore
      // directly, so resetting the store while it's still mounted (RTL's automatic
      // cleanup runs after this hook, since it's registered outside any describe)
      // would otherwise update it outside of an act() wrapper.
      cleanup();
      useAuthStore.setState({ accessToken: null, user: null });
    });

    it('shows Record Payment only on pending rows, and routes a New row to the booking payment endpoint', async () => {
      vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
        bookings: [{ ...BASE_ROW, id: 'p8', paymentStatus: 'pending', paymentAmount: 150, bookingType: 'New', bookingId: 'bk1' }],
        total: 1, page: 1, pageSize: 25,
      });
      const updateSpy = vi.spyOn(bookingsApi, 'updateBookingPayment').mockResolvedValue(undefined);
      renderWithClient(<BookingsPage />);

      await screen.findByText('0000150');
      await userEvent.click(screen.getByRole('button', { name: /Row actions for/ }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Record payment' }));
      await userEvent.clear(screen.getByLabelText('Amount owed'));
      await userEvent.type(screen.getByLabelText('Amount owed'), '50');
      await userEvent.click(screen.getByRole('button', { name: 'Save payment' }));

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith('bk1', { status: 'pending', type: 'card', amount: 50 });
      });
    });

    it('routes a Reissue/Refund row to the passenger payment endpoint', async () => {
      vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
        bookings: [{ ...BASE_ROW, id: 'p9', paymentStatus: 'pending', paymentAmount: 80, bookingType: 'Reissue', bookingId: undefined }],
        total: 1, page: 1, pageSize: 25,
      });
      const updateSpy = vi.spyOn(bookingsApi, 'updatePassengerPayment').mockResolvedValue(undefined);
      renderWithClient(<BookingsPage />);

      await screen.findByText('0000150');
      await userEvent.click(screen.getByRole('button', { name: /Row actions for/ }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Record payment' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save payment' }));

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith('p9', { status: 'pending', type: 'card', amount: 80 });
      });
    });

    it('does not show Record Payment on a Paid row', async () => {
      renderWithClient(<BookingsPage />);
      await screen.findByText('0000150');
      // BASE_ROW is paymentStatus: 'paid' — open the menu (this admin CAN see it, unlike the
      // unauthenticated-user test above) and assert the "pending only" item is missing from it,
      // rather than asserting on a button that was never going to render regardless of the gate.
      await userEvent.click(screen.getByRole('button', { name: /Row actions for/ }));
      expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Record payment' })).not.toBeInTheDocument();
    });

    it('pre-fills Payment type and Paid on from the row, and submits the edited values', async () => {
      vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
        bookings: [{
          ...BASE_ROW, id: 'p10', paymentStatus: 'pending', paymentAmount: 150,
          paymentType: 'cash', paymentPaidOn: '2026-05-01', bookingType: 'New', bookingId: 'bk1',
        }],
        total: 1, page: 1, pageSize: 25,
      });
      const updateSpy = vi.spyOn(bookingsApi, 'updateBookingPayment').mockResolvedValue(undefined);
      renderWithClient(<BookingsPage />);

      await screen.findByText('0000150');
      await userEvent.click(screen.getByRole('button', { name: /Row actions for/ }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Record payment' }));

      expect(screen.getByRole('combobox', { name: 'Payment type' })).toHaveTextContent('Cash');
      expect(screen.getByLabelText('Paid on')).toHaveValue('2026-05-01');

      await userEvent.click(screen.getByRole('combobox', { name: 'Payment type' }));
      await userEvent.click(await screen.findByRole('option', { name: 'Check' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save payment' }));

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith('bk1', { status: 'pending', type: 'check', amount: 150, paidOn: '2026-05-01' });
      });
    });

    // The table is one row per PASSENGER, not one per invoice. On a New row: Edit opens the
    // WHOLE invoice (routed by bookingId), "Delete passenger" removes ONLY that passenger
    // (routed by the passenger's own id), and "Delete invoice" removes the header + every
    // passenger (routed by bookingId again). On a Reissue/Refund row, Edit and Delete both act
    // on the adjustment itself (routed by the passenger id, since an adjustment has no bookingId).
    // Fixture below uses a passenger id ('p8') that is clearly distinct from the booking id
    // ('bk1') so routing the wrong one is unmistakable.
    describe('row-action id routing (New vs Reissue/Refund)', () => {
      it('"Delete passenger" on a New row calls deletePassenger with the passenger id, not deleteBooking', async () => {
        vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
          bookings: [{ ...BASE_ROW, id: 'p8', bookingId: 'bk1', bookingType: 'New' }],
          total: 1, page: 1, pageSize: 25,
        });
        const deletePassengerSpy = vi.spyOn(bookingsApi, 'deletePassenger').mockResolvedValue(undefined);
        const deleteBookingSpy = vi.spyOn(bookingsApi, 'deleteBooking').mockResolvedValue(undefined);
        renderWithClient(<BookingsPage />);

        await screen.findByText('0000150');
        await userEvent.click(screen.getByRole('button', { name: /Row actions for/ }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete passenger' }));
        await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        await waitFor(() => {
          expect(deletePassengerSpy).toHaveBeenCalledWith('p8');
        });
        expect(deleteBookingSpy).not.toHaveBeenCalled();
      });

      it('"Delete invoice #N" on a New row calls deleteBooking with the booking id, not deletePassenger', async () => {
        vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
          bookings: [{ ...BASE_ROW, id: 'p8', bookingId: 'bk1', bookingType: 'New' }],
          total: 1, page: 1, pageSize: 25,
        });
        const deletePassengerSpy = vi.spyOn(bookingsApi, 'deletePassenger').mockResolvedValue(undefined);
        const deleteBookingSpy = vi.spyOn(bookingsApi, 'deleteBooking').mockResolvedValue(undefined);
        renderWithClient(<BookingsPage />);

        await screen.findByText('0000150');
        await userEvent.click(screen.getByRole('button', { name: /Row actions for/ }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete invoice #0000150' }));
        await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        await waitFor(() => {
          expect(deleteBookingSpy).toHaveBeenCalledWith('bk1');
        });
        expect(deletePassengerSpy).not.toHaveBeenCalled();
      });

      it('Edit on a New row calls getBooking with the booking id (the whole invoice), not getAdjustment', async () => {
        vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
          bookings: [{ ...BASE_ROW, id: 'p8', bookingId: 'bk1', bookingType: 'New' }],
          total: 1, page: 1, pageSize: 25,
        });
        const getBookingSpy = vi.spyOn(bookingsApi, 'getBooking').mockResolvedValue({
          booking: { id: 'bk1', invoiceNumber: '0000150', bookingDate: '2026-05-04', voided: false },
          passengers: [{ id: 'p8', passengerName: 'JOSEPH/SHINY S', amount: 2400.02 }],
        });
        const getAdjustmentSpy = vi.spyOn(bookingsApi, 'getAdjustment');
        renderWithClient(<BookingsPage />);

        await screen.findByText('0000150');
        await userEvent.click(screen.getByRole('button', { name: /Row actions for/ }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));

        await waitFor(() => {
          expect(getBookingSpy).toHaveBeenCalledWith('bk1');
        });
        expect(getAdjustmentSpy).not.toHaveBeenCalled();
      });

      it('Edit on a Reissue row calls getAdjustment with the passenger id, not getBooking', async () => {
        vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
          bookings: [{ ...BASE_ROW, id: 'p8', bookingType: 'Reissue', bookingId: undefined }],
          total: 1, page: 1, pageSize: 25,
        });
        const getAdjustmentSpy = vi.spyOn(bookingsApi, 'getAdjustment').mockResolvedValue({
          id: 'p8',
          bookingType: 'Reissue',
          passengerName: 'JOSEPH/SHINY S',
          parentRef: 'bk1',
          bookingDate: '2026-05-04',
          amount: 2400.02,
          pnr: 'GUDBFX',
          payment: { status: 'paid', type: 'card', amount: 0 },
        });
        const getBookingSpy = vi.spyOn(bookingsApi, 'getBooking');
        renderWithClient(<BookingsPage />);

        await screen.findByText('0000150');
        await userEvent.click(screen.getByRole('button', { name: /Row actions for/ }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));

        await waitFor(() => {
          expect(getAdjustmentSpy).toHaveBeenCalledWith('p8');
        });
        expect(getBookingSpy).not.toHaveBeenCalled();
      });

      it('does not offer "Delete invoice" on a Reissue row\'s menu', async () => {
        vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
          bookings: [{ ...BASE_ROW, id: 'p8', bookingType: 'Reissue', bookingId: undefined }],
          total: 1, page: 1, pageSize: 25,
        });
        renderWithClient(<BookingsPage />);

        await screen.findByText('0000150');
        await userEvent.click(screen.getByRole('button', { name: /Row actions for/ }));

        // Its own delete item is labeled "Delete reissue" (row-scoped) — confirm the menu did
        // open and rendered, so the absence check below isn't vacuous.
        expect(await screen.findByRole('menuitem', { name: 'Delete reissue' })).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /Delete invoice/ })).not.toBeInTheDocument();
      });
    });
  });
});
