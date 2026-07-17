import { render, screen } from '@testing-library/react';
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

describe('GroupResultsTable', () => {
  it('shows a skeleton when busy with no result yet (first load)', () => {
    render(<GroupResultsTable result={null} busy {...baseProps} />);
    expect(screen.getAllByTestId('table-skeleton-row').length).toBeGreaterThan(0);
  });

  it('renders nothing when idle with no result (editor pre-preview state)', () => {
    const { container } = render(<GroupResultsTable result={null} busy={false} {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });
});
