import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface WidgetSparklineProps {
  rows: { key: string; value: number }[];
  label: string;
  formatValue: (value: number) => string;
}

/**
 * An axis-less, dot-less, tooltip-less line. It is read as a SHAPE, not as data — the precise
 * numbers live in the figure above it, so gridlines, labels and a legend would only add noise.
 *
 * The `sr-only` list is the chart's text alternative and, as with `WidgetChart`, it is a SIBLING of
 * the `role="img"` element — never a child, because `role="img"` makes its descendants
 * presentational and a nested list would never reach assistive tech. It is also the only content
 * jsdom can see: `ResponsiveContainer` has zero size there, so Recharts renders nothing at all.
 */
export default function WidgetSparkline({ rows, label, formatValue }: WidgetSparklineProps) {
  return (
    <div className="w-full">
      <div role="img" aria-label={`${label} trend`} className="h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              dataKey="value"
              stroke="hsl(var(--chart-1))"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {rows.map((r) => (
          <li key={r.key}>{`${r.key}: ${formatValue(r.value)}`}</li>
        ))}
      </ul>
    </div>
  );
}
