import { vi } from 'vitest';
import * as download from './download';
import { exportCustomers } from './customers.api';

describe('exportCustomers', () => {
  it('delegates to downloadFile with the customers export path and filename', async () => {
    const spy = vi.spyOn(download, 'downloadFile').mockResolvedValue();
    await exportCustomers();
    expect(spy).toHaveBeenCalledWith('/customers/export', 'customers.xlsx');
  });
});
