/**
 * "Now" is reckoned in the AGENCY's timezone (from org branding settings), not the viewer's local
 * clock or UTC — so the Sales page opens on the agency's current month, the same month the backend
 * treats as current. Mirror of the backend's `agencyTime.ts` (the two repos share no code).
 */
export const DEFAULT_TIME_ZONE = 'America/Chicago';

/**
 * The current year and month (1-based) in `timeZone`. `Intl` handles DST, so no offset is
 * hardcoded. `now` is injected so this is deterministic in tests; production passes only `timeZone`.
 */
export function agencyYearMonth(
  timeZone: string,
  now: Date = new Date()
): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const value = (type: 'year' | 'month'): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`agencyYearMonth: missing ${type} part`);
    return Number(part.value);
  };

  return { year: value('year'), month: value('month') };
}

/**
 * Today's calendar date in `timeZone`, as the `YYYY-MM-DD` string every date control in this app
 * speaks. Used as the earliest selectable Departure/Arrival date when ENTERING a new booking or
 * reissue — a flight being ticketed now cannot depart in the past. Reckoned in the agency's zone
 * rather than the viewer's, so an agent on a laptop set to another timezone doesn't lose (or gain)
 * a day at midnight. `en-CA` formats as `YYYY-MM-DD` natively. `now` is injected for tests.
 */
export function agencyToday(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
