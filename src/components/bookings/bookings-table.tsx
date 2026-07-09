import { Fragment, FormEvent, useEffect, useMemo, useState } from 'react';
import { SortingState, VisibilityState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { BOOKING_PAGE_SIZES, BookingRow, BookingSortBy, createAdjustment, listBookings } from '@/api/bookings.api';
import { buildBookingColumns } from './booking-columns';
import { BookingFiltersPopover, BookingCustomFilters } from './booking-filters-popover';
import { RecordPaymentDialog } from './record-payment-dialog';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useAuthStore } from '@/stores/authStore';
import { canEditBookings } from '@/utils/permissions';

const PAYMENT_STATUS_OPTIONS = [
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
];

const emptyAdjustmentForm = {
  bookingType: 'Reissue' as 'Reissue' | 'Refund',
  bookingDate: '',
  pnr: '',
  airlineCode: '',
  depCity: '',
  arrCity: '',
  depDate: '',
  arrDate: '',
  amount: '',
  paymentStatus: 'paid' as 'paid' | 'pending',
  paymentType: 'card' as 'card' | 'check' | 'cash',
  pendingAmount: '',
};

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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  const [adjustingPassengerId, setAdjustingPassengerId] = useState<string | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState(emptyAdjustmentForm);
  const [recordPaymentRow, setRecordPaymentRow] = useState<BookingRow | null>(null);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

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

  const adjustmentMutation = useMutation({
    mutationFn: ({ passengerId, input }: { passengerId: string; input: Parameters<typeof createAdjustment>[1] }) =>
      createAdjustment(passengerId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
      setAdjustingPassengerId(null);
      setAdjustmentForm(emptyAdjustmentForm);
    },
  });

  function handleAdjustmentSubmit(e: FormEvent, passengerId: string) {
    e.preventDefault();
    adjustmentMutation.mutate({
      passengerId,
      input: {
        bookingType: adjustmentForm.bookingType,
        bookingDate: adjustmentForm.bookingDate,
        amount: Number(adjustmentForm.amount),
        pnr: adjustmentForm.pnr,
        airlineCode: adjustmentForm.airlineCode || undefined,
        depCity: adjustmentForm.depCity || undefined,
        arrCity: adjustmentForm.arrCity || undefined,
        depDate: adjustmentForm.depDate || undefined,
        arrDate: adjustmentForm.arrDate || undefined,
        payment: {
          status: adjustmentForm.paymentStatus,
          type: adjustmentForm.paymentType,
          amount: adjustmentForm.paymentStatus === 'pending' ? Number(adjustmentForm.pendingAmount) : 0,
        },
      },
    });
  }

  const columns = useMemo(
    () =>
      buildBookingColumns({
        onAdjust: setAdjustingPassengerId,
        onRecordPayment: setRecordPaymentRow,
        canEditPayment: canEditBookings(user),
      }),
    [setAdjustingPassengerId, user]
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
                  <TableHead key={header.id} className="whitespace-nowrap">
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
                <Fragment key={row.id}>
                  <TableRow className={cn('hover:!bg-muted', row.index % 2 === 1 && 'bg-muted/60')}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {adjustingPassengerId === row.original.id && (
                    <TableRow>
                      <TableCell colSpan={row.getVisibleCells().length}>
                        <form onSubmit={(e) => handleAdjustmentSubmit(e, row.original.id)} className="space-y-2">
                          <Select
                            value={adjustmentForm.bookingType}
                            onValueChange={(v) =>
                              setAdjustmentForm({ ...adjustmentForm, bookingType: v as 'Reissue' | 'Refund' })
                            }
                          >
                            <SelectTrigger aria-label="Adjustment type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Reissue">Reissue</SelectItem>
                              <SelectItem value="Refund">Refund</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            aria-label="Adjustment booking date"
                            type="date"
                            value={adjustmentForm.bookingDate}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, bookingDate: e.target.value })}
                            required
                          />
                          <Input
                            aria-label="Adjustment PNR"
                            value={adjustmentForm.pnr}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, pnr: e.target.value })}
                            required
                          />
                          <Input
                            aria-label="Adjustment airline code"
                            value={adjustmentForm.airlineCode}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, airlineCode: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment departure city"
                            value={adjustmentForm.depCity}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, depCity: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment arrival city"
                            value={adjustmentForm.arrCity}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, arrCity: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment departure date"
                            type="date"
                            value={adjustmentForm.depDate}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, depDate: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment arrival date"
                            type="date"
                            value={adjustmentForm.arrDate}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, arrDate: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment amount"
                            type="number"
                            value={adjustmentForm.amount}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                            required
                          />
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Label>Payment status</Label>
                              <Select
                                value={adjustmentForm.paymentStatus}
                                onValueChange={(v) =>
                                  setAdjustmentForm({ ...adjustmentForm, paymentStatus: v as 'paid' | 'pending' })
                                }
                              >
                                <SelectTrigger aria-label="Adjustment payment status" className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label>Payment type</Label>
                              <Select
                                value={adjustmentForm.paymentType}
                                onValueChange={(v) =>
                                  setAdjustmentForm({ ...adjustmentForm, paymentType: v as 'card' | 'check' | 'cash' })
                                }
                              >
                                <SelectTrigger aria-label="Adjustment payment type" className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="card">Card</SelectItem>
                                  <SelectItem value="check">Check</SelectItem>
                                  <SelectItem value="cash">Cash</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {adjustmentForm.paymentStatus === 'pending' && (
                            <Input
                              aria-label="Adjustment amount owed"
                              type="number"
                              value={adjustmentForm.pendingAmount}
                              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, pendingAmount: e.target.value })}
                              placeholder="Amount owed"
                              required
                            />
                          )}
                          <Button type="submit" size="sm">
                            Save adjustment
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
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
    </>
  );
}
