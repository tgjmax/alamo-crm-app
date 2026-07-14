import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartType } from '../api/widgets.api';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
];

const MAX_TICK_CHARS = 12;

interface WidgetChartProps {
  chartType: ChartType;
  rows: { key: string; value: number }[];
  label: string;
  formatKey: (key: string) => string;
  formatValue: (value: number) => string;
  /** Compact axis-only formatter (`$124.5K`) — full precision (`$124,500.50`) stays in the
   * tooltip/legend/`sr-only` list via `formatValue`. Falls back to `formatValue` if omitted. */
  formatAxisValue?: (value: number) => string;
}

function truncate(text: string): string {
  return text.length > MAX_TICK_CHARS ? `${text.slice(0, MAX_TICK_CHARS - 1)}…` : text;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value?: number; payload?: { key?: string } }[];
  formatKey: (key: string) => string;
  formatValue: (value: number) => string;
}

/**
 * Recharts' default tooltip is an unstyled white box that ignores the app's tokens and prints
 * the raw float. Recharts clones this element with `active`/`payload` injected.
 */
function ChartTooltip({ active, payload, formatKey, formatValue }: ChartTooltipProps) {
  const entry = payload?.[0];
  if (!active || !entry) return null;
  const key = entry.payload?.key ?? '';
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{formatKey(key)}</p>
      <p className="tabular-nums text-muted-foreground">{formatValue(Number(entry.value ?? 0))}</p>
    </div>
  );
}

export default function WidgetChart({
  chartType, rows, label, formatKey, formatValue, formatAxisValue = formatValue,
}: WidgetChartProps) {
  const tooltip = <Tooltip content={<ChartTooltip formatKey={formatKey} formatValue={formatValue} />} />;
  const axisProps = { tickLine: false, axisLine: false, fontSize: 12 } as const;

  return (
    <div className="w-full">
      <div role="img" aria-label={`${label} (${chartType} chart)`} className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="key" {...axisProps} tickFormatter={(key: string) => truncate(formatKey(key))} />
              <YAxis {...axisProps} width={64} tickFormatter={(value: number) => formatAxisValue(value)} />
              {tooltip}
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="key" {...axisProps} tickFormatter={(key: string) => truncate(formatKey(key))} />
              <YAxis {...axisProps} width={64} tickFormatter={(value: number) => formatAxisValue(value)} />
              {tooltip}
              <Line dataKey="value" stroke={CHART_COLORS[0]} dot={false} strokeWidth={2} />
            </LineChart>
          ) : (
            <PieChart>
              {tooltip}
              <Legend formatter={(key: string) => truncate(formatKey(key))} />
              <Pie
                data={rows}
                dataKey="value"
                nameKey="key"
                outerRadius={70}
                label={({ percent }: { percent?: number }) => `${Math.round((percent ?? 0) * 100)}%`}
                labelLine={false}
              >
                {rows.map((r, i) => (
                  <Cell key={r.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/*
        The chart's text alternative. A SIBLING of the role="img" element, never a child —
        role="img" makes its descendants presentational, so a list nested inside it would be
        invisible to assistive tech. It is also the only chart content jsdom can see, because
        ResponsiveContainer has zero size there and Recharts renders no ticks or legend.
      */}
      <ul className="sr-only">
        {rows.map((r) => (
          <li key={r.key}>{`${formatKey(r.key)}: ${formatValue(r.value)}`}</li>
        ))}
      </ul>
    </div>
  );
}
