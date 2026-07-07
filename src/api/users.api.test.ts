import { vi } from 'vitest';
import { apiClient } from './client';
import { getUserDirectory } from './users.api';

describe('users.api', () => {
  it('unwraps the directory users array', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { users: [{ id: 'u1', name: 'Anna' }] } });
    expect(await getUserDirectory()).toEqual([{ id: 'u1', name: 'Anna' }]);
    expect(apiClient.get).toHaveBeenCalledWith('/users/directory');
  });
});
