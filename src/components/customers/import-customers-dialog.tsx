import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import CustomerImportWizard from '@/components/CustomerImportWizard';

interface ImportCustomersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportCustomersDialog({ open, onOpenChange }: ImportCustomersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogTitle className="sr-only">Import Customers</DialogTitle>
        <CustomerImportWizard onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
