import { render, screen } from '@testing-library/react';
import WidgetView from './WidgetView';

const COUNT = { fn: 'count' as const };
const SUM_AMOUNT = { fn: 'sum' as const, field: 'amount' as const };

describe('WidgetView', () => {
  it('renders a scalar count', () => {
    render(
      <WidgetView
        widget={{ name: 'QR count', vizType: 'number', aggregation: COUNT, period: 'all' }}
        data={{ kind: 'scalar', value: 42 }}
        error={null}
      />
    );
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('formats a scalar money metric as currency instead of a raw float', () => {
    render(
      <WidgetView
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT, period: 'all' }}
        data={{ kind: 'scalar', value: 124500.5 }}
        error={null}
      />
    );
    expect(screen.getByText('$124,500.50')).toBeInTheDocument();
    expect(screen.queryByText('124500.5')).not.toBeInTheDocument();
  });

  it('formats breakdown table values and maps their keys', () => {
    render(
      <WidgetView
        widget={{
          name: 'By agent',
          vizType: 'table',
          aggregation: { ...SUM_AMOUNT, groupBy: 'createdBy' },
          period: 'all',
        }}
        data={{ kind: 'breakdown', rows: [{ key: 'u1', value: 1200 }, { key: 'u2', value: 300.5 }] }}
        error={null}
        keyLabel={(k) => (k === 'u1' ? 'Priya Nair' : k)}
      />
    );
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('u2')).toBeInTheDocument();
    expect(screen.getByText('$300.50')).toBeInTheDocument();
  });

  it('renders the (none) bucket as Unspecified', () => {
    render(
      <WidgetView
        widget={{ name: 'By airline', vizType: 'table', aggregation: { ...COUNT, groupBy: 'airlineCode' }, period: 'all' }}
        data={{ kind: 'breakdown', rows: [{ key: '(none)', value: 3 }] }}
        error={null}
      />
    );
    expect(screen.getByText('Unspecified')).toBeInTheDocument();
    expect(screen.queryByText('(none)')).not.toBeInTheDocument();
  });

  it('renders a labelled chart region for chart widgets', () => {
    render(
      <WidgetView
        widget={{
          name: 'Monthly sales',
          vizType: 'chart',
          chartType: 'bar',
          aggregation: { ...SUM_AMOUNT, groupBy: 'month' },
          period: 'all',
        }}
        data={{ kind: 'breakdown', rows: [{ key: '2026-05', value: 400 }] }}
        error={null}
      />
    );
    expect(screen.getByRole('img', { name: 'Monthly sales (bar chart)' })).toBeInTheDocument();
  });

  it('shows a skeleton, not the word Loading, while data is absent', () => {
    render(
      <WidgetView
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT, period: 'all' }}
        data={null}
        error={null}
      />
    );
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('shows an error instead of data', () => {
    render(
      <WidgetView
        widget={{ name: 'x', vizType: 'number', aggregation: COUNT, period: 'all' }}
        data={null}
        error="Could not load this widget"
      />
    );
    expect(screen.getByText('Could not load this widget')).toBeInTheDocument();
  });

  it('renders a delta with its comparison label', () => {
    render(
      <WidgetView
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT, period: 'thisMonth' }}
        data={{ kind: 'scalar', value: 124500.5, previousValue: 110000, changePct: 13.2 }}
        error={null}
      />
    );
    expect(screen.getByText(/13\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/vs last month/i)).toBeInTheDocument();
  });

  // changePct === null means the previous period was ZERO. There is no comparison to draw.
  it('renders NO delta when changePct is null — never "null%"', () => {
    render(
      <WidgetView
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT, period: 'thisMonth' }}
        data={{ kind: 'scalar', value: 500, previousValue: 0, changePct: null }}
        error={null}
      />
    );
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vs last month/i)).not.toBeInTheDocument();
  });

  // A REAL zero change is not the same as "no comparison". It must still render.
  it('renders a 0% delta — an unchanged period is a real result, not a missing one', () => {
    render(
      <WidgetView
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT, period: 'thisMonth' }}
        data={{ kind: 'scalar', value: 500, previousValue: 500, changePct: 0 }}
        error={null}
      />
    );
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('renders no delta at all on an all-time widget', () => {
    render(
      <WidgetView
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT, period: 'all' }}
        data={{ kind: 'scalar', value: 500 }}
        error={null}
      />
    );
    expect(screen.queryByText(/vs /i)).not.toBeInTheDocument();
  });

  it('renders a sparkline with an sr-only text alternative', () => {
    render(
      <WidgetView
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT, period: 'thisMonth' }}
        data={{
          kind: 'scalar', value: 500, previousValue: 400, changePct: 25,
          series: [{ key: '2026-07-01', value: 100 }, { key: '2026-07-02', value: 0 }, { key: '2026-07-03', value: 400 }],
        }}
        error={null}
      />
    );
    expect(screen.getByRole('img', { name: /revenue.*trend/i })).toBeInTheDocument();
    // The gap-filled zero is a REAL measured value and must be voiced, not skipped.
    expect(screen.getByText(/2026-07-02: \$0\.00/)).toBeInTheDocument();
  });

  it('renders no sparkline for a single point — one point is not a trend', () => {
    render(
      <WidgetView
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT, period: 'thisMonth' }}
        data={{ kind: 'scalar', value: 500, series: [{ key: '2026-07-01', value: 500 }] }}
        error={null}
      />
    );
    expect(screen.queryByRole('img', { name: /trend/i })).not.toBeInTheDocument();
  });
});
