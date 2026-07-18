/**
 * Date fixtures for tests. Imported only from `*.test.tsx`, so this never reaches the bundle.
 *
 * A NEW booking's (and a Reissue's) Departure/Arrival Date calendar floors at the agency's today —
 * see `booking-form.tsx`'s `minTripDate`. A test that fills those fields with a hardcoded literal
 * therefore rots: it passes until that date slips into the past, then fails as native constraint
 * validation silently blocks the submit. Compute them relative to now instead.
 */

/** `offsetDays` from today as a 'YYYY-MM-DD' string, in the agency's default zone. */
export function isoDaysFromNow(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** A departure/arrival pair comfortably inside the allowed (future) window. */
export const FUTURE_DEP_DATE = isoDaysFromNow(30);
export const FUTURE_ARR_DATE = isoDaysFromNow(40);
