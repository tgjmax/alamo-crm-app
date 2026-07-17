import { useMemo } from 'react';
import {
  OnChangeFn,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { GROUP_PAGE_SIZES, GroupQueryResult } from '@/api/groups.api';
import { buildGroupColumns } from './group-columns';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { COMPACT_CELL_CLASS, COMPACT_HEAD_CLASS, columnWidthClass } from '@/components/data-table/table-density';
import { TableSkeleton } from '@/components/ui/table-skeleton';

interface GroupResultsTableProps {
  result: GroupQueryResult | null;
  busy: boolean;
  page: number;
  pageSize: number;
  sorting: SortingState;
  columnVisibility: VisibilityState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortingChange: OnChangeFn<SortingState>;
  onColumnVisibilityChange: OnChangeFn<VisibilityState>;
}

/** Fully controlled and fetch-free: the parent owns page/pageSize/sorting/columnVisibility and
 * feeds them into its own query. That is what lets GroupResultsPage (TanStack Query) and
 * GroupEditorPage (an imperative, button-triggered preview) share one table. Do not move fetching
 * in here, and do not make any of these props optional with an internal default. */
export function GroupResultsTable({
  result,
  busy,
  page,
  pageSize,
  sorting,
  columnVisibility,
  onPageChange,
  onPageSizeChange,
  onSortingChange,
  onColumnVisibilityChange,
}: GroupResultsTableProps) {
  const columns = useMemo(() => buildGroupColumns(), []);
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility },
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getRowId: (row) => row.id,
    onSortingChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
  });

  // Editor pre-preview: idle with nothing to show → render nothing (unchanged).
  if (!result && !busy) return null;

  // First load (busy, no data yet): show a skeleton table shell instead of a blank flash.
  if (!result) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn('whitespace-nowrap', COMPACT_HEAD_CLASS, columnWidthClass(header.column))}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <TableSkeleton columns={columns.length} rows={pageSize} cellClassName={COMPACT_CELL_CLASS} />
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {total} result{total === 1 ? '' : 's'}
        </p>
        <DataTableViewOptions table={table} />
      </div>

      <div className={cn('rounded-md border', busy && 'opacity-70')}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn('whitespace-nowrap', COMPACT_HEAD_CLASS, columnWidthClass(header.column))}
                  >
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
                  No results match these conditions.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={cn('hover:!bg-muted', row.index % 2 === 1 && 'bg-muted/60')}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn('whitespace-nowrap', COMPACT_CELL_CLASS, columnWidthClass(cell.column))}
                    >
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
        pageSizes={GROUP_PAGE_SIZES}
        total={total}
        selectedCount={0}
        currentPageRowCount={rows.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
