import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GroupQueryResult } from '../api/groups.api';

interface GroupResultsTableProps {
  result: GroupQueryResult | null;
  busy: boolean;
  onPageChange: (page: number) => void;
}

export default function GroupResultsTable({ result, busy, onPageChange }: GroupResultsTableProps) {
  if (!result) return null;
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {result.total} result{result.total === 1 ? '' : 's'}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Passenger</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>PNR</TableHead>
            <TableHead>Airline</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.date.slice(0, 10)}</TableCell>
              <TableCell>{r.invoiceNumber ?? ''}</TableCell>
              <TableCell>{r.passengerName}</TableCell>
              <TableCell>{r.bookingType}</TableCell>
              <TableCell>{r.pnr ?? ''}</TableCell>
              <TableCell>{r.airlineCode ?? ''}</TableCell>
              <TableCell>{r.arrCity ?? ''}</TableCell>
              <TableCell>{r.amount}</TableCell>
              <TableCell>{r.paymentStatus ?? ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || result.page <= 1}
          onClick={() => onPageChange(result.page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {result.page} of {lastPage}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || result.page >= lastPage}
          onClick={() => onPageChange(result.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
