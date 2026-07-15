import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DateField } from '@/components/date-field';
import { exportBookings } from '@/api/bookings.api';

interface ExportBookingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportBookingsDialog({ open, onOpenChange }: ExportBookingsDialogProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The dialog is mounted for as long as the user can export (gated by `canExport` in
  // BookingsPage, NOT by `open`), so its state is not re-seeded by a remount on reopen.
  // Clear the range and any error whenever it closes, so a fresh open starts blank.
  useEffect(() => {
    if (!open) {
      setFrom('');
      setTo('');
      setError(null);
    }
  }, [open]);

  // Both set and out of order — the only client-side invalid state.
  const rangeInvalid = Boolean(from && to && from > to);

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      await exportBookings({ from, to });
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
        <p className="text-sm text-muted-foreground">
          Download bookings as an .xlsx spreadsheet. Leave the dates blank to export the entire ledger,
          or pick a range to export only bookings whose booking date falls within it.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="export-from">From</Label>
            <DateField id="export-from" ariaLabel="Export from date" value={from} onChange={setFrom} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="export-to">To</Label>
            <DateField id="export-to" ariaLabel="Export to date" value={to} onChange={setTo} />
          </div>
        </div>
        {rangeInvalid && (
          <p className="text-sm text-destructive">The from date must be on or before the to date.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={exporting || rangeInvalid}>
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
