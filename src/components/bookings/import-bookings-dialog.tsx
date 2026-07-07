import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import BookingImportWizard from '@/components/BookingImportWizard';

interface ImportBookingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportBookingsDialog({ open, onOpenChange }: ImportBookingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogTitle className="sr-only">Import Bookings</DialogTitle>
        <BookingImportWizard onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
