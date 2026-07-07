const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Converts a native `<input type="date">` value ('YYYY-MM-DD') to the API's wire format ('DD-MMM-YYYY'). */
export function isoToDob(iso: string): string {
  const [year, month, day] = iso.split('-');
  const monthAbbr = MONTH_ABBREVIATIONS[Number(month) - 1];
  return `${day}-${monthAbbr}-${year}`;
}

/** Converts the API's wire format ('DD-MMM-YYYY') to a native `<input type="date">` value ('YYYY-MM-DD'). */
export function dobToIso(dob: string): string {
  const [day, monthAbbr, year] = dob.split('-');
  const monthIndex = MONTH_ABBREVIATIONS.findIndex((m) => m.toLowerCase() === monthAbbr.toLowerCase());
  const month = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converts the API's wire format ('DD-MMM-YYYY') to a digits-only 'MMDDYYYY' string, for copy-to-clipboard. */
export function dobToDigits(dob: string): string {
  const [day, monthAbbr, year] = dob.split('-');
  const monthIndex = MONTH_ABBREVIATIONS.findIndex((m) => m.toLowerCase() === monthAbbr.toLowerCase());
  const month = String(monthIndex + 1).padStart(2, '0');
  return `${month}${day}${year}`;
}
