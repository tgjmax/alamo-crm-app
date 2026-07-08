import { formatDisplayDate } from './dateFormat';

describe('formatDisplayDate', () => {
  it('formats an ISO date-only string as "DD Mon YYYY"', () => {
    expect(formatDisplayDate('2023-01-04')).toBe('04 Jan 2023');
  });

  it('formats an ISO datetime string (e.g. a Date field serialized with a time component) the same way', () => {
    expect(formatDisplayDate('2023-09-29T00:00:00.000Z')).toBe('29 Sep 2023');
  });

  it('handles every month abbreviation correctly', () => {
    expect(formatDisplayDate('2023-12-31')).toBe('31 Dec 2023');
    expect(formatDisplayDate('2023-06-01')).toBe('01 Jun 2023');
  });

  it('returns an empty string for undefined or empty input', () => {
    expect(formatDisplayDate(undefined)).toBe('');
    expect(formatDisplayDate('')).toBe('');
  });

  it('returns genuinely unrecognized text unchanged', () => {
    expect(formatDisplayDate('not-a-date')).toBe('not-a-date');
  });
});
