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

/**
 * Formats an ISO datetime string (e.g. an audit entry's `createdAt`) for display as
 * 'DD Mon YYYY, HH:MM AM/PM' (locale-dependent time formatting via `toLocaleString`).
 * Unlike `formatDisplayDate`, this INCLUDES time-of-day — the audit log needs it because
 * two entries can land on the same calendar day, and only the time tells you their order.
 * Falsy or unparseable input passes through unchanged rather than being silently misformatted.
 */
export function formatDisplayDateTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The later of two 'YYYY-MM-DD' dates, ignoring blanks. Used to build a date field's lower bound
 * from more than one rule at once — e.g. an Arrival Date that must be both in the future AND on or
 * after the chosen Departure Date. Zero-padded ISO day strings sort lexicographically, so a string
 * compare is a date compare; no Date objects (and no timezone hazard) involved.
 */
export function maxIsoDate(...dates: (string | undefined)[]): string | undefined {
  const present = dates.filter((d): d is string => Boolean(d));
  return present.length ? present.reduce((a, b) => (a >= b ? a : b)) : undefined;
}
