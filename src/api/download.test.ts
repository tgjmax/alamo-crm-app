import { vi } from 'vitest';
import { apiClient } from './client';
import { downloadFile } from './download';

describe('downloadFile', () => {
  it('fetches the given path as a blob and triggers a download', async () => {
    const blob = new Blob(['test content']);
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: blob });
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    await downloadFile('/customers/export', 'customers.xlsx');

    expect(apiClient.get).toHaveBeenCalledWith('/customers/export', { responseType: 'blob' });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
