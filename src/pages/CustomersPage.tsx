import { useEffect, useMemo, useState } from 'react';
import { SortingState, VisibilityState, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  CUSTOMER_PAGE_SIZES,
  CustomerListItem,
  bulkDeleteCustomers,
  listCustomers,
} from '../api/customers.api';
import { buildCustomerColumns } from '@/components/customers/customer-columns';
import { AddEditCustomerDialog } from '@/components/customers/add-edit-customer-dialog';
import { DeleteCustomersDialog } from '@/components/customers/delete-customers-dialog';
import { ImportCustomersDialog } from '@/components/customers/import-customers-dialog';
import { ExportCustomersDialog } from '@/components/customers/export-customers-dialog';
import { ViewPassportDialog } from '@/components/customers/view-passport-dialog';
import { COMPACT_CELL_CLASS, COMPACT_HEAD_CLASS } from '@/components/data-table/table-density';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';

const STATUS_OPTIONS = [
  { label: 'Verified', value: 'verified' },
  { label: 'Not Verified', value: 'unverified' },
];

export default function CustomersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusValues, setStatusValues] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [viewingPassportCustomer, setViewingPassportCustomer] = useState<CustomerListItem | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const status = statusValues.size === 1 ? (Array.from(statusValues)[0] as 'verified' | 'unverified') : undefined;
  // Ticketing Name renders as "Lastname/Firstname…", so sorting by it is
  // equivalent to sorting by lastName (which the backend already supports).
  const sortColumnId = sorting[0]?.id;
  const sortBy =
    sortColumnId === 'givenName'
      ? 'givenName'
      : sortColumnId === 'lastName' || sortColumnId === 'ticketingName'
        ? 'lastName'
        : undefined;
  const sortDir = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, sortBy, sortDir, pageSize]);

  const { data } = useQuery({
    queryKey: ['customers', 'list', { page, pageSize, q: debouncedQuery, status, sortBy, sortDir }],
    queryFn: () => listCustomers({ page, pageSize, q: debouncedQuery || undefined, status, sortBy, sortDir }),
    placeholderData: keepPreviousData,
  });

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteCustomers(ids),
    onSuccess: (_result, ids) => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
      setRowSelection((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
      setPendingDeleteIds(null);
    },
  });

  const columns = useMemo(
    () =>
      buildCustomerColumns({
        onEdit: (customer) => {
          setEditingCustomer(customer);
          setShowAddEdit(true);
        },
        onDelete: (customer) => setPendingDeleteIds([customer.id]),
        onViewPassport: (customer) => setViewingPassportCustomer(customer),
      }),
    []
  );

  const table = useReactTable({
    data: customers,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedIds = Object.keys(rowSelection);

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowExport(true)}>
            Export
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowImport(true)}>
            Import Customers
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingCustomer(null);
              setShowAddEdit(true);
            }}
          >
            Add Customer
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Search customers"
          placeholder="Search by name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 w-[200px] lg:w-[300px]"
        />
        <DataTableFacetedFilter
          title="Status"
          options={STATUS_OPTIONS}
          selectedValues={statusValues}
          onChange={setStatusValues}
        />
        {selectedIds.length > 0 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={() => setPendingDeleteIds(selectedIds)}
          >
            Delete ({selectedIds.length})
          </Button>
        )}
        <DataTableViewOptions table={table} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={cn('whitespace-nowrap', COMPACT_HEAD_CLASS)}>
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
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={cn('hover:!bg-muted', row.index % 2 === 1 && 'bg-muted/60')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn('whitespace-nowrap', COMPACT_CELL_CLASS)}>
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
        pageSizes={CUSTOMER_PAGE_SIZES}
        total={total}
        selectedCount={selectedIds.length}
        currentPageRowCount={customers.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <AddEditCustomerDialog
        open={showAddEdit}
        onOpenChange={(open) => {
          setShowAddEdit(open);
          if (!open) setEditingCustomer(null);
        }}
        customer={editingCustomer}
      />
      <ImportCustomersDialog open={showImport} onOpenChange={setShowImport} />
      <ExportCustomersDialog open={showExport} onOpenChange={setShowExport} />
      <ViewPassportDialog
        open={viewingPassportCustomer !== null}
        onOpenChange={(open) => !open && setViewingPassportCustomer(null)}
        customer={viewingPassportCustomer}
      />
      <DeleteCustomersDialog
        open={pendingDeleteIds !== null}
        onOpenChange={(open) => !open && setPendingDeleteIds(null)}
        count={pendingDeleteIds?.length ?? 0}
        isPending={bulkDeleteMutation.isPending}
        onConfirm={() => pendingDeleteIds && bulkDeleteMutation.mutate(pendingDeleteIds)}
      />
    </div>
  );
}
