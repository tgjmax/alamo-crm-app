/** Sabre ticketing-name format: `LastName/GivenName`, where GivenName is the first name plus
 * middle name (middle omitted when blank). Matches the ledger's existing passenger names
 * (SMITH/JOHN, JOSEPH/SHINY S) and the Customers "Ticketing Name" column. */
export function ticketingName(parts: { firstName: string; middleName?: string; lastName: string }): string {
  const given = [parts.firstName, parts.middleName]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return `${parts.lastName}/${given}`;
}
