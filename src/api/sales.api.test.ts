import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as download from './download';
import { getSalesReport } from './sales.api';

describe('getSalesReport', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('downloads the month PDF with a Sales-<Mon><YYYY>.pdf filename', async () => {
    const spy = vi.spyOn(download, 'downloadFile').mockResolvedValue();
    await getSalesReport(2026, 6);
    expect(spy).toHaveBeenCalledWith('/sales/report?year=2026&month=6', 'Sales-Jun2026.pdf');
  });
});
