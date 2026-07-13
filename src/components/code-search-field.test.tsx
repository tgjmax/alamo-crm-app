import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CodeOption, CodeSearchField } from './code-search-field';

const search = vi.fn(
  async (): Promise<CodeOption[]> => [
    { code: 'COK', label: 'Cochin International Airport', sublabel: 'Kochi, India' },
    { code: 'CCU', label: 'Netaji Subhash Chandra Bose International Airport', sublabel: 'Kolkata, India' },
    { code: 'CJB', label: 'Coimbatore International Airport', sublabel: 'Coimbatore, India' },
  ]
);

function Harness() {
  const [value, setValue] = useState('');
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CodeSearchField ariaLabel="From 1" value={value} onChange={setValue} search={search} queryKey="airports" />
    </QueryClientProvider>
  );
}

/** Keyboard selection was entirely missing: the dropdown was a plain <ul> with click handlers,
 * so Down/Enter never reached it and the field could only be used with a mouse. */
describe('CodeSearchField keyboard navigation', () => {
  it('picks the highlighted option with Enter, and highlights the first match by default', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText('From 1');
    await user.type(input, 'co');
    await screen.findByRole('option', { name: /Cochin/ });

    // The first match is highlighted as soon as results arrive, so Enter alone takes the top hit.
    expect(screen.getByRole('option', { name: /Cochin/ })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    await waitFor(() => expect(input).toHaveValue('COK'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('moves the highlight down with the arrow key before committing', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText('From 1');
    await user.type(input, 'co');
    await screen.findByRole('option', { name: /Cochin/ });

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /Netaji/ })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    await waitFor(() => expect(input).toHaveValue('CCU'));
  });

  it('wraps from the last option back to the first', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('From 1'), 'co');
    await screen.findByRole('option', { name: /Cochin/ });

    // 3 options: down x3 from the first wraps back around to it.
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('option', { name: /Cochin/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves the highlight up, wrapping to the last option', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('From 1'), 'co');
    await screen.findByRole('option', { name: /Cochin/ });

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('option', { name: /Coimbatore/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('dismisses the list with Escape without changing the typed value', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText('From 1');
    await user.type(input, 'co');
    await screen.findByRole('listbox');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(input).toHaveValue('co');
  });
});
