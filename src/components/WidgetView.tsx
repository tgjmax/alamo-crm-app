import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ChartType, WidgetAggregation, WidgetData, WidgetVizType } from '../api/widgets.api';
import { formatAxisValue, formatWidgetKey, formatWidgetValue } from '../utils/widgetFormat';
import WidgetChart from './WidgetChart';

interface WidgetViewProps {
  widget: {
    name: string;
    vizType: WidgetVizType;
    chartType?: ChartType;
    aggregation: WidgetAggregation;
  };
  data: WidgetData | null;
  error: string | null;
  keyLabel?: (key: string) => string;
}

function LoadingSkeleton({ vizType }: { vizType: WidgetVizType }) {
  if (vizType === 'number') return <Skeleton data-testid="widget-skeleton" className="h-10 w-40" />;
  if (vizType === 'chart') return <Skeleton data-testid="widget-skeleton" className="h-56 w-full" />;
  return (
    <div data-testid="widget-skeleton" className="space-y-2">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
    </div>
  );
}

export default function WidgetView({ widget, data, error, keyLabel }: WidgetViewProps) {
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <LoadingSkeleton vizType={widget.vizType} />;

  const { aggregation } = widget;
  const formatValue = (value: number) => formatWidgetValue(value, aggregation);
  const formatKey = (key: string) => formatWidgetKey(key, aggregation.groupBy, keyLabel);
  const formatAxis = (value: number) => formatAxisValue(value, aggregation);

  if (widget.vizType === 'number') {
    const value = data.kind === 'scalar' ? data.value : 0;
    return <p className="text-4xl font-semibold tabular-nums">{formatValue(value)}</p>;
  }

  const rows = data.kind === 'breakdown' ? data.rows : [];

  if (widget.vizType === 'chart' && widget.chartType) {
    return (
      <WidgetChart
        chartType={widget.chartType}
        rows={rows}
        label={widget.name}
        formatKey={formatKey}
        formatValue={formatValue}
        formatAxisValue={formatAxis}
      />
    );
  }

  return (
    <Table>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell>{formatKey(r.key)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatValue(r.value)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
