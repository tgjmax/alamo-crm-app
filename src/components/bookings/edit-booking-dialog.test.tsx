import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { EditBookingDialog } from './edit-booking-dialog';
import * as bookingsApi from '@/api/bookings.api';
import * as customersApi from '@/api/customers.api';
import * as flightDataApi from '@/api/flightData.api';

vi.mock('@/api/bookings.api');
vi.mock('@/api/customers.api');
vi.mock('@/api/flightData.api');

const DETAIL: bookingsApi.BookingDetail = {
  booking: {
    id: 'b1',
    invoiceNumber: '10432',
    bookingDate: '2026-05-01',
    voided: false,
    pnr: 'ABC123',
    airlineCode: 'QR',
    depCity: 'ORD',
    arrCity: 'COK',
    remark: '',
    payment: { status: 'paid', type: 'card', amount: 0 },
  },
  passengers: [
    { id: 'p1', passengerName: 'SMITH/JOHN', amount: 300 },
    { id: 'p2', passengerName: 'SMITH/JANE', amount: 450 },
  ],
};

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <EditBookingDialog bookingId="b1" onOpenChange={() => {}} queryKeyPrefix="bookings" />
    </QueryClientProvider>
  );
  return client;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(customersApi.searchCustomers).mockResolvedValue([]);
  vi.mocked(customersApi.createCustomer).mockResolvedValue({ id: 'c_temp' });
  vi.mocked(flightDataApi.searchAirports).mockResolvedValue([]);
  vi.mocked(flightDataApi.searchAirlines).mockResolvedValue([]);
  vi.mocked(bookingsApi.getBooking).mockResolvedValue(DETAIL);
  vi.mocked(bookingsApi.updateBooking).mockResolvedValue(DETAIL);
});

describe('EditBookingDialog', () => {
  it('prefills the header and every passenger on the invoice', async () => {
    renderDialog();

    expect(await screen.findByDisplayValue('10432')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ABC123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SMITH/JOHN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SMITH/JANE')).toBeInTheDocument();
    expect(screen.getByDisplayValue('450')).toBeInTheDocument();
  });

  it('sends stored passengers with their ids and a newly added one without', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByDisplayValue('10432');
    await user.click(screen.getByRole('button', { name: 'Add passenger' }));
    await user.type(screen.getByLabelText('Passenger name 3'), 'SMITH/BOB');
    await user.type(screen.getByLabelText('Amount 3'), '200');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bookingsApi.updateBooking).toHaveBeenCalled());
    const [id, input] = vi.mocked(bookingsApi.updateBooking).mock.calls[0];
    expect(id).toBe('b1');
    expect(input.passengers).toEqual([
      { id: 'p1', passengerName: 'SMITH/JOHN', amount: 300 },
      { id: 'p2', passengerName: 'SMITH/JANE', amount: 450 },
      { passengerName: 'SMITH/BOB', amount: 200 },
    ]);
  });

  it('omits a removed passenger from the payload (the backend deletes it)', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByDisplayValue('10432');
    await user.click(screen.getByRole('button', { name: 'Remove passenger 2' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bookingsApi.updateBooking).toHaveBeenCalled());
    const [, input] = vi.mocked(bookingsApi.updateBooking).mock.calls[0];
    expect(input.passengers).toEqual([{ id: 'p1', passengerName: 'SMITH/JOHN', amount: 300 }]);
  });

  // Regression guard for the refetch-mid-edit bug already fixed once in this codebase (see
  // send-quote-dialog.tsx's `wasOpen` ref). BookingForm avoids it differently (no reset effect at
  // all — both callers remount by key instead), but the guarantee that matters is the same: a
  // background refetch handing the open form a NEW `initial`/query object identity must not wipe
  // whatever the user has typed.
  it('keeps typed input across a background refetch mid-edit', async () => {
    const user = userEvent.setup();
    const client = renderDialog();

    await screen.findByDisplayValue('10432');
    await user.type(screen.getByLabelText('Remark'), 'follow up needed');
    expect(screen.getByLabelText('Remark')).toHaveValue('follow up needed');

    // Simulate a background refetch of the same booking (e.g. triggered by some other mutation's
    // ['bookings'] invalidation) that returns CHANGED DATA — this forces a new object identity
    // through TanStack Query's structuralSharing (which is ON by default). Without a real data
    // change, structuralSharing would return the previous object reference unchanged, the `initial`
    // prop identity would never change, and this guard test would be hollow, unable to detect a
    // regression if a reset-on-initial-change effect were accidentally re-introduced.
    //
    // The refetch also changes `invoiceNumber` (not just `remark`). `EditBookingDialog` renders
    // `<DialogTitle>Edit booking #{data.booking.invoiceNumber}</DialogTitle>` OUTSIDE `BookingForm`
    // — it re-renders directly from the query data, with no form state in the way. That makes it a
    // deterministic DOM signal that the refetched data has actually propagated into the component
    // tree and React has flushed. `waitFor(() => expect(getBooking).toHaveBeenCalledTimes(2))` only
    // proves the MOCK FUNCTION was invoked twice — that resolves as soon as the queryFn call
    // happens, which is before React has committed the new data to the tree (let alone run any
    // hypothetical reset effect reacting to it). Asserting on the Remark field right after that
    // `waitFor` races ahead of the re-render, so a reset-on-initial-change bug could still wipe the
    // form a tick later without this test ever seeing it. Waiting for the title to show the new
    // invoice number is the proof the new data landed; only then is asserting "the form didn't
    // reset" meaningful.
    vi.mocked(bookingsApi.getBooking).mockResolvedValue({
      ...DETAIL,
      booking: { ...DETAIL.booking, invoiceNumber: '99999', remark: 'changed server-side' },
    });
    await client.refetchQueries({ queryKey: ['bookings', 'detail', 'b1'] });
    await screen.findByText(/99999/);

    // The form must NOT have been re-seeded from the refetched data: the Remark field keeps what
    // the user typed (not the server's 'changed server-side'), and — the strongest check — the
    // Invoice number input inside the form still shows the ORIGINAL '10432', proving the form's own
    // state is independent of the query data even though the title (outside the form) moved on.
    expect(screen.getByLabelText('Remark')).toHaveValue('follow up needed');
    expect(screen.getByLabelText('Invoice number')).toHaveValue('10432');
  });

  // Regression guard for CRITICAL 1: the `voided` branch used to always substitute a single
  // id-less `{ passengerName: 'VOID', amount: 0 }` row, which — because PATCH /bookings/:id
  // treats `passengers[]` as the complete desired end state — deleted every real stored
  // passenger on the invoice the moment an existing booking was marked voided and saved.
  it('sends the stored passengers with their ids (not an id-less VOID row) when voiding an existing booking', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByDisplayValue('10432');
    await user.click(screen.getByRole('checkbox', { name: 'Mark as voided' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bookingsApi.updateBooking).toHaveBeenCalled());
    const [, input] = vi.mocked(bookingsApi.updateBooking).mock.calls[0];
    expect(input.voided).toBe(true);
    expect(input.passengers).toEqual([
      { id: 'p1', passengerName: 'SMITH/JOHN', amount: 300 },
      { id: 'p2', passengerName: 'SMITH/JANE', amount: 450 },
    ]);
  });

  it('sends the selected customer id when picking an autocomplete match for an unlinked passenger', async () => {
    const user = userEvent.setup();
    vi.mocked(customersApi.searchCustomers).mockResolvedValue([
      { id: 'c2', firstName: 'Jane', lastName: 'Doe', phone: '555-0100' },
    ]);
    renderDialog();

    await screen.findByDisplayValue('10432');
    const nameField = screen.getByLabelText('Passenger name 2');
    await user.clear(nameField);
    await user.type(nameField, 'Doe');
    await user.click(await screen.findByText('Jane Doe'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bookingsApi.updateBooking).toHaveBeenCalled());
    const [, input] = vi.mocked(bookingsApi.updateBooking).mock.calls[0];
    expect(input.passengers[1]).toEqual({ id: 'p2', passengerName: 'Jane Doe', amount: 450, customer: 'c2' });
  });

  it('keeps an existing customer link while the name is edited, and clears it only via the unlink control', async () => {
    const user = userEvent.setup();
    vi.mocked(bookingsApi.getBooking).mockResolvedValue({
      ...DETAIL,
      passengers: [
        { id: 'p1', passengerName: 'SMITH/JOHN', amount: 300, customer: 'c1' },
        { id: 'p2', passengerName: 'SMITH/JANE', amount: 450 },
      ],
    });
    renderDialog();

    await screen.findByDisplayValue('10432');
    expect(screen.getByText('Linked')).toBeInTheDocument();

    // Fixing a typo in the linked passenger's name must NOT drop the link.
    await user.type(screen.getByLabelText('Passenger name'), 'X');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(bookingsApi.updateBooking).toHaveBeenCalledTimes(1));
    let [, input] = vi.mocked(bookingsApi.updateBooking).mock.calls[0];
    expect(input.passengers[0]).toEqual({ id: 'p1', passengerName: 'SMITH/JOHNX', amount: 300, customer: 'c1' });

    // The unlink control clears just the customer id, leaving the typed name alone.
    await user.click(screen.getByRole('button', { name: 'Unlink customer from passenger 1' }));
    expect(screen.queryByText('Linked')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(bookingsApi.updateBooking).toHaveBeenCalledTimes(2));
    [, input] = vi.mocked(bookingsApi.updateBooking).mock.calls[1];
    expect(input.passengers[0]).toEqual({ id: 'p1', passengerName: 'SMITH/JOHNX', amount: 300 });
  });

  it('renders 0 (not empty) in the Amount owed input for a pending payment stored with amount 0', async () => {
    vi.mocked(bookingsApi.getBooking).mockResolvedValue({
      ...DETAIL,
      booking: { ...DETAIL.booking, payment: { status: 'pending', type: 'card', amount: 0 } },
    });
    renderDialog();

    await screen.findByDisplayValue('10432');
    expect(screen.getByLabelText('Amount owed')).toHaveValue(0);
  });

  it('sets the customer id on the passenger row when an autocomplete match is selected', async () => {
    const user = userEvent.setup();
    vi.mocked(customersApi.searchCustomers).mockResolvedValue([
      { id: 'c9', firstName: 'Jane', lastName: 'Doe', phone: '555-0100' },
    ]);
    renderDialog();

    await screen.findByDisplayValue('10432');
    // Replace the second passenger with an autocomplete match.
    const nameField = screen.getByDisplayValue('SMITH/JANE');
    await user.clear(nameField);
    await user.type(nameField, 'Doe');
    await user.click(await screen.findByRole('option', { name: 'Jane Doe' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bookingsApi.updateBooking).toHaveBeenCalled());
    const [, input] = vi.mocked(bookingsApi.updateBooking).mock.calls[0];
    expect(input.passengers[1]).toEqual({ id: 'p2', passengerName: 'Jane Doe', amount: 450, customer: 'c9' });
  });

  // FIX 1: neither this form nor `edit-adjustment-dialog.tsx` sends `payment.paidOn` — only
  // `record-payment-dialog.tsx` lets staff set it. But `PATCH /bookings/:id` replaces `payment`
  // as a whole object, so saving ANY unrelated field (a remark typo, say) after a payment was
  // recorded with a paid-on date silently erases that date forever, with no indication.
  it('preserves an existing payment.paidOn when saving an unrelated field', async () => {
    const user = userEvent.setup();
    vi.mocked(bookingsApi.getBooking).mockResolvedValue({
      ...DETAIL,
      booking: { ...DETAIL.booking, payment: { status: 'pending', type: 'card', amount: 150, paidOn: '2026-07-01' } },
    });
    renderDialog();

    await screen.findByDisplayValue('10432');
    await user.type(screen.getByLabelText('Remark'), 'typo fix');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bookingsApi.updateBooking).toHaveBeenCalled());
    const [, input] = vi.mocked(bookingsApi.updateBooking).mock.calls[0];
    expect(input.payment?.paidOn).toBe('2026-07-01');
  });

  // FIX 5: adding a blank passenger row and THEN ticking "Mark as voided" hides the Passengers
  // section — the blank row's `required` attribute can no longer fire — but the row was still
  // sitting in this component's state, so without a filter it is submitted as
  // `passengerName: ''`, which the backend 400s.
  it('drops a blank added passenger row from the payload when voided is ticked afterward', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByDisplayValue('10432');
    await user.click(screen.getByRole('button', { name: 'Add passenger' }));
    await user.click(screen.getByRole('checkbox', { name: 'Mark as voided' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bookingsApi.updateBooking).toHaveBeenCalled());
    const [, input] = vi.mocked(bookingsApi.updateBooking).mock.calls[0];
    expect(input.passengers).toEqual([
      { id: 'p1', passengerName: 'SMITH/JOHN', amount: 300 },
      { id: 'p2', passengerName: 'SMITH/JANE', amount: 450 },
    ]);
  });

  // FIX 4: this dialog used to render "Save failed. Check your connection and try again." for
  // EVERY backend failure, even a semantic one the user can actually fix. The user would be told
  // to check their connection and retry forever instead of being told the real problem.
  // (Re-fixtured 2026-07-13 on HAS_ADJUSTMENTS: the backend deleted INVOICE_NUMBER_IN_USE the same
  // day `invoiceNumber` stopped being unique — a repeated invoice number is now a dismissible 409
  // DUPLICATE_BOOKING_WARNING with its own dedicated UI panel, not a generic error line. This test
  // genuinely exercises errorMessage()'s generic extraction for any OTHER 409, so it is re-pointed
  // at a code the API can still actually return rather than deleted.)
  it('surfaces the backend HAS_ADJUSTMENTS message instead of a generic connection error', async () => {
    const user = userEvent.setup();
    vi.mocked(bookingsApi.updateBooking).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { error: { code: 'HAS_ADJUSTMENTS', message: 'Cannot delete: 1 reissue recorded against this booking — delete those first.' } },
      },
    } as unknown as AxiosError);
    renderDialog();

    await screen.findByDisplayValue('10432');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('Cannot delete: 1 reissue recorded against this booking — delete those first.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument();
  });
});
