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
    await user.click(screen.getByRole('button', { name: 'Departure Date calendar' }));

    // react-day-picker renders a disabled day button for anything matched by `disabled`.
    const before = await screen.findByRole('button', { name: /July 17th, 2026/ });
    expect(before).toBeDisabled();
    const onOrAfter = screen.getByRole('button', { name: /July 18th, 2026/ });
    expect(onOrAfter).not.toBeDisabled();
  });
});
