import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Label } from '@/components/ui/label';
import { PasswordInput } from './password-input';

function renderField() {
  return render(
    <>
      <Label htmlFor="pw">Password</Label>
      <PasswordInput id="pw" defaultValue="supersecret" />
    </>,
  );
}

describe('PasswordInput', () => {
  it('masks the value until the toggle is clicked, then reveals it', async () => {
    renderField();
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('supersecret');
  });

  it('re-masks the value when toggled back', async () => {
    renderField();
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('names the toggle after the field so several on one page stay distinct', () => {
    render(<PasswordInput aria-label="New password" fieldLabel="new password" />);

    expect(screen.getByRole('button', { name: 'Show new password' })).toBeInTheDocument();
  });

  it('does not submit the surrounding form when toggled', async () => {
    let submitted = false;
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitted = true;
        }}
      >
        <PasswordInput aria-label="Password" />
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(submitted).toBe(false);
  });
});
