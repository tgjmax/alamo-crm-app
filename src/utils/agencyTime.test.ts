import { agencyYearMonth } from './agencyTime';

describe('agencyYearMonth', () => {
  // 2am UTC on 1 Aug is 9pm CDT on 31 Jul — still July in Texas. UTC would call it August.
  it('reports the agency month, not the UTC month, in the evening-boundary window', () => {
    const utcAlreadyNextMonth = new Date('2026-08-01T02:00:00Z');
    expect(agencyYearMonth('America/Chicago', utcAlreadyNextMonth)).toEqual({ year: 2026, month: 7 });
  });

  it('crosses the year boundary correctly (CST in winter)', () => {
    const newYearUtc = new Date('2026-01-01T05:30:00Z'); // 11:30pm CST 31 Dec
    expect(agencyYearMonth('America/Chicago', newYearUtc)).toEqual({ year: 2025, month: 12 });
  });

  it('agrees with UTC mid-day', () => {
    const midday = new Date('2026-07-14T18:00:00Z');
    expect(agencyYearMonth('America/Chicago', midday)).toEqual({ year: 2026, month: 7 });
  });

  it('handles a zone ahead of UTC (India rolls to the next day earlier)', () => {
    const evening = new Date('2026-07-31T20:00:00Z'); // 01:30 IST 1 Aug
    expect(agencyYearMonth('Asia/Kolkata', evening)).toEqual({ year: 2026, month: 8 });
  });
});
