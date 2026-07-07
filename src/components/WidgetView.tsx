import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ChartType, WidgetData, WidgetVizType } from '../api/widgets.api';
import WidgetChart from './WidgetChart';

interface WidgetViewProps {
  widget: { name: string; vizType: WidgetVizType; chartType?: ChartType };
  data: WidgetData | null;
  error: string | null;
  keyLabel?: (key: string) => string;
}

export default function WidgetView({ widget, data, error, keyLabel = (k) => k }: WidgetViewProps) {
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (widget.vizType === 'number') {
    const value = data.kind === 'scalar' ? data.value : 0;
    return <p className="text-4xl font-semibold tabular-nums">{value}</p>;
  }

  const rows = data.kind === 'breakdown' ? data.rows : [];

  if (widget.vizType === 'chart' && widget.chartType) {
    return <WidgetChart chartType={widget.chartType} rows={rows} label={widget.name} />;
  }

  return (
    <Table>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell>{keyLabel(r.key)}</TableCell>
            <TableCell className="text-right tabular-nums">{r.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
