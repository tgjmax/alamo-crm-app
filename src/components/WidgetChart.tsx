import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartType } from '../api/widgets.api';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
];

interface WidgetChartProps {
  chartType: ChartType;
  rows: { key: string; value: number }[];
  label: string;
}

export default function WidgetChart({ chartType, rows, label }: WidgetChartProps) {
  return (
    <div role="img" aria-label={`${label} (${chartType} chart)`} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'bar' ? (
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
            <Tooltip />
            <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
            <Tooltip />
            <Line dataKey="value" stroke={CHART_COLORS[0]} dot={false} strokeWidth={2} />
          </LineChart>
        ) : (
          <PieChart>
            <Tooltip />
            <Pie data={rows} dataKey="value" nameKey="key" outerRadius={80}>
              {rows.map((r, i) => (
                <Cell key={r.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
