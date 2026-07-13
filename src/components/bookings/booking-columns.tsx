import { ColumnDef } from '@tanstack/react-table';
import { BookingRow } from '@/api/bookings.api';
import { formatDisplayDate } from '@/utils/dateFormat';
import { CopyableText } from '@/components/data-table/copyable-text';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { PaymentStatusBadge } from '@/components/data-table/payment-status-badge';
import { RemarkCell } from '@/components/data-table/remark-cell';
import { REMARK_WIDTH_CLASS } from '@/components/data-table/table-density';
import { formatCurrency } from '@/utils/currency';
import { BookingRowActions } from './booking-row-actions';

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
      cell: ({ getValue }) => formatCurrency(getValue<number>()),
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
      meta: { label: 'Remark', widthClass: REMARK_WIDTH_CLASS },
      enableSorting: false,
      cell: ({ getValue }) => <RemarkCell remark={getValue<string>()} />,
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
