import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SearchInput } from './search-input';

function Harness() {
  const [value, setValue] = useState('');
  return <SearchInput aria-label="Search things" placeholder="Search…" value={value} onChange={setValue} />;
}

describe('SearchInput', () => {
  it('hides the clear button until there is text, and clears on click', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const field = screen.getByLabelText('Search things');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    await user.type(field, 'hello');
    expect(field).toHaveValue('hello');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(field).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});
