import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Maximize2, Minimize2, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { reorder } from '../components/dashboard/reorder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { WidgetTemplateGallery } from '../components/dashboard/widget-template-gallery';
import {
  listWidgets, getWidgetData, deleteWidget, saveLayout, WidgetSummary, LayoutEntry, WIDGET_PERIOD_LABELS,
} from '../api/widgets.api';
import { getUserDirectory } from '../api/users.api';
import WidgetView from '../components/WidgetView';
import { useAuthStore } from '../stores/authStore';
import { isAdminOrAbove } from '../utils/permissions';
import { buildKeyLabel } from '../utils/widgetFormat';

function orderWidgets(
  widgets: WidgetSummary[],
  layout: { widget: string; order: number; size: 'small' | 'large' }[]
): { ids: string[]; sizes: Record<string, 'small' | 'large'> } {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  const sizes: Record<string, 'small' | 'large'> = {};
  const ordered = [...layout]
    .filter((e) => byId.has(e.widget))
    .sort((a, b) => a.order - b.order)
    .map((e) => {
      sizes[e.widget] = e.size;
      return e.widget;
    });
  const remaining = widgets.map((w) => w.id).filter((id) => !ordered.includes(id));
  for (const id of remaining) sizes[id] = sizes[id] ?? 'small';
  return { ids: [...ordered, ...remaining], sizes };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['widgets'], queryFn: listWidgets });
  const { data: directory = [] } = useQuery({ queryKey: ['users', 'directory'], queryFn: getUserDirectory });

  const [ids, setIds] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Record<string, 'small' | 'large'>>({});
  const [pendingDelete, setPendingDelete] = useState<WidgetSummary | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Land in the editor seeded from the chosen starter (or blank). A blank pick carries no `template`.
  function startWidget(templateId: string | null) {
    setGalleryOpen(false);
    navigate({ to: '/dashboard/widgets/new', search: templateId ? { template: templateId } : {} });
  }
  const confirmed = useRef<{ ids: string[]; sizes: Record<string, 'small' | 'large'> }>({ ids: [], sizes: {} });

  useEffect(() => {
    if (data) {
      const { ids: nextIds, sizes: nextSizes } = orderWidgets(data.widgets, data.layout);
      setIds(nextIds);
      setSizes(nextSizes);
      confirmed.current = { ids: nextIds, sizes: nextSizes };
    }
  }, [data]);

  const widgetsById = useMemo(
    () => new Map((data?.widgets ?? []).map((w) => [w.id, w])),
    [data]
  );
  // Memoised once so widgets sharing the `createdBy` dimension reuse the same id -> name Map
  // rather than rebuilding it per card on every render.
  const createdByKeyLabel = useMemo(() => buildKeyLabel('createdBy', directory), [directory]);

  const layoutMutation = useMutation({
    mutationFn: (entries: LayoutEntry[]) => saveLayout(entries),
    onSuccess: (_result, entries) => {
      confirmed.current = {
        ids: entries.map((e) => e.widget),
        sizes: Object.fromEntries(entries.map((e) => [e.widget, e.size])),
      };
    },
    onError: () => {
      setIds(confirmed.current.ids);
      setSizes(confirmed.current.sizes);
      toast.error('Could not save the dashboard layout. Your change has been undone.');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWidget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      setPendingDelete(null);
    },
    onError: () => {
      toast.error('Could not delete the widget. Please try again.');
    },
  });

  function persist(nextIds: string[], nextSizes: Record<string, 'small' | 'large'>) {
    layoutMutation.mutate(nextIds.map((id, i) => ({ widget: id, order: i, size: nextSizes[id] ?? 'small' })));
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = reorder(ids, String(active.id), String(over.id));
    setIds(next);
    persist(next, sizes);
  }

  function toggleSize(id: string) {
    const next = { ...sizes, [id]: sizes[id] === 'large' ? 'small' : 'large' } as Record<string, 'small' | 'large'>;
    setSizes(next);
    persist(ids, next);
  }

  function keyLabelFor(widget: WidgetSummary): (key: string) => string {
    return widget.aggregation.groupBy === 'createdBy' ? createdByKeyLabel : (k) => k;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setGalleryOpen(true)}>
          New widget
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ids.map((id) => {
              const widget = widgetsById.get(id);
              if (!widget) return null;
              const canEdit = isAdminOrAbove(user) || widget.owner.id === user?.id;
              return (
                <SortableWidgetCard
                  key={id}
                  id={id}
                  spanClass={sizes[id] === 'large' ? 'md:col-span-2' : ''}
                  widget={widget}
                  size={sizes[id] ?? 'small'}
                  canEdit={canEdit}
                  keyLabel={keyLabelFor(widget)}
                  onToggleSize={() => toggleSize(id)}
                  onDelete={() => setPendingDelete(widget)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {ids.length === 0 && data && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">No widgets yet — pick a starting point:</p>
          <WidgetTemplateGallery onSelect={startWidget} />
        </div>
      )}

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New widget</DialogTitle>
          </DialogHeader>
          <WidgetTemplateGallery onSelect={startWidget} />
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete widget</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Delete "{pendingDelete?.name}"? This cannot be undone.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              {deleteMutation.isPending && <Spinner />}
              Confirm delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SortableWidgetCardProps {
  id: string;
  spanClass: string;
  widget: WidgetSummary;
  size: 'small' | 'large';
  canEdit: boolean;
  keyLabel: (key: string) => string;
  onToggleSize: () => void;
  onDelete: () => void;
}

function SortableWidgetCard({ id, spanClass, widget, size, canEdit, keyLabel, onToggleSize, onDelete }: SortableWidgetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const { data, error } = useQuery({
    queryKey: ['widget', widget.id, 'data'],
    queryFn: () => getWidgetData(widget.id),
  });
  const message =
    error && typeof error === 'object' && 'response' in error
      ? ((error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? null)
      : error
        ? 'Could not load this widget'
        : null;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={spanClass}>
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex flex-col">
          <CardTitle className="text-base">
            <h3 className="contents">{widget.name}</h3>
          </CardTitle>
          {widget.period !== 'all' && (
            <p className="text-xs text-muted-foreground">{WIDGET_PERIOD_LABELS[widget.period]}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {widget.sharedWith.mode === 'shared' && <Badge variant="secondary">Shared</Badge>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Drag ${widget.name} to reorder`}
            className="cursor-grab touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Resize ${widget.name}`}
            title={size === 'large' ? 'Small' : 'Large'}
            onClick={onToggleSize}
          >
            {size === 'large' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {canEdit && (
            <>
              <Button asChild variant="ghost" size="icon" title="Edit">
                <Link
                  to="/dashboard/widgets/$widgetId"
                  params={{ widgetId: widget.id }}
                  aria-label={`Edit ${widget.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${widget.name}`}
                title="Delete"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <WidgetView
          widget={{
            name: widget.name,
            vizType: widget.vizType,
            chartType: widget.chartType,
            aggregation: widget.aggregation,
            period: widget.period,
          }}
          data={data ?? null}
          error={message}
          keyLabel={keyLabel}
        />
      </CardContent>
    </Card>
    </div>
  );
}
