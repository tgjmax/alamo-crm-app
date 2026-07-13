import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { summarizePax } from '@/utils/tripFormat';
import { PassengerCountField, PassengerCounts } from './passenger-count-field';

function Harness({ initial }: { initial: PassengerCounts }) {
  const [value, setValue] = useState(initial);
  return <PassengerCountField value={value} onChange={setValue} />;
}

describe('summarizePax', () => {
  it('omits zero counts and singularizes', () => {
    expect(summarizePax({ adults: 1, children: 0, infants: 0 })).toBe('1 Adult');
    expect(summarizePax({ adults: 2, children: 2, infants: 1 })).toBe('2 Adults, 2 Children, 1 Infant');
    expect(summarizePax({ adults: 2, children: 1, infants: 0 })).toBe('2 Adults, 1 Child');
  });
});

describe('PassengerCountField', () => {
  it('steps a count up and reflects it in the trigger summary', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ adults: 1, children: 0, infants: 0 }} />);

    await user.click(screen.getByRole('button', { name: 'Passengers' }));
    await user.click(await screen.findByRole('button', { name: 'Add Children' }));
    expect(screen.getByLabelText('Children count')).toHaveTextContent('1');

    // The open popover is modal, so it aria-hides the trigger behind it — close it before
    // asserting the summary, exactly as a user would.
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: 'Passengers' })).toHaveTextContent('1 Adult, 1 Child');
  });

  it('will not let adults drop below 1', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ adults: 1, children: 0, infants: 0 }} />);

    await user.click(screen.getByRole('button', { name: 'Passengers' }));
    expect(await screen.findByRole('button', { name: 'Remove Adults' })).toBeDisabled();
  });

  it('caps infants at the number of adults — a lap infant needs a lap', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ adults: 1, children: 0, infants: 1 }} />);

    await user.click(screen.getByRole('button', { name: 'Passengers' }));
    // Already at the cap (1 infant, 1 adult), so the + is disabled.
    expect(await screen.findByRole('button', { name: 'Add Infants on Lap' })).toBeDisabled();

    // Dropping an adult must drag the infant count down with it, never leave 1 adult / 2 infants.
    await user.click(screen.getByRole('button', { name: 'Add Adults' }));
    await user.click(screen.getByRole('button', { name: 'Add Infants on Lap' }));
    expect(screen.getByLabelText('Infants on Lap count')).toHaveTextContent('2');

    await user.click(screen.getByRole('button', { name: 'Remove Adults' }));
    expect(screen.getByLabelText('Infants on Lap count')).toHaveTextContent('1');
  });
});
