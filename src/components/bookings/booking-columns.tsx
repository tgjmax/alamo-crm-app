import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { BookingRow } from '@/api/bookings.api';
import { formatDisplayDate } from '@/utils/dateFormat';
import { CopyableText } from '@/components/data-table/copyable-text';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { BookingRowActions } from './booking-row-actions';

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

function PaymentStatusBadge({ status, amount }: { status?: 'paid' | 'pending'; amount?: number }) {
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

interface BuildBookingColumnsArgs {
  onRecordPayment: (row: BookingRow) => void;
  onEdit: (row: BookingRow) => void;
  onDelete: (row: BookingRow) => void;
  onDeleteInvoice: (row: BookingRow) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function buildBookingColumns({
  onRecordPayment,
  onEdit,
  onDelete,
  onDeleteInvoice,
  canEdit,
  canDelete,
}: BuildBookingColumnsArgs): ColumnDef<BookingRow>[] {
  return [
    {
      id: 'date',
      accessorKey: 'bookingDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Booking Date" />,
      meta: { label: 'Booking Date', widthClass: '2xl:w-32' },
      cell: ({ getValue }) => formatDisplayDate(getValue<string>()),
    },
    {
      id: 'invoiceNumber',
      accessorKey: 'invoiceNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice#" />,
      meta: { label: 'Invoice#', widthClass: '2xl:w-24' },
      cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
    },
    {
      id: 'passengerName',
      accessorKey: 'passengerName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name of PAX" />,
      meta: { label: 'Name of PAX', widthClass: '2xl:w-56' },
      cell: ({ getValue }) => <CopyableText value={getValue<string>()} maxChars={30} />,
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      meta: { label: 'Amount', widthClass: '2xl:w-24' },
      cell: ({ getValue }) => `$${getValue<number>()}`,
    },
    {
      id: 'pnr',
      accessorFn: (b) => b.pnr ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="PNR" />,
      meta: { label: 'PNR', widthClass: '2xl:w-20' },
    },
    {
      id: 'airlineCode',
      accessorFn: (b) => b.airlineCode ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Airlines" />,
      meta: { label: 'Airlines', widthClass: '2xl:w-16' },
    },
    {
      id: 'depCity',
      accessorFn: (b) => b.depCity ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dep City" />,
      meta: { label: 'Departure City', widthClass: '2xl:w-20' },
    },
    {
      id: 'arrCity',
      accessorFn: (b) => b.arrCity ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Arr City" />,
      meta: { label: 'Arrival City', widthClass: '2xl:w-20' },
    },
    {
      id: 'depDate',
      accessorKey: 'depDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dep Date" />,
      meta: { label: 'Departure Date', widthClass: '2xl:w-32' },
      cell: ({ getValue }) => formatDisplayDate(getValue<string | undefined>()),
    },
    {
      id: 'arrDate',
      accessorKey: 'arrDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Arr Date" />,
      meta: { label: 'Arrival Date', widthClass: '2xl:w-32' },
      cell: ({ getValue }) => formatDisplayDate(getValue<string | undefined>()),
    },
    {
      id: 'paymentStatus',
      accessorFn: (b) => b.paymentStatus ?? '',
      header: () => <div className="text-center">Payment</div>,
      meta: { label: 'Payment Status', widthClass: '2xl:w-28' },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <PaymentStatusBadge status={row.original.paymentStatus} amount={row.original.paymentAmount} />
        </div>
      ),
    },
    {
      id: 'remark',
      accessorFn: (b) => b.remark ?? '',
      header: () => <span>Remark</span>,
      meta: { label: 'Remark' },
      enableSorting: false,
      cell: ({ getValue }) => {
        const remark = getValue<string>();
        return (
          <span
            className="inline-block max-w-[18ch] overflow-hidden text-ellipsis whitespace-nowrap align-bottom text-muted-foreground"
            title={remark || undefined}
          >
            {remark}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <BookingRowActions
          row={row.original}
          onRecordPayment={onRecordPayment}
          onEdit={onEdit}
          onDelete={onDelete}
          onDeleteInvoice={onDeleteInvoice}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ),
    },
  ];
}
