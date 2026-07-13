import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingForm } from './booking-form';
import { createBooking, updateBooking, type BookingDetail } from '@/api/bookings.api';

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

const EXISTING_BOOKING: BookingDetail = {
  booking: {
    id: 'b1',
    invoiceNumber: '000005',
    bookingDate: '2025-11-12',
    voided: false,
    pnr: 'GUDBFX',
    airlineCode: 'QR',
    remark: '',
    payment: { status: 'paid', type: 'card', amount: 0 },
  },
  passengers: [{ id: 'p1', passengerName: 'John Smith', amount: 500 }],
};

const TODAY = new Date().toISOString().slice(0, 10);

/** DateField's control is a visually-hidden native `<input type="date">` carrying the accessible
 * name; userEvent can't type into it, so set it the way a date picker would. */
function pickDate(label: string, iso: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: iso } });
}

describe('BookingForm booking date', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to today', () => {
    renderForm();
    expect(screen.getByLabelText('Booking Date')).toHaveValue(TODAY);
  });

  // The regression this field exists for: the form used to hold bookingDate in state with NO input
  // rendered, so every booking created in the UI was silently dated today and a historical invoice
  // could not be back-dated at all (import was the only way in).
  it('submits the date the user picked, not today', async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockResolvedValue({ id: 'b9', invoiceNumber: '000005', passengers: [] });
    renderForm();

    await user.type(screen.getByLabelText('Invoice#'), '000005');
    pickDate('Booking Date', '2025-11-12');
    await user.type(screen.getByLabelText(/PNR/i), 'GUDBFX');
    await user.type(screen.getByLabelText(/Airline/i), 'QR');
    await user.type(screen.getByLabelText(/Passenger name/i), 'Jane Smith');
    await user.type(screen.getByLabelText(/Amount/i), '700');
    await user.click(screen.getByRole('button', { name: /create booking/i }));

    await waitFor(() => expect(createBooking).toHaveBeenCalledTimes(1));
    const input = vi.mocked(createBooking).mock.calls[0][0];
    expect(input.bookingDate).toBe('2025-11-12');
    expect(input.bookingDate).not.toBe(TODAY);
  });

  it('EDIT: prefills the stored date and can change it', async () => {
    const user = userEvent.setup();
    vi.mocked(updateBooking).mockResolvedValue(EXISTING_BOOKING);
    renderForm(EXISTING_BOOKING);

    expect(screen.getByLabelText('Booking Date')).toHaveValue('2025-11-12');

    pickDate('Booking Date', '2026-01-03');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateBooking).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateBooking).mock.calls[0][1].bookingDate).toBe('2026-01-03');
  });

  // A voided invoice is recorded with nothing but an invoice number, a booking date and a remark —
  // so the date must stay reachable when the voided checkbox hides the rest of the form.
  it('stays visible and editable when the invoice is marked voided', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText(/Mark as voided/i));

    expect(screen.getByLabelText('Booking Date')).toBeInTheDocument();
    pickDate('Booking Date', '2025-11-12');
    expect(screen.getByLabelText('Booking Date')).toHaveValue('2025-11-12');
  });
});
