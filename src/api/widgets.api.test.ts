import { vi } from 'vitest';
import { apiClient } from './client';
import {
  getDimensions, listWidgets, getWidget, createWidget, updateWidget, deleteWidget,
  getWidgetData, previewWidget, saveLayout,
} from './widgets.api';

describe('widgets.api', () => {
  it('unwraps dimensions and the widgets/layout envelope', async () => {
    const get = vi.spyOn(apiClient, 'get');
    get.mockResolvedValueOnce({ data: { dimensions: [{ key: 'month', label: 'Month' }] } });
    expect(await getDimensions()).toEqual([{ key: 'month', label: 'Month' }]);
    expect(get).toHaveBeenCalledWith('/widgets/dimensions');

    get.mockResolvedValueOnce({ data: { widgets: [], layout: [] } });
    expect(await listWidgets()).toEqual({ widgets: [], layout: [] });
    expect(get).toHaveBeenCalledWith('/widgets');
  });

  it('reads one widget, its data, and previews', async () => {
    const get = vi.spyOn(apiClient, 'get');
    get.mockResolvedValueOnce({ data: { id: 'w1', name: 'x' } });
    await getWidget('w1');
    expect(get).toHaveBeenCalledWith('/widgets/w1');
    get.mockResolvedValueOnce({ data: { kind: 'scalar', value: 3 } });
    expect(await getWidgetData('w1')).toEqual({ kind: 'scalar', value: 3 });
    expect(get).toHaveBeenCalledWith('/widgets/w1/data');
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { kind: 'breakdown', rows: [] } });
    const body = { conditions: [{ field: 'airlineCode', operator: 'equals' as const, value: 'QR' }], vizType: 'table' as const, aggregation: { fn: 'count' as const, groupBy: 'airlineCode' } };
    await previewWidget(body);
    expect(post).toHaveBeenCalledWith('/widgets/preview', body);
  });

  it('creates, updates, deletes, and saves layout', async () => {
    const input = { name: 'w', group: 'g1', vizType: 'number' as const, aggregation: { fn: 'count' as const } };
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { id: 'w1' } });
    expect(await createWidget(input)).toEqual({ id: 'w1' });
    expect(post).toHaveBeenCalledWith('/widgets', input);
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: { id: 'w1' } });
    await updateWidget('w1', input);
    expect(patch).toHaveBeenCalledWith('/widgets/w1', input);
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({ data: undefined });
    await deleteWidget('w1');
    expect(del).toHaveBeenCalledWith('/widgets/w1');
    const put = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({ data: { ok: true } });
    await saveLayout([{ widget: 'w1', order: 0, size: 'small' }]);
    expect(put).toHaveBeenCalledWith('/dashboard/layout', { entries: [{ widget: 'w1', order: 0, size: 'small' }] });
  });
});
