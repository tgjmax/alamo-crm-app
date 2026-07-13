import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { deleteBooking, deletePassenger } from '@/api/bookings.api';
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
  const title =
    target.scope === 'invoice' ? 'Delete invoice' : isAdjustment ? `Delete ${target.bookingType.toLowerCase()}` : 'Delete passenger';
  const body =
    target.scope === 'invoice'
      ? `Delete invoice #${target.invoiceNumber} and every passenger on it? This cannot be undone.`
      : isAdjustment
        ? `Delete this ${target.bookingType.toLowerCase()} for ${target.passengerName}? This cannot be undone.`
        : `Remove ${target.passengerName} from invoice #${target.invoiceNumber}? This cannot be undone. ` +
          `If this is the last passenger on the invoice, the invoice itself (invoice number, PNR, dates, remark, and payment) is deleted too.`;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">{body}</p>
      {mutation.isError && (
        <p className="text-sm text-destructive">
          {errorMessage(mutation.error, 'Delete failed. Check your connection and try again.')}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Deleting…' : 'Delete'}
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
