import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToggleVerifiedDialog } from './toggle-verified-dialog';
import type { CustomerListItem } from '@/api/customers.api';

const base: CustomerListItem = {
  id: 'c1',
  firstName: 'Jane',
  lastName: 'Smith',
  paxType: 'ADT',
  dob: '02-Sep-1990',
  gender: 'F',
  phone: '555',
  verified: false,
};

describe('ToggleVerifiedDialog', () => {
  it('prompts to mark an unverified customer as verified', () => {
    render(
      <ToggleVerifiedDialog open customer={base} isPending={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByText('Mark Jane Smith as verified?')).toBeInTheDocument();
  });

  it('prompts to mark a verified customer as not verified', () => {
    render(
      <ToggleVerifiedDialog
        open
        customer={{ ...base, verified: true }}
        isPending={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('Mark Jane Smith as not verified?')).toBeInTheDocument();
  });

  it('fires onConfirm from the confirm button and onOpenChange(false) from cancel', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ToggleVerifiedDialog open customer={base} isPending={false} onOpenChange={onOpenChange} onConfirm={onConfirm} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a pending label and disables confirm while pending', () => {
    render(
      <ToggleVerifiedDialog open customer={base} isPending onOpenChange={vi.fn()} onConfirm={vi.fn()} />
    );
    const confirm = screen.getByRole('button', { name: 'Saving…' });
    expect(confirm).toBeDisabled();
  });

  it('shows a spinner on the confirm button while pending', async () => {
    render(
      <ToggleVerifiedDialog open customer={base} isPending onOpenChange={vi.fn()} onConfirm={vi.fn()} />
    );
    // The spinner is decorative (aria-hidden) now that it sits beside the "Saving…" label, so it
    // can't be queried by role — assert its presence via the animate-spin class instead, scoped to
    // the confirm button so this stays a real assertion that the spinner renders while pending.
    const confirm = screen.getByRole('button', { name: 'Saving…' });
    await waitFor(() => {
      expect(confirm.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  it('does not show a spinner on the confirm button when not pending', () => {
    render(
      <ToggleVerifiedDialog open customer={base} isPending={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Confirm' }).querySelector('.animate-spin')).not.toBeInTheDocument();
  });
});
