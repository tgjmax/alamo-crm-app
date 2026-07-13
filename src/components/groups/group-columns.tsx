import { ColumnDef } from '@tanstack/react-table';
import { GroupResultRow } from '@/api/groups.api';
import { formatDisplayDate } from '@/utils/dateFormat';
import { CopyableText } from '@/components/data-table/copyable-text';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { PaymentStatusBadge } from '@/components/data-table/payment-status-badge';

/** Mirrors buildBookingColumns() in ../bookings/booking-columns.tsx, minus the row-actions column
 * (the group page is a read-only browser of a saved segment). Keep the two in step. */
export function buildGroupColumns(): ColumnDef<GroupResultRow>[] {
  return [
    {
      id: 'date',
      accessorKey: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Booking Date" />,
      meta: { label: 'Booking Date', widthClass: '2xl:w-32' },
      cell: ({ getValue }) => formatDisplayDate(getValue<string>()),
    },
    {
      id: 'invoiceNumber',
      // A Reissue/Refund adjustment has no parent Booking, so no invoice number of its own — fall
      // back to its bookingType (REISSUE/REFUND) so it's never visually indistinguishable from a
      // real booking. Mirrors the backend's own uInvoiceNumber fallback in bookingQuery.service.ts;
      // deliberately NOT done in the Groups aggregation itself (groupQuery.service.ts) since that
      // field also backs saved Group filter conditions, where the fallback must not exist.
      accessorFn: (r) => r.invoiceNumber ?? r.bookingType.toUpperCase(),
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
      accessorFn: (r) => r.pnr ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="PNR" />,
      meta: { label: 'PNR', widthClass: '2xl:w-20' },
    },
    {
      id: 'airlineCode',
      accessorFn: (r) => r.airlineCode ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Airlines" />,
      meta: { label: 'Airlines', widthClass: '2xl:w-16' },
    },
    {
      id: 'depCity',
      accessorFn: (r) => r.depCity ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dep City" />,
      meta: { label: 'Departure City', widthClass: '2xl:w-20' },
    },
    {
      id: 'arrCity',
      accessorFn: (r) => r.arrCity ?? '',
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
      accessorFn: (r) => r.paymentStatus ?? '',
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
      accessorFn: (r) => r.remark ?? '',
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
  ];
}
