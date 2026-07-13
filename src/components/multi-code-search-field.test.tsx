import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CodeOption } from './code-search-field';
import { MultiCodeSearchField } from './multi-code-search-field';

const search = vi.fn(
  async (): Promise<CodeOption[]> => [
    { code: 'QR', label: 'Qatar Airways' },
    { code: 'EK', label: 'Emirates' },
  ]
);

function Harness({ initial = [] }: { initial?: string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MultiCodeSearchField
        ariaLabel="Preferred airlines"
        value={value}
        onChange={setValue}
        search={search}
        queryKey="airlines"
      />
    </QueryClientProvider>
  );
}

describe('MultiCodeSearchField', () => {
  it('picks the highlighted option with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText('Preferred airlines');
    await user.type(input, 'a');
    await screen.findByRole('option', { name: /Qatar/ });

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /Emirates/ })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByText('EK')).toBeInTheDocument());
    expect(input).toHaveValue('');
  });

  it('adds a picked code as a chip and clears the input', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Preferred airlines'), 'qat');
    const option = await screen.findByText(/Qatar Airways \(QR\)/);
    await user.click(option);

    await waitFor(() => expect(screen.getByText('QR')).toBeInTheDocument());
    expect(screen.getByLabelText('Preferred airlines')).toHaveValue('');
  });

  it('excludes already-picked codes from the dropdown', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['QR']} />);

    await user.type(screen.getByLabelText('Preferred airlines'), 'a');
    await screen.findByText(/Emirates \(EK\)/);
    expect(screen.queryByText(/Qatar Airways \(QR\)/)).not.toBeInTheDocument();
  });

  it('removes a chip when its remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['QR', 'EK']} />);

    await user.click(screen.getByRole('button', { name: 'Remove QR' }));

    await waitFor(() => expect(screen.queryByText('QR')).not.toBeInTheDocument());
    expect(screen.getByText('EK')).toBeInTheDocument();
  });
});
