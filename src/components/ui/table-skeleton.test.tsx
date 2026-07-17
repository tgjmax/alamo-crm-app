import { render, screen } from '@testing-library/react';
import { Table, TableBody } from './table';
import { TableSkeleton } from './table-skeleton';

function renderInTable(ui: React.ReactNode) {
  return render(
    <Table>
      <TableBody>{ui}</TableBody>
    </Table>
  );
}

describe('TableSkeleton', () => {
  it('renders the requested number of rows', () => {
    renderInTable(<TableSkeleton columns={4} rows={5} />);
    expect(screen.getAllByTestId('table-skeleton-row')).toHaveLength(5);
  });

  it('renders `columns` cells per row', () => {
    renderInTable(<TableSkeleton columns={3} rows={1} />);
    const row = screen.getByTestId('table-skeleton-row');
    expect(row.querySelectorAll('td')).toHaveLength(3);
  });

  it('defaults to 8 rows when rows is omitted', () => {
    renderInTable(<TableSkeleton columns={2} />);
    expect(screen.getAllByTestId('table-skeleton-row')).toHaveLength(8);
  });
});
