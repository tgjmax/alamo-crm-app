import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { GroupResultRow, GroupQueryResult } from '@/api/groups.api';
import { GroupResultsTable } from './group-results-table';

const noop = () => {};
const baseProps = {
  page: 1,
  pageSize: 25,
  sorting: [],
  columnVisibility: {},
  onPageChange: noop,
  onPageSizeChange: noop,
  onSortingChange: noop,
  onColumnVisibilityChange: noop,
};

const ROW: GroupResultRow = {
  id: 'row-1',
  date: '2026-05-04',
  invoiceNumber: 'INV-1',
  passengerName: 'Jane Smith',
  bookingType: 'New',
  pnr: 'ABC123',
  airlineCode: 'QR',
  depCity: 'DXB',
  arrCity: 'COK',
  depDate: '2026-05-04',
  arrDate: '2026-05-28',
  amount: 500,
  paymentStatus: 'paid',
  remark: '',
};

function renderTable(overrides: Partial<ComponentProps<typeof GroupResultsTable>> & { result: GroupQueryResult | null }) {
  return render(<GroupResultsTable busy={false} {...baseProps} {...overrides} />);
}

describe('GroupResultsTable', () => {
  it('shows a skeleton when busy with no result yet (first load)', () => {
    render(<GroupResultsTable result={null} busy {...baseProps} />);
    expect(screen.getAllByTestId('table-skeleton-row').length).toBeGreaterThan(0);
  });

  it('renders nothing when idle with no result (editor pre-preview state)', () => {
    const { container } = render(<GroupResultsTable result={null} busy={false} {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders no checkbox column when no selection handler is passed', () => {
    renderTable({ result: { rows: [ROW], total: 1, page: 1, pageSize: 25 } });
    expect(screen.queryByRole('checkbox', { name: /select all/i })).not.toBeInTheDocument();
  });

  it('renders a checkbox column and reports selection when a handler is passed', async () => {
    const onRowSelectionChange = vi.fn();
    const user = userEvent.setup();

    renderTable({
      result: { rows: [ROW], total: 1, page: 1, pageSize: 25 },
      rowSelection: {},
      onRowSelectionChange,
    });

    await user.click(screen.getByRole('checkbox', { name: `Select ${ROW.passengerName}` }));
    expect(onRowSelectionChange).toHaveBeenCalled();
  });

  it('renders toolbar actions', () => {
    renderTable({
      result: { rows: [ROW], total: 1, page: 1, pageSize: 25 },
      toolbarActions: <button type="button">Exclude selected</button>,
    });
    expect(screen.getByRole('button', { name: 'Exclude selected' })).toBeInTheDocument();
  });
});
