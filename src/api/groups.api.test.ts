import { vi } from 'vitest';
import { apiClient } from './client';
import * as groupsApi from './groups.api';
import {
  getGroupFields, listGroups, getGroup, createGroup, updateGroup, deleteGroup, getGroupResults, previewGroup,
  updateGroupView, updateGroupExclusions,
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

  it('results and preview carry paging and sorting', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { rows: [], total: 0, page: 2, pageSize: 25 } });
    await getGroupResults('g1', { page: 2, pageSize: 25, sortBy: 'passengerName', sortDir: 'asc' });
    expect(get).toHaveBeenCalledWith('/groups/g1/results', {
      params: { page: 2, pageSize: 25, sortBy: 'passengerName', sortDir: 'asc' },
    });

    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, pageSize: 10 } });
    const conditions = [{ field: 'amount', operator: 'greaterThan' as const, value: 5 }];
    await previewGroup(conditions, { page: 1, pageSize: 10 });
    expect(post).toHaveBeenCalledWith('/groups/preview', {
      conditions, page: 1, pageSize: 10, sortBy: undefined, sortDir: undefined,
    });
  });

  it('saves a view and returns it', async () => {
    const view: groupsApi.GroupView = { hiddenColumns: ['remark'], sort: { id: 'amount', desc: true } };
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: { view } });
    const result = await updateGroupView('g1', view);
    expect(patch).toHaveBeenCalledWith('/groups/g1/view', view);
    expect(result).toEqual(view);
  });
});

describe('group exclusions', () => {
  it('sends add deltas and returns the new count', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: { excludedCount: 3 } });

    const count = await updateGroupExclusions('g1', { add: ['p1', 'p2'] });

    expect(patch).toHaveBeenCalledWith('/groups/g1/exclusions', { add: ['p1', 'p2'] });
    expect(count).toBe(3);
  });

  it('sends remove deltas', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: { excludedCount: 0 } });

    const count = await updateGroupExclusions('g1', { remove: ['p1'] });

    expect(patch).toHaveBeenCalledWith('/groups/g1/exclusions', { remove: ['p1'] });
    expect(count).toBe(0);
  });

  it('forwards excluded=true so the Excluded dialog can list checked-off rows', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { rows: [], total: 0, page: 1, pageSize: 25 } });

    await getGroupResults('g1', { page: 1, pageSize: 25, excluded: true });

    expect(get).toHaveBeenCalledWith('/groups/g1/results', {
      params: { page: 1, pageSize: 25, excluded: true },
    });
  });
});
