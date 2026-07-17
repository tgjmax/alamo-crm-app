import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearch } from '@tanstack/react-router';
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
import { Spinner } from '@/components/ui/spinner';
import ConditionBuilder from '../components/ConditionBuilder';
import WidgetView from '../components/WidgetView';
import {
  getDimensions, getWidget, createWidget, updateWidget, previewWidget,
  WidgetData, WidgetInput, WidgetPreviewInput, WidgetVizType, ChartType,
  WIDGET_PERIODS, WIDGET_PERIOD_LABELS, WidgetPeriod,
} from '../api/widgets.api';
import { getGroupFields, GroupCondition } from '../api/groups.api';
import { getUserDirectory } from '../api/users.api';
import { useAuthStore } from '../stores/authStore';
import { isAdminOrAbove } from '../utils/permissions';
import { buildKeyLabel } from '../utils/widgetFormat';
import { widgetTemplateById } from '../components/dashboard/widget-templates';

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
  const { template } = useSearch({ strict: false }) as { template?: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canShare = isAdminOrAbove(user) || user?.permissions?.groups.createShared === true;

  // Seed a NEW widget from a chosen starter template (undefined/unknown/'blank' → blank form). This
  // is safe in a plain useState initializer because navigating in from the gallery mounts this page
  // fresh; an EDIT (widgetId set) ignores the template and loads the stored widget instead.
  const seed = widgetId ? undefined : widgetTemplateById(template);

  const [name, setName] = useState(seed?.name ?? '');
  const [conditions, setConditions] = useState<GroupCondition[]>([]);
  const [period, setPeriod] = useState<WidgetPeriod>(seed?.period ?? 'all');
  const [metric, setMetric] = useState<Metric>(seed ? toMetric(seed.fn, seed.field) : 'count');
  const [groupBy, setGroupBy] = useState<string>(seed?.groupBy ?? NONE);
  const [display, setDisplay] = useState<Display>(seed?.display ?? 'table');
  const [chartType, setChartType] = useState<ChartType>(seed?.chartType ?? 'bar');
  const [shareMode, setShareMode] = useState<'private' | 'shared'>('private');
  const [shareUsers, setShareUsers] = useState<string[]>([]);
  const [preview, setPreview] = useState<WidgetData | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: dimensions = [] } = useQuery({ queryKey: ['widgets', 'dimensions'], queryFn: getDimensions });
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
    setConditions(existing.conditions ?? []);
    setPeriod(existing.period ?? 'all');
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

  // A stale preview payload was computed under a DIFFERENT aggregation or window (e.g. a dollar
  // sum, or a different period) — changing metric/groupBy/display/period without re-previewing
  // must never let it be re-rendered as if it matched the new one (e.g. a currency total rounded
  // into a fake integer count, or an all-time number shown under a "This month" label).
  useEffect(() => {
    setPreview(null);
  }, [metric, groupBy, display, period]);

  const hasGroupBy = groupBy !== NONE;
  const vizType: WidgetVizType = !hasGroupBy ? 'number' : display;

  // Same shared mapper the dashboard uses — otherwise a `createdBy`-grouped widget's preview
  // renders raw Mongo ObjectIds while the identical saved widget on /dashboard renders names.
  const previewKeyLabel = useMemo(
    () => buildKeyLabel(hasGroupBy ? groupBy : undefined, directory),
    [hasGroupBy, groupBy, directory]
  );

  function buildInput(): WidgetInput {
    return {
      name,
      conditions,
      vizType,
      aggregation: { ...toAggregation(metric), groupBy: hasGroupBy ? groupBy : undefined },
      chartType: vizType === 'chart' ? chartType : undefined,
      period,
      sharedWith: { mode: canShare ? shareMode : 'private', users: canShare && shareMode === 'shared' ? shareUsers : [] },
    };
  }

  function buildPreviewInput(): WidgetPreviewInput {
    return {
      conditions,
      vizType,
      aggregation: { ...toAggregation(metric), groupBy: hasGroupBy ? groupBy : undefined },
      chartType: vizType === 'chart' ? chartType : undefined,
      period,
    };
  }

  // A widget may be conditions-free (over the whole visible ledger) — only a name is required.

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
            <Label htmlFor="widget-name" required>Widget name</Label>
            <Input id="widget-name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
          </div>

          <ConditionBuilder fields={fields} users={directory} conditions={conditions} onChange={setConditions} />

          <div className="flex flex-wrap items-center gap-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as WidgetPeriod)}>
              <SelectTrigger aria-label="Period" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WIDGET_PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {WIDGET_PERIOD_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
            <Button type="button" variant="outline" disabled={busy} onClick={runPreview}>
              {busy && <Spinner />}
              {busy ? 'Working…' : 'Preview'}
            </Button>
            <Button type="button" disabled={busy || name.trim().length === 0} onClick={() => setSaveOpen(true)}>
              Save
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {preview && (
            <Card>
              <CardContent className="pt-6">
                <WidgetView
                  widget={{
                    name,
                    vizType,
                    chartType: vizType === 'chart' ? chartType : undefined,
                    aggregation: { ...toAggregation(metric), groupBy: hasGroupBy ? groupBy : undefined },
                    period,
                  }}
                  data={preview}
                  error={null}
                  keyLabel={previewKeyLabel}
                />
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
              {busy && <Spinner />}
              {busy ? 'Working…' : 'Save widget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
