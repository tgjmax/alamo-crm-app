import { MoreHorizontal, Pencil, Receipt, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookingRow } from '@/api/bookings.api';

interface BookingRowActionsProps {
  row: BookingRow;
  onRecordPayment: (row: BookingRow) => void;
  onEdit: (row: BookingRow) => void;
  onDelete: (row: BookingRow) => void;
  onDeleteInvoice: (row: BookingRow) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function BookingRowActions({
  row,
  onRecordPayment,
  onEdit,
  onDelete,
  onDeleteInvoice,
  canEdit,
  canDelete,
}: BookingRowActionsProps) {
  // A New row's Delete removes just that passenger; the whole invoice needs its own action,
  // because the table is one row per passenger, not one row per invoice.
  const isNew = row.bookingType === 'New';
  const deleteLabel = isNew ? 'Delete passenger' : `Delete ${row.bookingType.toLowerCase()}`;

  if (!canEdit && !canDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label={`Row actions for ${row.passengerName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && row.paymentStatus === 'pending' && (
          <DropdownMenuItem onClick={() => onRecordPayment(row)}>
            <Wallet className="mr-2 h-4 w-4" />
            Record payment
          </DropdownMenuItem>
        )}
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(row)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteLabel}
            </DropdownMenuItem>
            {/* Only rendered when there's an actual invoice to route to — a New row missing
                bookingId (a data anomaly) would otherwise silently no-op on click. */}
            {isNew && row.bookingId && (
              <DropdownMenuItem
                onClick={() => onDeleteInvoice(row)}
                className="text-destructive focus:text-destructive"
              >
                <Receipt className="mr-2 h-4 w-4" />
                Delete invoice #{row.invoiceNumber}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
