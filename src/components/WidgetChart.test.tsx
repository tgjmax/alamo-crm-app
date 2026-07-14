import { render, screen } from '@testing-library/react';
import WidgetChart from './WidgetChart';

const ROWS = [{ key: 'u1', value: 1200 }, { key: 'u2', value: 300.5 }];
const AGENT_NAMES: Record<string, string> = { u1: 'Priya Nair', u2: 'Sam Roy' };
const formatKey = (k: string) => AGENT_NAMES[k] ?? k;
const formatValue = (v: number) => `$${v.toFixed(2)}`;

describe('WidgetChart', () => {
  it('keeps its labelled chart region', () => {
    render(<WidgetChart chartType="bar" rows={ROWS} label="By agent" formatKey={formatKey} formatValue={formatValue} />);
    expect(screen.getByRole('img', { name: 'By agent (bar chart)' })).toBeInTheDocument();
  });

  // THE BUG: the chart used to receive no labeller at all, so a createdBy-grouped chart
  // rendered raw Mongo ObjectIds while the same widget as a table rendered names.
  it('labels its data with the mapped key, never the raw one', () => {
    render(<WidgetChart chartType="bar" rows={ROWS} label="By agent" formatKey={formatKey} formatValue={formatValue} />);
    expect(screen.getByText('Priya Nair: $1200.00')).toBeInTheDocument();
    expect(screen.getByText('Sam Roy: $300.50')).toBeInTheDocument();
    expect(screen.queryByText(/\bu1\b/)).not.toBeInTheDocument();
  });

  it('describes a pie chart the same way', () => {
    render(<WidgetChart chartType="pie" rows={ROWS} label="By agent" formatKey={formatKey} formatValue={formatValue} />);
    expect(screen.getByRole('img', { name: 'By agent (pie chart)' })).toBeInTheDocument();
    expect(screen.getByText('Priya Nair: $1200.00')).toBeInTheDocument();
  });
});
