import { vi } from 'vitest';
import * as download from './download';
import { exportBookings } from './bookings.api';

describe('exportBookings', () => {
  it('delegates to downloadFile with the bookings export path and filename', async () => {
    const spy = vi.spyOn(download, 'downloadFile').mockResolvedValue();
    await exportBookings();
    expect(spy).toHaveBeenCalledWith('/bookings/export', 'bookings.xlsx');
  });
});
