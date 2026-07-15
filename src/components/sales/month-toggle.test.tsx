import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MonthToggle } from './month-toggle';

// `current` is the agency's current month, passed in explicitly — so these tests are deterministic
// rather than depending on the real clock (as the future-disable cases used to).
const CURRENT = { year: 2026, month: 7 };

describe('MonthToggle', () => {
  it('renders the month and year as separate controls', () => {
    render(<MonthToggle value={{ year: 2020, month: 7 }} onChange={() => {}} current={CURRENT} />);
    expect(screen.getByText('July')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('steps the month forward within a year without touching the year', async () => {
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: 2020, month: 7 }} onChange={onChange} current={CURRENT} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2020, month: 8 });
  });

  it('steps the month forward across a year boundary (December to January)', async () => {
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: 2020, month: 12 }} onChange={onChange} current={CURRENT} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2021, month: 1 });
  });

  it('steps the month backward across a year boundary (January to December)', async () => {
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: 2020, month: 1 }} onChange={onChange} current={CURRENT} />);
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2019, month: 12 });
  });

  it('the Year control jumps directly to the same month in the previous/next year', async () => {
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: 2020, month: 7 }} onChange={onChange} current={CURRENT} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2021, month: 7 });

    await userEvent.click(screen.getByRole('button', { name: 'Previous year' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2019, month: 7 });
  });

  it('disables stepping past the current month and year (no future dates)', () => {
    render(<MonthToggle value={CURRENT} onChange={() => {}} current={CURRENT} />);
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
  });

  it('clamps the month down when jumping to the current year would otherwise land on a future month', async () => {
    // value is Aug of last year; jumping +1 year would land on Aug of the current year, which is
    // after the current month (July) — so it clamps down to July.
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: 2025, month: 8 }} onChange={onChange} current={CURRENT} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: 7 });
  });
});
