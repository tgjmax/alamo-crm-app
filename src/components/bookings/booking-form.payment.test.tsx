import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingForm } from './booking-form';
import { BookingDetail, createBooking } from '@/api/bookings.api';
import { searchCustomers } from '@/api/customers.api';

vi.mock('@/api/bookings.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/bookings.api')>()),
  createBooking: vi.fn(),
  updateBooking: vi.fn(),
}));
vi.mock('@/api/flightData.api', () => ({
  searchAirports: vi.fn().mockResolvedValue([]),
  searchAirlines: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/api/customers.api', () => ({ searchCustomers: vi.fn().mockResolvedValue([]) }));

function renderForm(initial?: BookingDetail) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <BookingForm initial={initial} onDone={vi.fn()} onCancel={vi.fn()} />
    </QueryClientProvider>
  );
}

/** DateField's control is a visually-hidden native `<input type="date">` carrying the accessible
 * name; userEvent can't type into it, so set it the way a date picker would. */
function pickDate(label: string, iso: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: iso } });
}

const CUSTOMER_1 = { id: 'c1', firstName: 'Jane', lastName: 'Smith', phone: '555-0100', dob: '02-Sep-1953' };
const CUSTOMER_2 = { id: 'c2', firstName: 'John', lastName: 'Doe', phone: '555-0101', dob: '01-Jan-1990' };

async function fillTripFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Invoice#'), '000010');
  await user.type(screen.getByLabelText(/PNR/i), 'GUDBFX');
  await user.type(screen.getByLabelText(/Airline/i), 'QR');
  await user.type(screen.getByLabelText('Departure city'), 'ORD');
  await user.type(screen.getByLabelText('Arrival city'), 'COK');
  pickDate('Departure Date', '2026-01-10');
  pickDate('Arrival Date', '2026-01-20');
}

async function linkPassenger(user: ReturnType<typeof userEvent.setup>, label: string, customer: typeof CUSTOMER_1) {
  vi.mocked(searchCustomers).mockResolvedValue([customer]);
  await user.type(screen.getByLabelText(label), customer.firstName);
  await user.click(await screen.findByText(`${customer.lastName}/${customer.firstName}`));
}

async function selectOption(user: ReturnType<typeof userEvent.setup>, comboboxName: string, optionName: string) {
  await user.click(screen.getByRole('combobox', { name: comboboxName }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

function passenger(over: Partial<BookingDetail['passengers'][number]> = {}): BookingDetail['passengers'][number] {
  return {
    id: 'p1',
    passengerName: 'Smith/Jane',
    amount: 500,
    customer: 'c1',
    remark: '',
    payment: { status: 'paid', type: 'card', amount: 0 },
    ...over,
  };
}

function bookingDetail(passengers: BookingDetail['passengers']): BookingDetail {
  return {
    booking: {
      id: 'b1',
      invoiceNumber: '000010',
      bookingDate: '2026-01-10',
      voided: false,
      pnr: 'GUDBFX',
      airlineCode: 'QR',
      depCity: 'ORD',
      arrCity: 'COK',
      depDate: '2026-01-10',
      arrDate: '2026-01-20',
    },
    passengers,
  };
}

describe('BookingForm shared vs per-passenger payment & remark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shares one payment & remark across all passengers by default; each pending passenger owes its OWN full ticket', async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockResolvedValue({ id: 'b1', invoiceNumber: '000010', passengers: [] });
    renderForm();

    // Checkbox is on by default → a single shared payment/remark block, no per-passenger fields.
    expect(screen.getByRole('checkbox', { name: /same payment & remark for all passengers/i })).toBeChecked();
    expect(screen.queryByRole('button', { name: /apply payment to all/i })).not.toBeInTheDocument();

    await fillTripFields(user);
    await linkPassenger(user, 'Passenger name', CUSTOMER_1);
    await user.type(screen.getByLabelText(/^Amount$/i), '500');
    await selectOption(user, 'Payment status', 'Pending'); // shared block
    await user.type(screen.getByLabelText('Remark'), 'Group booking'); // shared remark

    await user.click(screen.getByRole('button', { name: 'Add passenger' }));
    await linkPassenger(user, 'Passenger name 2', CUSTOMER_2);
    await user.type(screen.getByLabelText('Amount 2'), '300');

    // In shared mode there is no per-passenger "Amount owed" field at all.
    expect(screen.queryByLabelText('Amount owed')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Amount owed 2')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create booking/i }));

    await waitFor(() => expect(createBooking).toHaveBeenCalledTimes(1));
    const input = vi.mocked(createBooking).mock.calls[0][0];
    expect(input.passengers).toEqual([
      {
        passengerName: 'Smith/Jane',
        amount: 500,
        customer: 'c1',
        remark: 'Group booking',
        payment: { status: 'pending', type: 'card', amount: 500 }, // full own ticket
      },
      {
        passengerName: 'Doe/John',
        amount: 300,
        customer: 'c2',
        remark: 'Group booking',
        payment: { status: 'pending', type: 'card', amount: 300 }, // full own ticket
      },
    ]);
  });

  it('unchecking "same for all" reveals per-passenger fields and submits them independently', async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockResolvedValue({ id: 'b2', invoiceNumber: '000010', passengers: [] });
    renderForm();

    await fillTripFields(user);
    await linkPassenger(user, 'Passenger name', CUSTOMER_1);
    await user.type(screen.getByLabelText(/^Amount$/i), '500');

    // Uncheck → per-passenger controls appear.
    await user.click(screen.getByRole('checkbox', { name: /same payment & remark for all passengers/i }));
    await selectOption(user, 'Payment status', 'Paid');
    await selectOption(user, 'Payment type', 'Card');
    await user.type(screen.getByLabelText('Remark'), 'Handle with care');

    await user.click(screen.getByRole('button', { name: 'Add passenger' }));
    await linkPassenger(user, 'Passenger name 2', CUSTOMER_2);
    await user.type(screen.getByLabelText('Amount 2'), '300');
    await selectOption(user, 'Payment status 2', 'Pending');
    await user.type(screen.getByLabelText('Amount owed 2'), '150'); // partial balance, per-passenger only
    await user.type(screen.getByLabelText('Remark 2'), 'Split payment');

    await user.click(screen.getByRole('button', { name: /create booking/i }));

    await waitFor(() => expect(createBooking).toHaveBeenCalledTimes(1));
    const input = vi.mocked(createBooking).mock.calls[0][0];
    expect(input.passengers).toEqual([
      {
        passengerName: 'Smith/Jane',
        amount: 500,
        customer: 'c1',
        remark: 'Handle with care',
        payment: { status: 'paid', type: 'card', amount: 0 },
      },
      {
        passengerName: 'Doe/John',
        amount: 300,
        customer: 'c2',
        remark: 'Split payment',
        payment: { status: 'pending', type: 'card', amount: 150 },
      },
    ]);
  });

  it('opens an all-identical existing booking in shared mode (checkbox checked, no per-passenger fields)', () => {
    renderForm(
      bookingDetail([
        passenger({ id: 'p1', passengerName: 'Smith/Jane', amount: 500, customer: 'c1', remark: 'VIP', payment: { status: 'paid', type: 'card', amount: 0 } }),
        passenger({ id: 'p2', passengerName: 'Doe/John', amount: 300, customer: 'c2', remark: 'VIP', payment: { status: 'paid', type: 'card', amount: 0 } }),
      ])
    );
    expect(screen.getByRole('checkbox', { name: /same payment & remark for all passengers/i })).toBeChecked();
    // Only the shared payment status, no per-passenger "Payment status 2".
    expect(screen.queryByRole('combobox', { name: 'Payment status 2' })).not.toBeInTheDocument();
  });

  it('opens an existing booking whose passengers DIFFER in per-passenger mode (checkbox unchecked)', () => {
    renderForm(
      bookingDetail([
        passenger({ id: 'p1', passengerName: 'Smith/Jane', amount: 500, customer: 'c1', remark: 'aisle', payment: { status: 'paid', type: 'card', amount: 0 } }),
        passenger({ id: 'p2', passengerName: 'Doe/John', amount: 300, customer: 'c2', remark: 'window', payment: { status: 'pending', type: 'card', amount: 150 } }),
      ])
    );
    expect(screen.getByRole('checkbox', { name: /same payment & remark for all passengers/i })).not.toBeChecked();
    // Per-passenger controls are shown for each row, so their real values are visible/editable.
    expect(screen.getByRole('combobox', { name: 'Payment status' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Payment status 2' })).toBeInTheDocument();
    expect(screen.getByLabelText('Amount owed 2')).toHaveValue(150);
  });
});
