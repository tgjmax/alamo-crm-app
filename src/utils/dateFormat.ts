const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

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

/** Converts the API's wire format ('DD-MMM-YYYY') to a 'DDMMMYYYY' string (dashes stripped), for copy-to-clipboard. */
export function dobToDigits(dob: string): string {
  return dob.replace(/-/g, '');
}

/**
 * Formats an ISO date-only ('YYYY-MM-DD') or ISO datetime
 * ('YYYY-MM-DDTHH:mm:ss.sssZ' — what a Mongoose `Date` field serializes to)
 * string for display as 'DD Mon YYYY'. Falsy or unrecognized input passes
 * through unchanged rather than being silently misformatted.
 */
export function formatDisplayDate(value: string | undefined): string {
  if (!value) return '';
  const match = ISO_DATE_PREFIX.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const monthAbbr = MONTH_ABBREVIATIONS[Number(month) - 1];
  if (!monthAbbr) return value;
  return `${day} ${monthAbbr} ${year}`;
}
