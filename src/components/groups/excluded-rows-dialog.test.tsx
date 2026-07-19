import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExcludedRowsDialog } from './excluded-rows-dialog';
import * as groupsApi from '@/api/groups.api';

vi.mock('@/api/groups.api', async (importActual) => ({
  ...(await importActual<typeof groupsApi>()),
  getGroupResults: vi.fn(),
  updateGroupExclusions: vi.fn(),
}));

const ROW: groupsApi.GroupResultRow = {
  id: 'p1',
  date: '2026-05-04T00:00:00.000Z',
  invoiceNumber: '0000150',
  passengerName: 'ONE/PAX',
  bookingType: 'New',
  amount: 100,
};

const ROW2: groupsApi.GroupResultRow = {
  id: 'p2',
  date: '2026-05-05T00:00:00.000Z',
  invoiceNumber: '0000151',
  passengerName: 'TWO/PAX',
  bookingType: 'New',
  amount: 200,
};

function renderDialog(view?: groupsApi.GroupView) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ExcludedRowsDialog open onOpenChange={() => {}} groupId="g1" view={view} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(groupsApi.getGroupResults).mockResolvedValue({ rows: [ROW, ROW2], total: 2, page: 1, pageSize: 25 });
  vi.mocked(groupsApi.updateGroupExclusions).mockResolvedValue(0);
});

afterEach(() => {
  vi.clearAllMocks();
});

// The dialog body now lives inside DialogContent, which Radix unmounts entirely when closed — so
// the explicit `enabled: open` guard on the query was removed as redundant. This proves that hold:
// the query must still not fire while `open` is false.
it('does not query while closed', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ExcludedRowsDialog open={false} onOpenChange={() => {}} groupId="g1" />
    </QueryClientProvider>
  );

  // Give any wrongly-fired query a chance to resolve before asserting the negative.
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(groupsApi.getGroupResults).not.toHaveBeenCalled();
});

it('requests only the excluded rows', async () => {
  renderDialog();
  await waitFor(() => {
    expect(groupsApi.getGroupResults).toHaveBeenCalledWith(
      'g1',
      expect.objectContaining({ excluded: true })
    );
  });
});

// Regression: the sort control used to be wired to local table state only (`onSortingChange`
// updated `sorting`, but the query never read it) — clicking a column header flipped the arrow and
// did nothing. Mirrors GroupResultsPage.test.tsx's equivalent sort-requery test.
it('re-queries with sortBy/sortDir when a column header is clicked', async () => {
  const user = userEvent.setup();
  renderDialog();
  await screen.findByText('ONE/PAX');

  await user.click(screen.getByRole('button', { name: /Name of PAX/ }));

  await waitFor(() => {
    expect(groupsApi.getGroupResults).toHaveBeenCalledWith('g1', {
      page: 1, pageSize: 25, sortBy: 'passengerName', sortDir: 'asc', excluded: true,
    });
  });
});

it('restores the selected rows', async () => {
  const user = userEvent.setup();
  renderDialog();

  await user.click(await screen.findByRole('checkbox', { name: 'Select ONE/PAX' }));
  await user.click(screen.getByRole('button', { name: /restore selected \(1\)/i }));

  await waitFor(() => {
    expect(groupsApi.updateGroupExclusions).toHaveBeenCalledWith('g1', { remove: ['p1'] });
  });
});

it('toasts on a failed restore', async () => {
  const user = userEvent.setup();
  const errorToast = vi.spyOn(toast, 'error');
  vi.mocked(groupsApi.updateGroupExclusions).mockRejectedValue(new Error('nope'));
  renderDialog();

  await user.click(await screen.findByRole('checkbox', { name: 'Select ONE/PAX' }));
  await user.click(screen.getByRole('button', { name: /restore selected \(1\)/i }));

  await waitFor(() => expect(errorToast).toHaveBeenCalled());
});

// Regression for a real race: MutationObserver.setOptions() re-runs on every render and replaces an
// in-flight mutation's callbacks with the LATEST render's closure. If onSuccess reads live
// `selectedIds` state instead of the variables actually submitted, selecting more rows while the
// first request is still pending makes the eventual toast report the WRONG count. Mirrors the
// equivalent test in GroupResultsPage.test.tsx for excludeMutation.
it('reports the submitted count in the toast, not a later selection made while the request is in flight', async () => {
  const user = userEvent.setup();
  const successToast = vi.spyOn(toast, 'success');
  let resolveRestore: (value: number) => void = () => {};
  const pending = new Promise<number>((resolve) => {
    resolveRestore = resolve;
  });
  vi.mocked(groupsApi.updateGroupExclusions).mockReturnValue(pending);

  renderDialog();

  // Select 1 row and click Restore — the request goes out with exactly 1 id.
  await user.click(await screen.findByRole('checkbox', { name: 'Select ONE/PAX' }));
  await user.click(screen.getByRole('button', { name: /restore selected \(1\)/i }));
  await waitFor(() => {
    expect(groupsApi.updateGroupExclusions).toHaveBeenCalledWith('g1', { remove: ['p1'] });
  });

  // While that request is still in flight (nothing disables the checkboxes), select a second row.
  await user.click(await screen.findByRole('checkbox', { name: 'Select TWO/PAX' }));

  // Now let the original (1-row) request resolve.
  resolveRestore(1);

  await waitFor(() => expect(successToast).toHaveBeenCalled());
  expect(successToast).toHaveBeenCalledWith('Row restored');
  expect(successToast).not.toHaveBeenCalledWith('2 rows restored');
});

// Regression: the dialog's parent (GroupResultsPage) renders this component gated on `group`, not
// on `open` — so the instance never unmounts when the dialog closes, only Radix's DialogContent
// does. If state lived at the top level (above <Dialog>), a selection made in one open/close cycle
// would survive into the next, letting the user restore rows they never re-confirmed.
it('does not carry a row selection across a close and reopen', async () => {
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { rerender } = render(
    <QueryClientProvider client={client}>
      <ExcludedRowsDialog open onOpenChange={() => {}} groupId="g1" />
    </QueryClientProvider>
  );

  await user.click(await screen.findByRole('checkbox', { name: 'Select ONE/PAX' }));
  expect(screen.getByRole('button', { name: /restore selected \(1\)/i })).toBeInTheDocument();

  // Close without restoring.
  rerender(
    <QueryClientProvider client={client}>
      <ExcludedRowsDialog open={false} onOpenChange={() => {}} groupId="g1" />
    </QueryClientProvider>
  );

  // Reopen.
  rerender(
    <QueryClientProvider client={client}>
      <ExcludedRowsDialog open onOpenChange={() => {}} groupId="g1" />
    </QueryClientProvider>
  );

  await screen.findByRole('checkbox', { name: 'Select ONE/PAX' });
  expect(screen.queryByRole('button', { name: /restore selected/i })).not.toBeInTheDocument();
});

// The excluded list must open with the SAME columns the user configured on the group's own results
// table — otherwise a group whose owner hid half the columns shows the full set here.
it('opens with the columns hidden by the group\'s saved view', async () => {
  renderDialog({ hiddenColumns: ['pnr', 'remark'] });

  // A column NOT in hiddenColumns still renders...
  expect(await screen.findByRole('columnheader', { name: /invoice/i })).toBeInTheDocument();
  // ...and the hidden ones do not.
  expect(screen.queryByRole('columnheader', { name: /^pnr$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: /remark/i })).not.toBeInTheDocument();
});

it('shows every column when the group has no saved view', async () => {
  renderDialog();

  expect(await screen.findByRole('columnheader', { name: /^pnr$/i })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: /remark/i })).toBeInTheDocument();
});
