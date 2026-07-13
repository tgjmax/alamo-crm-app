import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { deleteBooking, deletePassenger, getBooking } from '@/api/bookings.api';
import { errorMessage } from '@/utils/apiError';

export interface DeleteTarget {
  /** 'passenger' removes one row (a New passenger or an adjustment); 'invoice' removes the whole
   * Booking header and every passenger on it. */
  scope: 'passenger' | 'invoice';
  /** The passenger id when scope is 'passenger', the Booking id when it is 'invoice'. */
  id: string;
  passengerName: string;
  invoiceNumber: string;
  /** The row's own booking type. On a 'passenger'-scope target this tells the dialog whether it's
   * removing a New passenger (part of a shared invoice — the last-passenger-deletes-the-invoice
   * warning applies) or a Reissue/Refund adjustment (a standalone row with no invoice number of
   * its own — the list projection's literal "REISSUE"/"REFUND" placeholder must never leak into
   * the confirmation copy, e.g. "invoice #REISSUE"). Always 'New' on an 'invoice'-scope target. */
  bookingType: 'New' | 'Reissue' | 'Refund';
  /** The parent Booking's id — present on New rows only. The dialog needs it to look up how many
   * passengers the invoice ACTUALLY has, so it only warns about the invoice being deleted when
   * that is genuinely about to happen. The table cannot supply the count itself: it renders one
   * page of a filtered/paginated list, so a passenger's siblings may simply not be on screen. */
  bookingId?: string;
}

interface DeleteBookingDialogProps {
  target: DeleteTarget | null;
  onOpenChange: (open: boolean) => void;
  queryKeyPrefix: string;
}

interface DeleteBookingDialogBodyProps {
  target: DeleteTarget;
  onOpenChange: (open: boolean) => void;
  queryKeyPrefix: string;
}

/** Owns the actual delete mutation. The parent only renders this while `target` is non-null
 * (and keys it by the target's own identity), so this remounts fresh every time the dialog opens
 * — a previous target's error (or pending/success state) cannot survive into a new confirmation.
 * Deliberately NOT a `useEffect(() => mutation.reset(), [target])` in the parent: this codebase has
 * been bitten by that reset-on-dependency-change footgun before (see booking-form.tsx's comment) —
 * remounting is the same fix without an effect. */
function DeleteBookingDialogBody({ target, onOpenChange, queryKeyPrefix }: DeleteBookingDialogBodyProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => (target.scope === 'invoice' ? deleteBooking(target.id) : deletePassenger(target.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
      onOpenChange(false);
    },
  });

  // A passenger-scope target is either a New passenger (sharing an invoice with siblings) or a
  // Reissue/Refund adjustment (a standalone row — it has no invoice number of its own, so the
  // list projection's literal "REISSUE"/"REFUND" placeholder must never be shown as if it were
  // one, e.g. "invoice #REISSUE").
  const isAdjustment = target.scope === 'passenger' && target.bookingType !== 'New';
  const isNewPassenger = target.scope === 'passenger' && !isAdjustment;

  // Deleting an invoice's LAST passenger takes the whole invoice with it. That is worth a loud
  // warning — but only when it is actually about to happen. Warning unconditionally trains people
  // to ignore the text on the one dialog where they must read it, so ask the server how many
  // passengers this invoice really has. The table can't answer: it shows one filtered, paginated
  // page, so a sibling may exist but simply not be on screen.
  const { data: detail, isLoading: countLoading } = useQuery({
    queryKey: [queryKeyPrefix, 'detail', target.bookingId],
    queryFn: () => getBooking(target.bookingId as string),
    enabled: isNewPassenger && Boolean(target.bookingId),
  });

  // `undefined` means "we don't know" — still loading, the lookup failed, or there's no bookingId.
  // In that case we fall back to the cautionary wording and STILL allow the delete: a secondary
  // lookup failing must never lock the user out of an action the backend would happily perform.
  const siblingCount = detail ? detail.passengers.length : undefined;
  const isLastPassenger = siblingCount === 1;

  const title =
    target.scope === 'invoice' ? 'Delete invoice' : isAdjustment ? `Delete ${target.bookingType.toLowerCase()}` : 'Delete passenger';

  function passengerBody(): string {
    // Count unknown (loading, lookup failed, or no bookingId) — fall back to the cautionary wording
    // that is true either way, rather than asserting something we haven't confirmed.
    if (siblingCount === undefined) {
      return (
        `Remove ${target.passengerName} from invoice #${target.invoiceNumber}? This cannot be undone. ` +
        `If this is the last passenger on the invoice, the invoice itself is deleted too.`
      );
    }
    if (isLastPassenger) {
      return (
        `${target.passengerName} is the only passenger on invoice #${target.invoiceNumber}. ` +
        `Deleting them deletes the whole invoice — its invoice number, PNR, dates, remark and payment. ` +
        `This cannot be undone.`
      );
    }
    const others = siblingCount - 1;
    return (
      `Remove ${target.passengerName} from invoice #${target.invoiceNumber}? ` +
      `The invoice and its other ${others} passenger${others === 1 ? '' : 's'} are not affected. ` +
      `This cannot be undone.`
    );
  }

  const body =
    target.scope === 'invoice'
      ? `Delete invoice #${target.invoiceNumber} and every passenger on it? This cannot be undone.`
      : isAdjustment
        ? `Delete this ${target.bookingType.toLowerCase()} for ${target.passengerName}? This cannot be undone.`
        : passengerBody();

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isLastPassenger ? 'Delete passenger and invoice' : title}</DialogTitle>
      </DialogHeader>
      <p className={isLastPassenger ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}>{body}</p>
      {mutation.isError && (
        <p className="text-sm text-destructive">
          {errorMessage(mutation.error, 'Delete failed. Check your connection and try again.')}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        {/* Hold the destructive action until we know what it will actually destroy. */}
        <Button
          type="button"
          variant="destructive"
          disabled={mutation.isPending || countLoading}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Deleting…' : isLastPassenger ? 'Delete invoice' : 'Delete'}
        </Button>
      </DialogFooter>
    </>
  );
}

export function DeleteBookingDialog({ target, onOpenChange, queryKeyPrefix }: DeleteBookingDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {target && (
          <DeleteBookingDialogBody
            key={`${target.scope}:${target.id}`}
            target={target}
            onOpenChange={onOpenChange}
            queryKeyPrefix={queryKeyPrefix}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
