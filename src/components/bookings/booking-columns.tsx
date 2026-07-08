import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookingRow } from '@/api/bookings.api';
import { formatDisplayDate } from '@/utils/dateFormat';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';

function PaymentStatusBadge({ status }: { status?: 'paid' | 'pending' }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  if (status === 'paid') {
    return (
      <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
        Paid
      </Badge>
    );
  }
  return (
    <Badge className="border-red-200 bg-red-100 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      Pending
    </Badge>
  );
}

interface BuildBookingColumnsArgs {
  onAdjust: (passengerId: string) => void;
}

export function buildBookingColumns({ onAdjust }: BuildBookingColumnsArgs): ColumnDef<BookingRow>[] {
  return [
    {
      id: 'date',
      accessorKey: 'bookingDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      meta: { label: 'Date' },
      cell: ({ getValue }) => formatDisplayDate(getValue<string>()),
    },
    {
      id: 'invoiceNumber',
      accessorKey: 'invoiceNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice#" />,
      meta: { label: 'Invoice#' },
      cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
    },
    {
      id: 'passengerName',
      accessorKey: 'passengerName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name of PAX" />,
      meta: { label: 'Name of PAX' },
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      meta: { label: 'Amount' },
      cell: ({ getValue }) => `$${getValue<number>()}`,
    },
    {
      id: 'pnr',
      accessorFn: (b) => b.pnr ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="PNR" />,
      meta: { label: 'PNR' },
    },
    {
      id: 'airlineCode',
      accessorFn: (b) => b.airlineCode ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Airlines" />,
      meta: { label: 'Airlines' },
    },
    {
      id: 'depCity',
      accessorFn: (b) => b.depCity ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Departure City" />,
      meta: { label: 'Departure City' },
    },
    {
      id: 'arrCity',
      accessorFn: (b) => b.arrCity ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Arrival City" />,
      meta: { label: 'Arrival City' },
    },
    {
      id: 'depDate',
      accessorKey: 'depDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Departure Date" />,
      meta: { label: 'Departure Date' },
      cell: ({ getValue }) => formatDisplayDate(getValue<string | undefined>()),
    },
    {
      id: 'arrDate',
      accessorKey: 'arrDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Arrival Date" />,
      meta: { label: 'Arrival Date' },
      cell: ({ getValue }) => formatDisplayDate(getValue<string | undefined>()),
    },
    {
      id: 'paymentStatus',
      accessorFn: (b) => b.paymentStatus ?? '',
      header: () => <div className="text-center text-sm">Payment Status</div>,
      meta: { label: 'Payment Status' },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <PaymentStatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      id: 'remark',
      accessorFn: (b) => b.remark ?? '',
      header: () => <span className="text-sm">Remark</span>,
      meta: { label: 'Remark' },
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => onAdjust(row.original.id)}
        >
          Reissue/Refund
        </Button>
      ),
    },
  ];
}
