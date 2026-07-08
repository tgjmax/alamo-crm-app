import { Fragment, FormEvent, useEffect, useState } from 'react';
import { SortingState, VisibilityState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BOOKING_PAGE_SIZES, BookingSortBy, createAdjustment, listBookings } from '../api/bookings.api';
import { buildBookingColumns } from '@/components/bookings/booking-columns';
import { BookingFiltersPopover, BookingCustomFilters } from '@/components/bookings/booking-filters-popover';
import { CreateBookingDialog } from '@/components/bookings/create-booking-dialog';
import { ImportBookingsDialog } from '@/components/bookings/import-bookings-dialog';
import { ExportBookingsDialog } from '@/components/bookings/export-bookings-dialog';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';

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
};

export default function BookingsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusValues, setStatusValues] = useState<Set<string>>(new Set());
  const [customFilters, setCustomFilters] = useState<BookingCustomFilters>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [adjustingPassengerId, setAdjustingPassengerId] = useState<string | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState(emptyAdjustmentForm);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
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
  }, [debouncedQuery, paymentStatus, customFilters, sortBy, sortDir, pageSize]);

  const { data } = useQuery({
    queryKey: ['bookings', 'list', { page, pageSize, q: debouncedQuery, paymentStatus, customFilters, sortBy, sortDir }],
    queryFn: () =>
      listBookings({
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
      queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] });
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
        payment: { status: 'paid', type: 'card' },
      },
    });
  }

  const columns = buildBookingColumns({ onAdjust: setAdjustingPassengerId });

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
    <div className="mx-auto max-w-[1800px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Bookings</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowExport(true)}>
            Export
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowImport(true)}>
            Import Bookings
          </Button>
          <Button type="button" size="sm" onClick={() => setShowCreate(true)}>
            Create booking
          </Button>
        </div>
      </div>

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
                  <TableRow>
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

      <CreateBookingDialog open={showCreate} onOpenChange={setShowCreate} />
      <ImportBookingsDialog open={showImport} onOpenChange={setShowImport} />
      <ExportBookingsDialog open={showExport} onOpenChange={setShowExport} />
    </div>
  );
}
