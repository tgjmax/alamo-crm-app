import { formatWidgetValue, formatWidgetKey, formatAxisValue, buildKeyLabel } from './widgetFormat';

describe('formatWidgetValue', () => {
  it('formats a count as a separated integer', () => {
    expect(formatWidgetValue(1247, { fn: 'count' })).toBe('1,247');
  });

  it('formats a sum of amount as USD currency', () => {
    expect(formatWidgetValue(124500.5, { fn: 'sum', field: 'amount' })).toBe('$124,500.50');
  });

  it('rounds an average to cents rather than printing a raw float', () => {
    expect(formatWidgetValue(183.33333333333334, { fn: 'avg', field: 'amount' })).toBe('$183.33');
  });

  // 0 is a real measured value, not "no data" — it must never render blank.
  it('formats a zero money value as $0.00, never blank', () => {
    expect(formatWidgetValue(0, { fn: 'sum', field: 'paymentAmount' })).toBe('$0.00');
  });

  it('formats a zero count as 0', () => {
    expect(formatWidgetValue(0, { fn: 'count' })).toBe('0');
  });
});

describe('formatWidgetKey', () => {
  it('renders the (none) bucket as Unspecified', () => {
    expect(formatWidgetKey('(none)', 'airlineCode')).toBe('Unspecified');
  });

  it('humanises a month key', () => {
    expect(formatWidgetKey('2026-07', 'month')).toBe('Jul 2026');
  });

  it('applies keyLabel for a non-month dimension', () => {
    expect(formatWidgetKey('u1', 'createdBy', (k) => (k === 'u1' ? 'Priya Nair' : k))).toBe('Priya Nair');
  });

  it('passes an unrecognised key through untouched when no keyLabel is given', () => {
    expect(formatWidgetKey('QR', 'airlineCode')).toBe('QR');
  });

  // Defensive: a malformed month key must not index off the end of the month table.
  it('passes a malformed month key through rather than producing undefined', () => {
    expect(formatWidgetKey('2026-13', 'month')).toBe('2026-13');
  });
});

describe('formatAxisValue', () => {
  it('formats a money aggregation compactly for the axis', () => {
    expect(formatAxisValue(124500.5, { fn: 'sum', field: 'amount' })).toBe('$124.5K');
  });

  it('formats a count aggregation compactly for the axis', () => {
    expect(formatAxisValue(124501, { fn: 'count' })).toBe('124.5K');
  });

  // 0 is a real measured value, not "no data" — the compact axis formatter must never blank it.
  it('renders a zero money value as $0, never blank', () => {
    expect(formatAxisValue(0, { fn: 'sum', field: 'amount' })).toBe('$0');
  });

  it('renders a zero count as 0, never blank', () => {
    expect(formatAxisValue(0, { fn: 'count' })).toBe('0');
  });
});

describe('buildKeyLabel', () => {
  const DIRECTORY = [{ id: 'u1', name: 'Priya Nair' }, { id: 'u2', name: 'Sam Roy' }];

  it('maps a known createdBy id to the agent name', () => {
    expect(buildKeyLabel('createdBy', DIRECTORY)('u1')).toBe('Priya Nair');
  });

  it('passes an unknown createdBy id through unchanged (e.g. a deactivated user)', () => {
    expect(buildKeyLabel('createdBy', DIRECTORY)('u404')).toBe('u404');
  });

  it('is the identity function for any dimension other than createdBy', () => {
    expect(buildKeyLabel('airlineCode', DIRECTORY)('QR')).toBe('QR');
    expect(buildKeyLabel(undefined, DIRECTORY)('QR')).toBe('QR');
  });
});
