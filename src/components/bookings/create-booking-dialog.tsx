import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdjustmentBookingForm } from './adjustment-booking-form';
import { BookingForm } from './booking-form';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBookingDialog({ open, onOpenChange }: CreateBookingDialogProps) {
  const [bookingKind, setBookingKind] = useState<'New' | 'Reissue' | 'Refund'>('New');

  useEffect(() => {
    if (open) setBookingKind('New');
  }, [open]);

  const typeSelector = (
    <>
      <Label>Booking Type</Label>
      <Select value={bookingKind} onValueChange={(v) => setBookingKind(v as 'New' | 'Reissue' | 'Refund')}>
        <SelectTrigger aria-label="Booking type" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="New">New</SelectItem>
          <SelectItem value="Reissue">Reissue</SelectItem>
          <SelectItem value="Refund">Refund</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {bookingKind === 'New' ? 'Create booking' : bookingKind === 'Reissue' ? 'Record reissue' : 'Record refund'}
          </DialogTitle>
        </DialogHeader>
        {bookingKind === 'New' ? (
          <BookingForm
            key={open ? 'open' : 'closed'}
            typeSelector={typeSelector}
            onDone={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <>
            <div className="w-1/3 space-y-1 pr-2">{typeSelector}</div>
            <AdjustmentBookingForm
              key={bookingKind}
              bookingType={bookingKind}
              onDone={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
