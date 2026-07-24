import { formatDisplayDate, parseDateInput } from './dateFormat';

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

describe('parseDateInput', () => {
  it('parses the space-separated display format (day first, named month)', () => {
    expect(parseDateInput('02 Sep 1953')).toBe('1953-09-02');
    expect(parseDateInput('2 Sep 1953')).toBe('1953-09-02');
  });

  it('parses the dash-separated named-month format', () => {
    expect(parseDateInput('02-Sep-1953')).toBe('1953-09-02');
  });

  it('parses month-name-first, with or without a comma', () => {
    expect(parseDateInput('Sep 2 1953')).toBe('1953-09-02');
    expect(parseDateInput('Sep 2, 1953')).toBe('1953-09-02');
  });

  it('parses a full month name via its first three letters', () => {
    expect(parseDateInput('September 2 1953')).toBe('1953-09-02');
  });

  it('parses numeric input as MONTH-FIRST', () => {
    expect(parseDateInput('09/02/1953')).toBe('1953-09-02');
    expect(parseDateInput('9-2-1953')).toBe('1953-09-02');
    expect(parseDateInput('09021953')).toBe('1953-09-02');
  });

  it('parses ISO input unchanged', () => {
    expect(parseDateInput('1953-09-02')).toBe('1953-09-02');
  });

  it('rejects impossible dates that do not round-trip', () => {
    expect(parseDateInput('02/30/2021')).toBeNull();
    expect(parseDateInput('13/40/2020')).toBeNull();
  });

  it('rejects a 2-digit year', () => {
    expect(parseDateInput('09/02/53')).toBeNull();
  });

  it('rejects blanks and garbage', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput('   ')).toBeNull();
    expect(parseDateInput('hello')).toBeNull();
    expect(parseDateInput('2 Sep')).toBeNull();
  });
});
