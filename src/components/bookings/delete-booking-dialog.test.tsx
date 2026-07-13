import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { DeleteBookingDialog, DeleteTarget } from './delete-booking-dialog';
import * as bookingsApi from '@/api/bookings.api';

vi.mock('@/api/bookings.api');

const PASSENGER_TARGET: DeleteTarget = {
  scope: 'passenger',
  id: 'p2',
  passengerName: 'SMITH/JANE',
  invoiceNumber: '10432',
  bookingType: 'New',
};

const INVOICE_TARGET: DeleteTarget = {
  scope: 'invoice',
  id: 'b1',
  passengerName: 'SMITH/JANE',
  invoiceNumber: '10432',
  bookingType: 'New',
};

const REISSUE_TARGET: DeleteTarget = {
  scope: 'passenger',
  id: 'a1',
  passengerName: 'SMITH/JANE',
  invoiceNumber: 'REISSUE',
  bookingType: 'Reissue',
};

const REFUND_TARGET: DeleteTarget = {
  scope: 'passenger',
  id: 'a2',
  passengerName: 'SMITH/JANE',
  invoiceNumber: 'REFUND',
  bookingType: 'Refund',
};

function renderDialog(target: DeleteTarget) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DeleteBookingDialog target={target} onOpenChange={() => {}} queryKeyPrefix="bookings" />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(bookingsApi.deletePassenger).mockResolvedValue(undefined);
  vi.mocked(bookingsApi.deleteBooking).mockResolvedValue(undefined);
});

describe('DeleteBookingDialog', () => {
  it('names the passenger when deleting one passenger', () => {
    renderDialog(PASSENGER_TARGET);
    expect(screen.getByText(/SMITH\/JANE/)).toBeInTheDocument();
    expect(screen.getByText(/10432/)).toBeInTheDocument();
  });

  // Deleting an invoice's LAST passenger takes the whole invoice with it (an invoice with no
  // passengers is invisible to every list query, so it can't be left squatting on its unique
  // invoice number). That deserves a loud warning — but ONLY when it is actually about to happen.
  // An earlier version warned unconditionally, which meant a user removing one of three passengers
  // was told their invoice might be destroyed. Crying wolf on the one dialog people must actually
  // read is how they learn to click through it. So the dialog asks the server for the real
  // passenger count (the table can't answer — it renders one filtered, paginated page, so a
  // sibling may exist but simply not be on screen).
  describe('last-passenger warning', () => {
    it('warns that the invoice goes too — but only when this really is the last passenger', async () => {
      vi.mocked(bookingsApi.getBooking).mockResolvedValue({
        booking: { id: 'b1', invoiceNumber: '10432', bookingDate: '2026-05-01', voided: false },
        passengers: [{ id: 'p2', passengerName: 'SMITH/JANE', amount: 450 }],
      });

      renderDialog({ ...PASSENGER_TARGET, bookingId: 'b1' });

      expect(await screen.findByText(/only passenger on invoice #10432/i)).toBeInTheDocument();
      expect(screen.getByText(/deletes the whole invoice/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Delete passenger and invoice' })).toBeInTheDocument();
      // The button says what it will actually do.
      expect(await screen.findByRole('button', { name: 'Delete invoice' })).toBeInTheDocument();
    });

    it('does NOT warn about losing the invoice when siblings remain, and says what survives', async () => {
      vi.mocked(bookingsApi.getBooking).mockResolvedValue({
        booking: { id: 'b1', invoiceNumber: '10432', bookingDate: '2026-05-01', voided: false },
        passengers: [
          { id: 'p1', passengerName: 'SMITH/JOHN', amount: 300 },
          { id: 'p2', passengerName: 'SMITH/JANE', amount: 450 },
          { id: 'p3', passengerName: 'SMITH/BOB', amount: 200 },
        ],
      });

      renderDialog({ ...PASSENGER_TARGET, bookingId: 'b1' });

      expect(await screen.findByText(/other 2 passengers are not affected/i)).toBeInTheDocument();
      expect(screen.queryByText(/deletes the whole invoice/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/only passenger/i)).not.toBeInTheDocument();
    });

    it('holds the Delete button until the count is known, so it can never destroy more than it said', async () => {
      let resolve!: (v: bookingsApi.BookingDetail) => void;
      vi.mocked(bookingsApi.getBooking).mockReturnValue(
        new Promise<bookingsApi.BookingDetail>((r) => {
          resolve = r;
        })
      );

      renderDialog({ ...PASSENGER_TARGET, bookingId: 'b1' });

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
      resolve({
        booking: { id: 'b1', invoiceNumber: '10432', bookingDate: '2026-05-01', voided: false },
        passengers: [{ id: 'p2', passengerName: 'SMITH/JANE', amount: 450 }],
      });
      expect(await screen.findByRole('button', { name: 'Delete invoice' })).toBeEnabled();
    });
  });

  // FIX 3: an adjustment row has no Booking header of its own — the API's list projection sets
  // its invoiceNumber to the literal string "REISSUE"/"REFUND" (`$ifNull` fallback). The old
  // shared copy blindly interpolated that into "invoice #REISSUE", which is nonsense. The dialog
  // must recognize an adjustment target and use adjustment-specific title/body instead.
  it('uses adjustment-specific title and body for a reissue, never mentioning "invoice #REISSUE"', () => {
    renderDialog(REISSUE_TARGET);
    expect(screen.getByRole('heading', { name: 'Delete reissue' })).toBeInTheDocument();
    expect(screen.getByText('Delete this reissue for SMITH/JANE? This cannot be undone.')).toBeInTheDocument();
    expect(screen.queryByText(/REISSUE/)).not.toBeInTheDocument();
  });

  it('uses adjustment-specific title and body for a refund, never mentioning "invoice #REFUND"', () => {
    renderDialog(REFUND_TARGET);
    expect(screen.getByRole('heading', { name: 'Delete refund' })).toBeInTheDocument();
    expect(screen.getByText('Delete this refund for SMITH/JANE? This cannot be undone.')).toBeInTheDocument();
    expect(screen.queryByText(/REFUND/)).not.toBeInTheDocument();
  });

  it('deletes just the adjustment passenger when confirming a reissue-scoped target', async () => {
    const user = userEvent.setup();
    renderDialog(REISSUE_TARGET);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(bookingsApi.deletePassenger).toHaveBeenCalledWith('a1'));
    expect(bookingsApi.deleteBooking).not.toHaveBeenCalled();
  });

  it('deletes just the passenger', async () => {
    const user = userEvent.setup();
    renderDialog(PASSENGER_TARGET);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(bookingsApi.deletePassenger).toHaveBeenCalledWith('p2'));
    expect(bookingsApi.deleteBooking).not.toHaveBeenCalled();
  });

  it('deletes the whole invoice when the scope is invoice', async () => {
    const user = userEvent.setup();
    renderDialog(INVOICE_TARGET);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(bookingsApi.deleteBooking).toHaveBeenCalledWith('b1'));
    expect(bookingsApi.deletePassenger).not.toHaveBeenCalled();
  });

  // The two backend guards are conditions the user can act on, so their real messages must
  // reach the screen — not a generic "delete failed".
  it('surfaces the HAS_ADJUSTMENTS guard message inline', async () => {
    const user = userEvent.setup();
    vi.mocked(bookingsApi.deletePassenger).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { error: { code: 'HAS_ADJUSTMENTS', message: 'Cannot delete: 1 reissue recorded against this booking — delete those first.' } },
      },
    } as unknown as AxiosError);

    renderDialog(PASSENGER_TARGET);
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/1 reissue recorded against this booking/)).toBeInTheDocument();
  });

  it('surfaces the PAYMENT_AMOUNT_EXCEEDS_TOTAL guard message inline', async () => {
    const user = userEvent.setup();
    vi.mocked(bookingsApi.deletePassenger).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: { error: { code: 'PAYMENT_AMOUNT_EXCEEDS_TOTAL', message: 'This change would drop the invoice total to $150.00, below the $200.00 still owed — update the payment first.' } },
      },
    } as unknown as AxiosError);

    renderDialog(PASSENGER_TARGET);
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/below the \$200\.00 still owed/)).toBeInTheDocument();
  });

  // The dialog is permanently mounted by its caller (bookings-table.tsx toggles `open` via
  // `target`, it never unmounts DeleteBookingDialog itself) — a naive implementation keeps the
  // same useMutation instance across close/reopen, so an error from deleting passenger A would
  // still be showing when the user opens the dialog again for an unrelated passenger B.
  it('does not carry a stale error into a dialog reopened for a different, unrelated target', async () => {
    const user = userEvent.setup();
    vi.mocked(bookingsApi.deletePassenger).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { error: { code: 'HAS_ADJUSTMENTS', message: 'Cannot delete: 1 reissue recorded against this booking — delete those first.' } },
      },
    } as unknown as AxiosError);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <DeleteBookingDialog target={PASSENGER_TARGET} onOpenChange={() => {}} queryKeyPrefix="bookings" />
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/1 reissue recorded against this booking/)).toBeInTheDocument();

    // Cancel closes the dialog (target -> null)...
    rerender(
      <QueryClientProvider client={client}>
        <DeleteBookingDialog target={null} onOpenChange={() => {}} queryKeyPrefix="bookings" />
      </QueryClientProvider>
    );
    // ...then it's reopened for a completely different, unrelated passenger.
    const OTHER_TARGET: DeleteTarget = {
      scope: 'passenger',
      id: 'p9',
      passengerName: 'DOE/JOHN',
      invoiceNumber: '99999',
      bookingType: 'New',
    };
    rerender(
      <QueryClientProvider client={client}>
        <DeleteBookingDialog target={OTHER_TARGET} onOpenChange={() => {}} queryKeyPrefix="bookings" />
      </QueryClientProvider>
    );

    expect(screen.getByText(/DOE\/JOHN/)).toBeInTheDocument();
    expect(screen.queryByText(/1 reissue recorded against this booking/)).not.toBeInTheDocument();
  });
});
