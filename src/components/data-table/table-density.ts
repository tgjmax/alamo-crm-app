/** Compact density below 2xl (MacBook-size screens): tighter cell padding and smaller text,
 * including the sort-header buttons, which carry their own text-sm that must be overridden.
 * Full size from 2xl up (desktop monitors). Applied to TableHead/TableCell by the data tables
 * (Bookings/Sales, Customers) alongside their other classes. Since CopyableText's truncation
 * widths are ch-based, they tighten automatically with the smaller font. */
export const COMPACT_HEAD_CLASS =
  'px-1.5 text-xs 2xl:px-2 2xl:text-sm [&_button]:text-xs 2xl:[&_button]:text-sm';
export const COMPACT_CELL_CLASS = 'p-1.5 text-xs 2xl:p-2 2xl:text-sm';
