import { render, screen } from '@testing-library/react';
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
});
