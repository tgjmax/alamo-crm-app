import { Column } from '@tanstack/react-table';

/** Compact density below 2xl (MacBook-size screens): tighter cell padding and smaller text,
 * including the sort-header buttons, which carry their own text-sm that must be overridden.
 * Full size from 2xl up (desktop monitors). Applied to TableHead/TableCell by the data tables
 * (Bookings/Sales, Customers) alongside their other classes. Since CopyableText's truncation
 * widths are ch-based, they tighten automatically with the smaller font. */
export const COMPACT_HEAD_CLASS =
  'px-1.5 text-xs 2xl:px-2 2xl:text-sm [&_button]:text-xs 2xl:[&_button]:text-sm';
export const COMPACT_CELL_CLASS = 'p-1.5 text-xs 2xl:p-2 2xl:text-sm';

/** Fixed Tailwind width for columns whose content length is known (dates, PNR, airline, cities…) so
 * the browser gives the leftover width to the free-flowing columns (Name of PAX, Remark) instead.
 * The classes are 2xl-gated: below 2xl (MacBook-size screens) columns hug their content so the
 * table fits without forcing a horizontal scroll. */
export function columnWidthClass<TData>(column: Column<TData, unknown>): string | undefined {
  return (column.columnDef.meta as { widthClass?: string } | undefined)?.widthClass;
}

/** The Remark column's width class — pairs with <RemarkCell> (./remark-cell.tsx).
 *
 * `w-full` + `max-w-0` is the standard trick for "take every pixel the fixed columns above don't
 * want, then let the child truncate at whatever that turns out to be". Without it the cell sizes to
 * its content and the table leaves dead space to the right on a wide screen. Both classes are
 * needed: `w-full` claims the slack, `max-w-0` stops the text from setting a minimum width (which
 * would push the table into a horizontal scroll instead of truncating).
 *
 * 2xl-gated like every other width class here — below 2xl the columns hug their content, and
 * RemarkCell's own 18ch cap keeps a long remark from blowing the table out. */
export const REMARK_WIDTH_CLASS = '2xl:w-full 2xl:max-w-0';
