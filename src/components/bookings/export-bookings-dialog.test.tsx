import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ExportBookingsDialog } from './export-bookings-dialog';
import * as bookingsApi from '@/api/bookings.api';

function renderDialog() {
  return render(<ExportBookingsDialog open onOpenChange={() => {}} />);
}

describe('ExportBookingsDialog', () => {
  it('exports with the chosen date range', async () => {
    const spy = vi.spyOn(bookingsApi, 'exportBookings').mockResolvedValue();
    const user = userEvent.setup();
    renderDialog();

    // DateField's hidden native <input type="date"> carries the accessible name.
    await user.type(screen.getByLabelText('Export from date'), '2026-05-01');
    await user.type(screen.getByLabelText('Export to date'), '2026-05-31');
    await user.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ from: '2026-05-01', to: '2026-05-31' })
    );
  });

  it('exports everything when no dates are chosen', async () => {
    const spy = vi.spyOn(bookingsApi, 'exportBookings').mockResolvedValue();
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ from: '', to: '' }));
  });

  it('blocks export when the from date is after the to date', async () => {
    const spy = vi.spyOn(bookingsApi, 'exportBookings').mockResolvedValue();
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Export from date'), '2026-06-01');
    await user.type(screen.getByLabelText('Export to date'), '2026-05-01');

    expect(screen.getByText(/from date must be on or before the to date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
    expect(spy).not.toHaveBeenCalled();
  });

  it('clears a previously chosen date when the dialog is reopened', async () => {
    const user = userEvent.setup();
    // The dialog is mounted continuously (gated by canExport, not by open), so a stale
    // date would otherwise persist across a close/reopen — the reset-on-close effect prevents that.
    const { rerender } = render(<ExportBookingsDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText('Export from date'), '2026-05-01');
    expect(screen.getByLabelText('Export from date')).toHaveValue('2026-05-01');

    rerender(<ExportBookingsDialog open={false} onOpenChange={() => {}} />);
    rerender(<ExportBookingsDialog open onOpenChange={() => {}} />);

    expect(screen.getByLabelText('Export from date')).toHaveValue('');
  });
});
