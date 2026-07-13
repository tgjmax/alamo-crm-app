import { useEffect, useMemo, useState } from 'react';
import { Column, SortingState, VisibilityState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { BOOKING_PAGE_SIZES, BookingRow, BookingSortBy, listBookings } from '@/api/bookings.api';
import { buildBookingColumns } from './booking-columns';
import { BookingFiltersPopover, BookingCustomFilters } from './booking-filters-popover';
import { RecordPaymentDialog } from './record-payment-dialog';
import { EditBookingDialog } from './edit-booking-dialog';
import { EditAdjustmentDialog } from './edit-adjustment-dialog';
import { DeleteBookingDialog, DeleteTarget } from './delete-booking-dialog';
import { COMPACT_CELL_CLASS, COMPACT_HEAD_CLASS } from '@/components/data-table/table-density';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useAuthStore } from '@/stores/authStore';
import { canDeleteBookings, canEditBookings } from '@/utils/permissions';

const PAYMENT_STATUS_OPTIONS = [
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
];

/** Fixed Tailwind width for columns whose content length is known (dates, PNR, airline, cities…) so
 * the browser gives the leftover width to the free-flowing columns (Name of PAX, Remark) instead.
 * The classes are 2xl-gated: below 2xl (MacBook-size screens) columns hug their content so the
 * table fits without forcing a horizontal scroll. */
function columnWidthClass(column: Column<BookingRow, unknown>): string | undefined {
  return (column.columnDef.meta as { widthClass?: string } | undefined)?.widthClass;
}


export interface BookingsTableScope {
  year?: number;
  month?: number;
}

interface BookingsTableProps {
  /** Restricts the table (and its query) to one calendar month — omitted on the Bookings page, set on the Sales page. */
  scope?: BookingsTableScope;
  defaultPageSize?: number;
  /** Keeps each consumer's React Query cache (and mutation invalidation) independent — e.g. 'bookings' vs 'sales'. */
  queryKeyPrefix: string;
}

export function BookingsTable({ scope, defaultPageSize = 25, queryKeyPrefix }: BookingsTableProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusValues, setStatusValues] = useState<Set<string>>(new Set());
  const [customFilters, setCustomFilters] = useState<BookingCustomFilters>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  // Departure City starts hidden on every screen size — re-showable via the View menu.
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ depCity: false });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  const [recordPaymentRow, setRecordPaymentRow] = useState<BookingRow | null>(null);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const [editAdjustmentId, setEditAdjustmentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const paymentStatus =
    statusValues.size === 1 ? (Array.from(statusValues)[0] as 'paid' | 'pending') : undefined;
  const sortBy = sorting[0]?.id as BookingSortBy | undefined;
  const sortDir = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  useEffect(() => {
    setPage(1);
  }, [scope?.year, scope?.month, debouncedQuery, paymentStatus, customFilters, sortBy, sortDir, pageSize]);

  const { data } = useQuery({
    queryKey: [queryKeyPrefix, 'list', { scope, page, pageSize, q: debouncedQuery, paymentStatus, customFilters, sortBy, sortDir }],
    queryFn: () =>
      listBookings({
        year: scope?.year,
        month: scope?.month,
        page,
        pageSize,
        q: debouncedQuery || undefined,
        paymentStatus,
        airlineCode: customFilters.airlineCode,
        depDate: customFilters.depDate,
        arrDate: customFilters.arrDate,
        sortBy,
        sortDir,
      }),
    placeholderData: keepPreviousData,
  });

  const bookings = data?.bookings ?? [];
  const total = data?.total ?? 0;

  const columns = useMemo(
    () =>
      buildBookingColumns({
        onRecordPayment: setRecordPaymentRow,
        // A New row edits its WHOLE invoice (shared trip data can't sensibly be edited per-passenger),
        // so it routes by bookingId. An adjustment carries its own trip data and edits alone.
        // Branches explicitly on bookingType rather than falling through on a falsy bookingId —
        // a New row missing its bookingId (a data anomaly) must NOT silently fall into the
        // adjustment editor, which would PATCH it as a Reissue/Refund.
        onEdit: (row) => {
          if (row.bookingType === 'New') {
            if (row.bookingId) setEditBookingId(row.bookingId);
            return;
          }
          setEditAdjustmentId(row.id);
        },
        // Delete is row-scoped: the table is one row per passenger, so this is what the user is
        // pointing at. The whole invoice has its own separate menu item.
        onDelete: (row) =>
          setDeleteTarget({
            scope: 'passenger',
            id: row.id,
            passengerName: row.passengerName,
            invoiceNumber: row.invoiceNumber,
            bookingType: row.bookingType,
            // New rows only — lets the dialog look up how many passengers the invoice really has,
            // so it warns about losing the invoice only when that is genuinely about to happen.
            bookingId: row.bookingId,
          }),
        onDeleteInvoice: (row) => {
          if (!row.bookingId) return;
          setDeleteTarget({
            scope: 'invoice',
            id: row.bookingId,
            passengerName: row.passengerName,
            invoiceNumber: row.invoiceNumber,
            bookingType: row.bookingType,
          });
        },
        canEdit: canEditBookings(user),
        canDelete: canDeleteBookings(user),
      }),
    [user]
  );

  const table = useReactTable({
    data: bookings,
    columns,
    state: { sorting, columnVisibility },
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Search bookings"
          placeholder="Search by PAX name or PNR…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 w-[220px] lg:w-[300px]"
        />
        <DataTableFacetedFilter
          title="Payment Status"
          options={PAYMENT_STATUS_OPTIONS}
          selectedValues={statusValues}
          onChange={setStatusValues}
        />
        <BookingFiltersPopover value={customFilters} onApply={setCustomFilters} />
        <DataTableViewOptions table={table} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={cn('whitespace-nowrap', COMPACT_HEAD_CLASS, columnWidthClass(header.column))}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={cn('hover:!bg-muted', row.index % 2 === 1 && 'bg-muted/60')}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn('whitespace-nowrap', COMPACT_CELL_CLASS, columnWidthClass(cell.column))}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        pageSizes={BOOKING_PAGE_SIZES}
        total={total}
        selectedCount={0}
        currentPageRowCount={bookings.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <RecordPaymentDialog row={recordPaymentRow} onOpenChange={(open) => !open && setRecordPaymentRow(null)} queryKeyPrefix={queryKeyPrefix} />
      <EditBookingDialog bookingId={editBookingId} onOpenChange={(open) => !open && setEditBookingId(null)} queryKeyPrefix={queryKeyPrefix} />
      <EditAdjustmentDialog adjustmentId={editAdjustmentId} onOpenChange={(open) => !open && setEditAdjustmentId(null)} queryKeyPrefix={queryKeyPrefix} />
      <DeleteBookingDialog target={deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} queryKeyPrefix={queryKeyPrefix} />
    </>
  );
}
