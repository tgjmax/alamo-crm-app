import { vi } from 'vitest';
import { apiClient } from './client';
import {
  getGroupFields, listGroups, getGroup, createGroup, updateGroup, deleteGroup, getGroupResults, previewGroup,
} from './groups.api';

describe('groups.api', () => {
  it('getGroupFields unwraps the fields array', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { fields: [{ key: 'amount' }] } });
    expect(await getGroupFields()).toEqual([{ key: 'amount' }]);
    expect(apiClient.get).toHaveBeenCalledWith('/groups/fields');
  });

  it('listGroups/getGroup/deleteGroup hit the right paths', async () => {
    const get = vi.spyOn(apiClient, 'get');
    get.mockResolvedValueOnce({ data: { groups: [] } });
    await listGroups();
    expect(get).toHaveBeenCalledWith('/groups');
    get.mockResolvedValueOnce({ data: { id: 'g1', name: 'x' } });
    await getGroup('g1');
    expect(get).toHaveBeenCalledWith('/groups/g1');
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({ data: undefined });
    await deleteGroup('g1');
    expect(del).toHaveBeenCalledWith('/groups/g1');
  });

  it('create/update post and patch the group input', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { id: 'g1' } });
    const input = { name: 'QR', conditions: [{ field: 'airlineCode', operator: 'equals' as const, value: 'QR' }] };
    expect(await createGroup(input)).toEqual({ id: 'g1' });
    expect(post).toHaveBeenCalledWith('/groups', input);
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: { id: 'g1' } });
    await updateGroup('g1', input);
    expect(patch).toHaveBeenCalledWith('/groups/g1', input);
  });

  it('results and preview carry paging', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { rows: [], total: 0, page: 2, pageSize: 50 } });
    await getGroupResults('g1', 2);
    expect(get).toHaveBeenCalledWith('/groups/g1/results', { params: { page: 2 } });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, pageSize: 50 } });
    const conditions = [{ field: 'amount', operator: 'greaterThan' as const, value: 5 }];
    await previewGroup(conditions, 1);
    expect(post).toHaveBeenCalledWith('/groups/preview', { conditions, page: 1 });
  });
});
