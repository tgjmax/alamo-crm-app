import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDisplayDate } from '@/utils/dateFormat';
import { listBookings } from '@/api/bookings.api';

interface VoidedInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoidedInvoicesDialog({ open, onOpenChange }: VoidedInvoicesDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['bookings', 'voided'],
    queryFn: () => listBookings({ voided: true, pageSize: 50 }),
    enabled: open,
  });

  const rows = data?.bookings ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Voided invoices</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice#</TableHead>
              <TableHead>Booking Date</TableHead>
              <TableHead>Remark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                  No voided invoices.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.invoiceNumber}</TableCell>
                  <TableCell>{formatDisplayDate(row.bookingDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{row.remark ?? ''}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
