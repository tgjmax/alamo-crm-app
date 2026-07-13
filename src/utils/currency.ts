/** The single money formatter for the whole app: always two decimals, so a ledger column reads
 * 1234.09 / 1234.00 rather than 1234.09 / 1234. Amounts are USD and entered by staff; there is no
 * multi-currency or locale requirement, hence a plain `toFixed(2)` rather than `Intl.NumberFormat`
 * (which would also introduce thousands separators the Excel workbooks this app replaces don't use). */
export function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}
