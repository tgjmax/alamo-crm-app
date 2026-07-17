import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** Skeleton loading rows for a table body. Drop in place of the empty-state branch while a
 * query is on its FIRST load, so the user sees placeholder rows instead of a misleading
 * "No X found." flash. Keep `rows` at the current page size so the table height is stable. */
export function TableSkeleton({
  columns,
  rows = 8,
  cellClassName,
}: {
  columns: number;
  rows?: number;
  cellClassName?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} data-testid="table-skeleton-row">
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c} className={cn('whitespace-nowrap', cellClassName)}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
