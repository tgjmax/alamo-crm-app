import { useEffect, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ConditionBuilder from '../components/ConditionBuilder';
import WidgetView from '../components/WidgetView';
import {
  getDimensions, getWidget, createWidget, updateWidget, previewWidget,
  WidgetData, WidgetInput, WidgetPreviewInput, WidgetVizType, ChartType,
} from '../api/widgets.api';
import { getGroupFields, listGroups, GroupCondition } from '../api/groups.api';
import { getUserDirectory } from '../api/users.api';
import { useAuthStore } from '../stores/authStore';

type SourceMode = 'group' | 'conditions';
type Fn = 'count' | 'sum' | 'avg';
type MetricField = 'amount' | 'paymentAmount';

/** The metric is one control, not a function picker plus a field picker — `count` takes no field,
 * so the two-control version can represent "count of amount owed", which is meaningless. */
type Metric = 'count' | `${'sum' | 'avg'}:${MetricField}`;

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'count', label: 'Count' },
  { value: 'sum:amount', label: 'Sum of amount' },
  { value: 'avg:amount', label: 'Average of amount' },
  { value: 'sum:paymentAmount', label: 'Sum of amount owed' },
  { value: 'avg:paymentAmount', label: 'Average of amount owed' },
];

function toAggregation(metric: Metric): { fn: Fn; field?: MetricField } {
  if (metric === 'count') return { fn: 'count' };
  const [fn, field] = metric.split(':') as ['sum' | 'avg', MetricField];
  return { fn, field };
}

function toMetric(fn: Fn, field?: MetricField): Metric {
  return fn === 'count' ? 'count' : (`${fn}:${field ?? 'amount'}` as Metric);
}
type Display = 'table' | 'chart';
const NONE = '__none__';

export default function WidgetEditorPage() {
  const { widgetId } = useParams({ strict: false }) as { widgetId?: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canShare = user?.role === 'admin' || user?.permissions?.groups.createShared === true;

  const [name, setName] = useState('');
  const [sourceMode, setSourceMode] = useState<SourceMode>('group');
  const [groupId, setGroupId] = useState('');
  const [conditions, setConditions] = useState<GroupCondition[]>([]);
  const [metric, setMetric] = useState<Metric>('count');
  const [groupBy, setGroupBy] = useState<string>(NONE);
  const [display, setDisplay] = useState<Display>('table');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [shareMode, setShareMode] = useState<'private' | 'shared'>('private');
  const [shareUsers, setShareUsers] = useState<string[]>([]);
  const [preview, setPreview] = useState<WidgetData | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: dimensions = [] } = useQuery({ queryKey: ['widgets', 'dimensions'], queryFn: getDimensions });
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: listGroups });
  const { data: fields = [] } = useQuery({ queryKey: ['groups', 'fields'], queryFn: getGroupFields });
  const { data: directory = [] } = useQuery({ queryKey: ['users', 'directory'], queryFn: getUserDirectory });
  const { data: existing } = useQuery({
    queryKey: ['widget', widgetId],
    queryFn: () => getWidget(widgetId as string),
    enabled: Boolean(widgetId),
  });

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    if (existing.group) {
      setSourceMode('group');
      setGroupId(existing.group);
    } else {
      setSourceMode('conditions');
      setConditions(existing.conditions ?? []);
    }
    setMetric(toMetric(existing.aggregation.fn, existing.aggregation.field));
    setGroupBy(existing.aggregation.groupBy ?? NONE);
    if (existing.vizType === 'chart') {
      setDisplay('chart');
      setChartType(existing.chartType ?? 'bar');
    } else if (existing.vizType === 'table') {
      setDisplay('table');
    }
    setShareMode(existing.sharedWith.mode);
    setShareUsers(existing.sharedWith.users);
  }, [existing]);

  const hasGroupBy = groupBy !== NONE;
  const vizType: WidgetVizType = !hasGroupBy ? 'number' : display;

  function buildInput(): WidgetInput {
    return {
      name,
      ...(sourceMode === 'group' ? { group: groupId } : { conditions }),
      vizType,
      aggregation: { ...toAggregation(metric), groupBy: hasGroupBy ? groupBy : undefined },
      chartType: vizType === 'chart' ? chartType : undefined,
      sharedWith: { mode: canShare ? shareMode : 'private', users: canShare && shareMode === 'shared' ? shareUsers : [] },
    };
  }

  function buildPreviewInput(): WidgetPreviewInput {
    return {
      ...(sourceMode === 'group' ? { group: groupId } : { conditions }),
      vizType,
      aggregation: { ...toAggregation(metric), groupBy: hasGroupBy ? groupBy : undefined },
      chartType: vizType === 'chart' ? chartType : undefined,
    };
  }

  const sourceReady = sourceMode === 'group' ? groupId.length > 0 : conditions.length > 0;

  async function runPreview() {
    setError(null);
    setBusy(true);
    try {
      setPreview(await previewWidget(buildPreviewInput()));
    } catch (err) {
      const reason = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : undefined;
      setError(reason ?? 'Preview failed. Check the widget settings and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setError(null);
    setBusy(true);
    try {
      if (widgetId) await updateWidget(widgetId, buildInput());
      else await createWidget(buildInput());
      setSaveOpen(false);
      await router.navigate({ to: '/dashboard' });
    } catch (err) {
      const reason = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : undefined;
      setError(reason ?? 'Saving failed. Check the widget settings and try again.');
      setSaveOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function toggleShareUser(id: string) {
    setShareUsers((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h2 className="contents">{widgetId ? 'Edit widget' : 'New widget'}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="widget-name">Widget name</Label>
            <Input id="widget-name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Label>Source</Label>
            <Select value={sourceMode} onValueChange={(v) => setSourceMode(v as SourceMode)}>
              <SelectTrigger aria-label="Source" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">Saved group</SelectItem>
                <SelectItem value="conditions">Custom conditions</SelectItem>
              </SelectContent>
            </Select>
            {sourceMode === 'group' && (
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger aria-label="Group" className="w-56">
                  <SelectValue placeholder="Pick a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {sourceMode === 'conditions' && (
            <ConditionBuilder fields={fields} users={directory} conditions={conditions} onChange={setConditions} />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Label>Metric</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <SelectTrigger aria-label="Metric" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label>Group by</Label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger aria-label="Group by" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None (single number)</SelectItem>
                {dimensions.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasGroupBy && (
              <>
                <Label>Display</Label>
                <Select value={display} onValueChange={(v) => setDisplay(v as Display)}>
                  <SelectTrigger aria-label="Display" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="chart">Chart</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {hasGroupBy && display === 'chart' && (
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger aria-label="Chart type" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={busy || !sourceReady} onClick={runPreview}>
              {busy ? 'Working…' : 'Preview'}
            </Button>
            <Button type="button" disabled={busy || !sourceReady || name.trim().length === 0} onClick={() => setSaveOpen(true)}>
              Save
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {preview && (
            <Card>
              <CardContent className="pt-6">
                <WidgetView widget={{ name, vizType, chartType: vizType === 'chart' ? chartType : undefined }} data={preview} error={null} />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save widget</DialogTitle>
          </DialogHeader>
          {canShare && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Sharing</Label>
                <Select value={shareMode} onValueChange={(v) => setShareMode(v as 'private' | 'shared')}>
                  <SelectTrigger aria-label="Share mode" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {shareMode === 'shared' && (
                <div className="flex flex-wrap gap-3">
                  {directory
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <label key={u.id} className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          aria-label={`Share with ${u.name}`}
                          checked={shareUsers.includes(u.id)}
                          onCheckedChange={() => toggleShareUser(u.id)}
                        />
                        {u.name}
                      </label>
                    ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={handleSave}>
              {busy ? 'Working…' : 'Save widget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
