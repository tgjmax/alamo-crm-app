/** Shared by the Bookings ledger and the Groups results table, so the two cannot drift.
 * Truncates with an ellipsis at whatever width the column ends up with, and exposes the full text
 * as a native hover tooltip — the same `title` treatment CopyableText uses for its truncated values.
 *
 * Pair it with REMARK_WIDTH_CLASS (./table-density.ts) on the column's `meta.widthClass`, which is
 * what actually makes the column claim the table's leftover width. */
export function RemarkCell({ remark }: { remark: string }) {
  return (
    <span
      className="block max-w-[18ch] truncate text-muted-foreground 2xl:max-w-none"
      title={remark || undefined}
    >
      {remark}
    </span>
  );
}
