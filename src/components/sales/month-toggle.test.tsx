import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MonthToggle } from './month-toggle';

describe('MonthToggle', () => {
  it('renders the month and year as separate controls', () => {
    render(<MonthToggle value={{ year: 2020, month: 7 }} onChange={() => {}} />);
    expect(screen.getByText('July')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('steps the month forward within a year without touching the year', async () => {
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: 2020, month: 7 }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2020, month: 8 });
  });

  it('steps the month forward across a year boundary (December to January)', async () => {
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: 2020, month: 12 }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2021, month: 1 });
  });

  it('steps the month backward across a year boundary (January to December)', async () => {
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: 2020, month: 1 }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2019, month: 12 });
  });

  it('the Year control jumps directly to the same month in the previous/next year', async () => {
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: 2020, month: 7 }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2021, month: 7 });

    await userEvent.click(screen.getByRole('button', { name: 'Previous year' }));
    expect(onChange).toHaveBeenCalledWith({ year: 2019, month: 7 });
  });

  it('disables stepping past the current month and year (no future dates)', () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    render(<MonthToggle value={{ year, month }} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
  });

  it('clamps the month down when jumping to the current year would otherwise land on a future month', async () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    if (month === 12) {
      // Nothing is "after" December, so this scenario can't be constructed this month.
      return;
    }
    const futureMonthWithinYear = month + 1;
    const onChange = vi.fn();
    render(<MonthToggle value={{ year: year - 1, month: futureMonthWithinYear }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(onChange).toHaveBeenCalledWith({ year, month });
  });
});
