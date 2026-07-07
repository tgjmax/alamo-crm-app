import { render, screen } from '@testing-library/react';
import WidgetView from './WidgetView';

describe('WidgetView', () => {
  it('renders a scalar number', () => {
    render(<WidgetView widget={{ name: 'QR count', vizType: 'number' }} data={{ kind: 'scalar', value: 42 }} error={null} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders a breakdown table with mapped keys', () => {
    render(
      <WidgetView
        widget={{ name: 'By agent', vizType: 'table' }}
        data={{ kind: 'breakdown', rows: [{ key: 'u1', value: 5 }, { key: 'u2', value: 3 }] }}
        error={null}
        keyLabel={(k) => (k === 'u1' ? 'Anna' : k)}
      />
    );
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('u2')).toBeInTheDocument();
  });

  it('renders a labelled chart region for chart widgets', () => {
    render(
      <WidgetView
        widget={{ name: 'Monthly sales', vizType: 'chart', chartType: 'bar' }}
        data={{ kind: 'breakdown', rows: [{ key: '2026-05', value: 400 }] }}
        error={null}
      />
    );
    expect(screen.getByRole('img', { name: 'Monthly sales (bar chart)' })).toBeInTheDocument();
  });

  it('shows an error instead of data', () => {
    render(<WidgetView widget={{ name: 'x', vizType: 'number' }} data={null} error="The source group is unavailable" />);
    expect(screen.getByText('The source group is unavailable')).toBeInTheDocument();
  });
});
