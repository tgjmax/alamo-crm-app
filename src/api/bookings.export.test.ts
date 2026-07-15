import { vi } from 'vitest';
import * as download from './download';
import { exportBookings } from './bookings.api';

describe('exportBookings', () => {
  it('delegates to downloadFile with the bookings export path and filename', async () => {
    const spy = vi.spyOn(download, 'downloadFile').mockResolvedValue();
    await exportBookings();
    expect(spy).toHaveBeenCalledWith('/bookings/export', 'bookings.xlsx');
  });

  it('appends from/to query params and names the file for the range', async () => {
    const spy = vi.spyOn(download, 'downloadFile').mockResolvedValue();
    await exportBookings({ from: '2026-05-01', to: '2026-05-31' });
    expect(spy).toHaveBeenCalledWith(
      '/bookings/export?from=2026-05-01&to=2026-05-31',
      'bookings-2026-05-01-to-2026-05-31.xlsx'
    );
  });

  it('omits a blank bound but still scopes the file name', async () => {
    const spy = vi.spyOn(download, 'downloadFile').mockResolvedValue();
    await exportBookings({ from: '2026-05-01' });
    expect(spy).toHaveBeenCalledWith(
      '/bookings/export?from=2026-05-01',
      'bookings-2026-05-01-to-end.xlsx'
    );
  });
});
