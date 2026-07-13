import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/currency';

/** Shared by the Bookings ledger and the Groups results table, so the two cannot drift.
 * `amount` is the row's outstanding balance and renders as a caption under a Pending badge. */
export function PaymentStatusBadge({ status, amount }: { status?: 'paid' | 'pending'; amount?: number }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  if (status === 'paid') {
    return (
      <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
        Paid
      </Badge>
    );
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Badge className="border-red-200 bg-red-100 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        Pending
      </Badge>
      {amount !== undefined && <span className="text-xs text-muted-foreground">{formatCurrency(amount)} due</span>}
    </div>
  );
}
