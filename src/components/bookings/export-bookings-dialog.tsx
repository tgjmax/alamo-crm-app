import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { exportBookings } from '@/api/bookings.api';

interface ExportBookingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportBookingsDialog({ open, onOpenChange }: ExportBookingsDialogProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      await exportBookings();
      onOpenChange(false);
    } catch {
      setError('Export failed. Check your connection and try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export bookings</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Download every booking as an .xlsx spreadsheet.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
