import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const delta = 1;
  const pages: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      pages.push(i);
    }
  }
  const result: (number | 'ellipsis')[] = [];
  let last: number | undefined;
  for (const page of pages) {
    if (last !== undefined) {
      if (page - last === 2) {
        result.push(last + 1);
      } else if (page - last !== 1) {
        result.push('ellipsis');
      }
    }
    result.push(page);
    last = page;
  }
  return result;
}

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  pageSizes: readonly number[];
  total: number;
  /** When rows are actually selected (Customers), the "N of M row(s) selected" caption
   * replaces the total-count caption. Absent or 0 — including every table with no row
   * selection at all — falls back to "Showing X–Y of Z", surfacing the total row count
   * instead of a permanent, meaningless "0 of N selected". */
  selectedCount?: number;
  currentPageRowCount?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function DataTablePagination({
  page,
  pageSize,
  pageSizes,
  total,
  selectedCount,
  currentPageRowCount,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = getPageNumbers(page, totalPages);

  const hasSelection = selectedCount !== undefined && selectedCount > 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
      <div className="flex-1 text-sm text-muted-foreground">
        {hasSelection
          ? `${selectedCount} of ${currentPageRowCount} row(s) selected.`
          : total === 0
            ? 'No results.'
            : `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}.`}
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger aria-label="Rows per page" className="h-8 w-[70px]">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium">
          Page {page} of {totalPages}
        </div>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
              />
            </PaginationItem>
            {pageNumbers.map((entry, index) =>
              entry === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={entry}>
                  <PaginationLink
                    href="#"
                    isActive={entry === page}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(entry);
                    }}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) onPageChange(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
