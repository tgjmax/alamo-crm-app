import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { CabinClass } from '@/api/enquiries.api';
import { CabinSelectField } from './cabin-select-field';

function Harness({ initial = [] }: { initial?: CabinClass[] }) {
  const [value, setValue] = useState<CabinClass[]>(initial);
  return <CabinSelectField value={value} onChange={setValue} />;
}

describe('CabinSelectField', () => {
  it('shows "All cabins" when nothing is selected — an empty pick is a valid answer', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Cabin' })).toHaveTextContent('All cabins');
  });

  it('renders a picked cabin as a 3-letter card below the field', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Cabin' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Premium Economy' }));

    // The card shows the abbreviation; the full name stays available as a tooltip.
    expect(screen.getByText('PRE')).toBeInTheDocument();
    expect(screen.getByTitle('Premium Economy')).toBeInTheDocument();
  });

  it('removes a cabin via its card', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['Business', 'First']} />);

    expect(screen.getByText('BUS')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Business' }));

    await waitFor(() => expect(screen.queryByText('BUS')).not.toBeInTheDocument());
    expect(screen.getByText('FIR')).toBeInTheDocument();
  });
});
