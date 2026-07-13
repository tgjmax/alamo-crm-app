import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getBooking } from '@/api/bookings.api';
import { BookingForm } from './booking-form';

interface EditBookingDialogProps {
  /** The Booking id to edit — null closes the dialog. */
  bookingId: string | null;
  onOpenChange: (open: boolean) => void;
  queryKeyPrefix: string;
}

export function EditBookingDialog({ bookingId, onOpenChange, queryKeyPrefix }: EditBookingDialogProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [queryKeyPrefix, 'detail', bookingId],
    queryFn: () => getBooking(bookingId as string),
    enabled: bookingId !== null,
  });

  return (
    <Dialog open={bookingId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit booking{data ? ` #${data.booking.invoiceNumber}` : ''}</DialogTitle>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && <p className="text-sm text-destructive">Could not load this booking.</p>}
        {data && (
          // Keyed by booking id so switching rows re-seeds the form rather than reusing
          // the previous booking's state.
          <BookingForm
            key={data.booking.id}
            initial={data}
            onDone={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
