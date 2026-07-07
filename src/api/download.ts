import { apiClient } from './client';

export async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await apiClient.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
