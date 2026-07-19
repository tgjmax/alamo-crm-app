import { vi } from 'vitest';
import { apiClient } from './client';
import { getUserDirectory, listUsers, createUser, updateUser, setUserPassword, setUserActive, ManagedUser } from './users.api';

describe('users.api', () => {
  it('unwraps the directory users array', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { users: [{ id: 'u1', name: 'Anna' }] } });
    expect(await getUserDirectory()).toEqual([{ id: 'u1', name: 'Anna' }]);
    expect(apiClient.get).toHaveBeenCalledWith('/users/directory');
  });

  const BASE_PERMISSIONS = {
    bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: true, import: false, export: false, sendInvoice: false },
    customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: false },
    groups: { createShared: false },
    data: { viewReports: false },
    enquiries: { sendQuote: false, delete: false },
  };

  const MANAGED_USER: ManagedUser = {
    id: 'u1',
    name: 'Priya M',
    email: 'priya@alamo.test',
    role: 'agent',
    permissions: BASE_PERMISSIONS,
    active: true,
  };

  it('unwraps the managed users array', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { users: [MANAGED_USER] } });
    expect(await listUsers()).toEqual([MANAGED_USER]);
    expect(apiClient.get).toHaveBeenCalledWith('/users');
  });

  it('creates a user', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: MANAGED_USER });
    const input = { name: 'Priya M', email: 'priya@alamo.test', role: 'agent' as const };
    expect(await createUser(input)).toEqual(MANAGED_USER);
    expect(apiClient.post).toHaveBeenCalledWith('/users', input);
  });

  it('updates a user', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: MANAGED_USER });
    const input = { name: 'Priya M2' };
    expect(await updateUser('u1', input)).toEqual(MANAGED_USER);
    expect(apiClient.patch).toHaveBeenCalledWith('/users/u1', input);
  });

  it('sets a user password with no return value', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: undefined });
    expect(await setUserPassword('u1', 'newpassword123')).toBeUndefined();
    expect(apiClient.patch).toHaveBeenCalledWith('/users/u1/password', { newPassword: 'newpassword123' });
  });

  it('sets a user active/inactive', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: MANAGED_USER });
    expect(await setUserActive('u1', false)).toEqual(MANAGED_USER);
    expect(apiClient.patch).toHaveBeenCalledWith('/users/u1/active', { active: false });
  });
});
