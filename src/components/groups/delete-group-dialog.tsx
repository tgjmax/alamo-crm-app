import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName?: string;
  onConfirm: () => void;
  isPending: boolean;
}

/** The single confirm dialog for deleting a Group — shared by the list page (`GroupsPage`,
 * deletes and stays on the list) and the results page (`GroupResultsPage`, deletes and
 * navigates back to `/groups`), so the destructive `variant="destructive"` styling and copy
 * can never drift between the two call sites. Mirrors `delete-customers-dialog.tsx`'s shape. */
export function DeleteGroupDialog({ open, onOpenChange, groupName, onConfirm, isPending }: DeleteGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete group</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete “{groupName}”? This only removes the saved filter, not any bookings or customers.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
