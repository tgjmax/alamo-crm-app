/** Converts a native `<input type="date">` value ('YYYY-MM-DD') to the API's wire format ('MM-DD-YYYY'). */
export function isoToMdy(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${month}-${day}-${year}`;
}

/** Converts the API's wire format ('MM-DD-YYYY') to a native `<input type="date">` value ('YYYY-MM-DD'). */
export function mdyToIso(mdy: string): string {
  const [month, day, year] = mdy.split('-');
  return `${year}-${month}-${day}`;
}
