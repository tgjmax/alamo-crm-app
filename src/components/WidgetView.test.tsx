import { render, screen } from '@testing-library/react';
import WidgetView from './WidgetView';

const COUNT = { fn: 'count' as const };
const SUM_AMOUNT = { fn: 'sum' as const, field: 'amount' as const };

describe('WidgetView', () => {
  it('renders a scalar count', () => {
    render(
      <WidgetView
        widget={{ name: 'QR count', vizType: 'number', aggregation: COUNT }}
        data={{ kind: 'scalar', value: 42 }}
        error={null}
      />
    );
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('formats a scalar money metric as currency instead of a raw float', () => {
    render(
      <WidgetView
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT }}
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
        widget={{ name: 'By airline', vizType: 'table', aggregation: { ...COUNT, groupBy: 'airlineCode' } }}
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
        widget={{ name: 'Revenue', vizType: 'number', aggregation: SUM_AMOUNT }}
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
        widget={{ name: 'x', vizType: 'number', aggregation: COUNT }}
        data={null}
        error="Could not load this widget"
      />
    );
    expect(screen.getByText('Could not load this widget')).toBeInTheDocument();
  });
});
