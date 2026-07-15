import { formatPct, pctColorClass } from './pctFormat';

describe('formatPct', () => {
  it('signs a positive change', () => {
    expect(formatPct(12.4)).toBe('+12.4%');
  });

  it('signs a negative change', () => {
    expect(formatPct(-20)).toBe('-20%');
  });

  // A null pct means the previous period was ZERO — there is no comparison, not a zero one.
  it('renders a dash for null', () => {
    expect(formatPct(null)).toBe('—');
  });
});

describe('pctColorClass', () => {
  it('is green for an increase and red for a decrease', () => {
    expect(pctColorClass(5)).toContain('green');
    expect(pctColorClass(-5)).toContain('red');
  });

  // Neither an increase nor a decrease — colouring it would imply a direction that isn't there.
  it('has no colour for null or an exact zero', () => {
    expect(pctColorClass(null)).toBe('');
    expect(pctColorClass(0)).toBe('');
  });
});
