import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import type { CustomerListItem } from '@/api/customers.api';

interface ToggleVerifiedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerListItem | null;
  isPending: boolean;
  onConfirm: () => void;
}

export function ToggleVerifiedDialog({
  open,
  onOpenChange,
  customer,
  isPending,
  onConfirm,
}: ToggleVerifiedDialogProps) {
  const name = customer ? `${customer.firstName} ${customer.lastName}` : '';
  const targetVerified = customer ? !customer.verified : false;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Mark {name} as {targetVerified ? 'verified' : 'not verified'}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {targetVerified
            ? 'This marks the customer as verified.'
            : 'This marks the customer as not verified.'}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending && <Spinner />}
            {isPending ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
