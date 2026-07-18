import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FUTURE_ARR_DATE, FUTURE_DEP_DATE } from '@/test-utils/dates';
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

/** A historic invoice: its passenger was imported from the spreadsheet and never linked to a
 * Customer record — the case this whole file exists for. */
const HISTORIC_BOOKING: BookingDetail = {
  booking: {
    id: 'b1',
    invoiceNumber: '000005',
    bookingDate: '2025-11-12',
    voided: false,
    pnr: 'GUDBFX',
    airlineCode: 'QR',
    depCity: 'ORD',
    arrCity: 'COK',
    depDate: FUTURE_DEP_DATE,
    arrDate: FUTURE_ARR_DATE,
  },
  passengers: [{ id: 'p1', passengerName: 'SMITH/JANE', amount: 500 }],
};

/** DateField's control is a visually-hidden native `<input type="date">`; userEvent can't type into
 * it, so set it the way the picker would. */
function pickDate(label: string, iso: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: iso } });
}

describe('BookingForm customer-link gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The bug: the submit gate applied to EVERY row, so a historic invoice could not be edited at
  // all (fixing its PNR forced you to invent a Customer record for a passenger from years ago).
  it('saves an edit of a historic unlinked passenger without forcing a link', async () => {
    const user = userEvent.setup();
    vi.mocked(updateBooking).mockResolvedValue(HISTORIC_BOOKING);
    renderForm(HISTORIC_BOOKING);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateBooking).toHaveBeenCalled());
    expect(vi.mocked(updateBooking).mock.calls[0][1].passengers).toEqual([
      expect.objectContaining({ id: 'p1', passengerName: 'SMITH/JANE' }),
    ]);
    // Still no customer — the row is grandfathered, not silently linked to anyone.
    expect(vi.mocked(updateBooking).mock.calls[0][1].passengers?.[0]).not.toHaveProperty('customer');
  });

  it('still blocks a NEW booking whose passenger is unlinked', async () => {
    const user = userEvent.setup();
    renderForm();

    // Every HTML-`required` control must be satisfied first, or native constraint validation
    // blocks the submit before handleSubmit's link gate ever runs.
    await user.type(screen.getByLabelText('Invoice#'), '000005');
    await user.type(screen.getByLabelText(/PNR/i), 'GUDBFX');
    await user.type(screen.getByLabelText(/Airline/i), 'QR');
    await user.type(screen.getByLabelText('Departure city'), 'ORD');
    await user.type(screen.getByLabelText('Arrival city'), 'COK');
    pickDate('Departure Date', FUTURE_DEP_DATE);
    pickDate('Arrival Date', FUTURE_ARR_DATE);
    await user.type(screen.getByLabelText(/^Amount$/i), '700');
    await user.click(screen.getByRole('button', { name: 'Create booking' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Select a customer/i);
    expect(createBooking).not.toHaveBeenCalled();
  });

  // Grandfathering is per-row and keyed on the STORED passenger, not on "we're editing" — a row
  // the user adds during an edit is new data and must be linked like any other new passenger.
  it('still blocks a passenger newly added during an edit', async () => {
    const user = userEvent.setup();
    renderForm(HISTORIC_BOOKING);

    await user.click(screen.getByRole('button', { name: 'Add passenger' }));
    await user.type(screen.getByLabelText('Amount 2'), '250');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Select a customer/i);
    expect(updateBooking).not.toHaveBeenCalled();
  });
});
