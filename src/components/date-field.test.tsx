import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateField } from './date-field';

describe('DateField minDate', () => {
  it('leaves the field unbounded when no minDate is given', () => {
    render(<DateField ariaLabel="Departure Date" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Departure Date')).not.toHaveAttribute('min');
  });

  it('sets the hidden native input min, which is what actually blocks a typed or pasted date', () => {
    // The calendar alone is not enough: the visually-hidden native input is what carries the form
    // value and what native constraint validation runs against on submit.
    render(<DateField ariaLabel="Departure Date" value="" onChange={vi.fn()} minDate="2026-07-18" />);
    expect(screen.getByLabelText('Departure Date')).toHaveAttribute('min', '2026-07-18');
  });

  it('disables days before minDate in the calendar', async () => {
    const user = userEvent.setup();
    render(
      <DateField ariaLabel="Departure Date" value="2026-07-20" onChange={vi.fn()} minDate="2026-07-18" />
    );
    // Clicking the field itself opens the calendar (there is no separate calendar button anymore).
    await user.click(screen.getByLabelText('Departure Date — type a date'));

    // react-day-picker renders a disabled day button for anything matched by `disabled`.
    const before = await screen.findByRole('button', { name: /July 17th, 2026/ });
    expect(before).toBeDisabled();
    const onOrAfter = screen.getByRole('button', { name: /July 18th, 2026/ });
    expect(onOrAfter).not.toBeDisabled();
  });
});

describe('DateField calendar captions', () => {
  it('renders month and year dropdowns instead of month-by-month stepping', async () => {
    const user = userEvent.setup();
    render(<DateField ariaLabel="Date of birth" value="1990-05-15" onChange={vi.fn()} />);
    // Clicking the field itself opens the calendar (there is no separate calendar button anymore).
    await user.click(screen.getByLabelText('Date of birth — type a date'));
    // captionLayout="dropdown" renders two <select> elements (month + year), each role=combobox.
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2);
  });

  it('opens the calendar by clicking the field itself, with no separate calendar button', async () => {
    const user = userEvent.setup();
    render(<DateField ariaLabel="Date of birth" value="1990-05-15" onChange={vi.fn()} />);
    // The old detached "… calendar" button is gone — the field is the trigger.
    expect(screen.queryByRole('button', { name: /calendar/i })).toBeNull();
    await user.click(screen.getByLabelText('Date of birth — type a date'));
    // A calendar day grid appears (react-day-picker renders day buttons once open).
    expect(await screen.findByRole('button', { name: /May 15th, 1990/ })).toBeInTheDocument();
  });
});

describe('DateField typed entry', () => {
  it('shows the formatted value in the visible input', () => {
    render(<DateField ariaLabel="Date of birth" value="1953-09-02" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Date of birth — type a date')).toHaveValue('02 Sep 1953');
  });

  it('parses a typed date on blur and calls onChange with ISO', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField ariaLabel="Date of birth" value="" onChange={onChange} />);
    const input = screen.getByLabelText('Date of birth — type a date');
    await user.type(input, 'Sep 2 1953');
    await user.tab(); // blur
    expect(onChange).toHaveBeenCalledWith('1953-09-02');
  });

  it('reverts invalid typed text to the previous value without calling onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField ariaLabel="Date of birth" value="1953-09-02" onChange={onChange} />);
    const input = screen.getByLabelText('Date of birth — type a date');
    await user.clear(input);
    await user.type(input, 'not a date');
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('02 Sep 1953');
  });

  it('rejects a typed date earlier than minDate', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField ariaLabel="Departure Date" value="" onChange={onChange} minDate="2026-07-18" />);
    const input = screen.getByLabelText('Departure Date — type a date');
    await user.type(input, '07/17/2026');
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps getByLabelText(ariaLabel) resolving to the hidden native date input', () => {
    render(<DateField ariaLabel="Date of birth" value="1953-09-02" onChange={vi.fn()} />);
    const hidden = screen.getByLabelText('Date of birth');
    expect(hidden).toHaveAttribute('type', 'date');
    expect(hidden).toHaveValue('1953-09-02');
  });

  it('commits a typed date on Enter (not only on blur)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField ariaLabel="Date of birth" value="" onChange={onChange} />);
    const input = screen.getByLabelText('Date of birth — type a date');
    await user.type(input, '09/02/1953{Enter}');
    expect(onChange).toHaveBeenCalledWith('1953-09-02');
  });

  it('accepts a typed date on or after minDate', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField ariaLabel="Departure Date" value="" onChange={onChange} minDate="2026-07-18" />);
    const input = screen.getByLabelText('Departure Date — type a date');
    await user.type(input, '07/18/2026');
    await user.tab();
    expect(onChange).toHaveBeenCalledWith('2026-07-18');
  });

  it('clears the value when the field is emptied and blurred', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField ariaLabel="Date of birth" value="1953-09-02" onChange={onChange} />);
    const input = screen.getByLabelText('Date of birth — type a date');
    await user.clear(input);
    await user.tab();
    expect(onChange).toHaveBeenCalledWith('');
  });
});
