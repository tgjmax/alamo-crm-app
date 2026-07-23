import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import GroupResultsPage from './GroupResultsPage';
import * as groupsApi from '@/api/groups.api';
import { useAuthStore } from '@/stores/authStore';
import { useParams } from '@tanstack/react-router';

// A bare `vi.mock('@/api/groups.api')` automocks every export, including the plain constant
// `GROUP_PAGE_SIZES` array — Vitest's automocker replaces it with `[]`, which silently renders
// zero options in the Rows-per-page Select. Preserve the real (non-function) exports and only
// mock the functions this test actually stubs with mockResolvedValue.
vi.mock('@/api/groups.api', async () => {
  const actual = await vi.importActual<typeof import('@/api/groups.api')>('@/api/groups.api');
  return {
    ...actual,
    getGroup: vi.fn(),
    getGroupResults: vi.fn(),
    getGroupFields: vi.fn(),
    deleteGroup: vi.fn(),
    updateGroupView: vi.fn(),
    updateGroupExclusions: vi.fn(),
    getGroupReport: vi.fn(),
  };
});
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    useParams: vi.fn(() => ({ groupId: 'g1' })),
    Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
  };
});

const RESULT: groupsApi.GroupQueryResult = {
  rows: [
    {
      id: 'r1',
      date: '2026-05-04T00:00:00.000Z',
      invoiceNumber: 'INV-1',
      passengerName: 'Jane Doe',
      bookingType: 'New',
      pnr: 'AAA',
      airlineCode: 'QR',
      depCity: 'DXB',
      arrCity: 'COK',
      depDate: '2026-05-08T00:00:00.000Z',
      arrDate: '2026-05-28T00:00:00.000Z',
      amount: 400,
      paymentStatus: 'pending',
      paymentAmount: 50,
      remark: 'Window seat',
    },
    {
      id: 'r2',
      date: '2026-05-06T00:00:00.000Z',
      // No invoiceNumber — a Reissue/Refund adjustment has no parent Booking/invoice of its own.
      passengerName: 'John Roe',
      bookingType: 'Reissue',
      amount: 50,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 25,
};

const ROW = RESULT.rows[0];

const DEFAULT_PARAMS = { page: 1, pageSize: 25, sortBy: undefined, sortDir: undefined };

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <GroupResultsPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(groupsApi.getGroup).mockResolvedValue({
    id: 'g1',
    name: 'Qatar bookings',
    owner: { id: 'u1', name: 'Anna' },
    sharedWith: { mode: 'private', users: [] },
    conditions: [{ field: 'airlineCode', operator: 'equals', value: 'QR' }],
    excludedCount: 0,
  });
  vi.mocked(groupsApi.getGroupResults).mockResolvedValue(RESULT);
  vi.mocked(groupsApi.getGroupFields).mockResolvedValue([
    { key: 'airlineCode', label: 'Airline', type: 'string', operators: ['equals', 'contains', 'in'] },
  ]);
  // updateGroupView's call history otherwise leaks across tests (nothing else resets a `vi.fn()`'s
  // calls array between tests in this file) — without this, a "does not persist" assertion could
  // see a PRIOR test's persist call and fail for the wrong reason.
  vi.mocked(groupsApi.updateGroupView).mockClear();
  vi.mocked(groupsApi.updateGroupExclusions).mockClear();
  vi.mocked(groupsApi.getGroupReport).mockReset().mockResolvedValue(undefined);
});

describe('GroupResultsPage', () => {
  afterEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
    vi.mocked(useParams).mockReturnValue({ groupId: 'g1' });
  });

  it('shows the group name and its live matching rows', async () => {
    renderPage();
    expect(await screen.findByText('Qatar bookings')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(groupsApi.getGroupResults).toHaveBeenCalledWith('g1', DEFAULT_PARAMS);
  });

  it('summarises the conditions in plain English using the field labels', async () => {
    renderPage();
    expect(await screen.findByText(/Airline equals QR/)).toBeInTheDocument();
  });

  it('offers Edit conditions and Delete', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Edit conditions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete group' })).toBeInTheDocument();
  });

  it('renders the same columns the Bookings table does', async () => {
    renderPage();
    await screen.findByText('Jane Doe');

    for (const header of [
      'Booking Date', 'Invoice#', 'Name of PAX', 'Amount', 'PNR',
      'Airlines', 'Dep City', 'Arr City', 'Dep Date', 'Arr Date', 'Payment', 'Remark',
    ]) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }

    // Formatted, not raw ISO — and the payment badge with its outstanding-balance caption.
    expect(screen.getByText('04 May 2026')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('$50.00 due')).toBeInTheDocument();
    expect(screen.getByText('DXB')).toBeInTheDocument();
    expect(screen.getByText('Window seat')).toBeInTheDocument();
  });

  it('shows the booking type in place of a blank Invoice# for a Reissue/Refund row', async () => {
    renderPage();
    await screen.findByText('Jane Doe');
    await screen.findByText('John Roe');

    expect(screen.getByText('REISSUE')).toBeInTheDocument();
  });

  it('re-queries with sortBy/sortDir when a column header is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Jane Doe');

    await user.click(screen.getByRole('button', { name: /Name of PAX/ }));

    await waitFor(() =>
      expect(groupsApi.getGroupResults).toHaveBeenCalledWith('g1', {
        page: 1, pageSize: 25, sortBy: 'passengerName', sortDir: 'asc',
      })
    );
  });

  it('re-queries with the new pageSize when rows-per-page changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Jane Doe');

    await user.click(screen.getByRole('combobox', { name: 'Rows per page' }));
    await user.click(await screen.findByRole('option', { name: '50' }));

    await waitFor(() =>
      expect(groupsApi.getGroupResults).toHaveBeenCalledWith('g1', {
        page: 1, pageSize: 50, sortBy: undefined, sortDir: undefined,
      })
    );
  });

  it('requests the next page when paging', async () => {
    const user = userEvent.setup();
    vi.mocked(groupsApi.getGroupResults).mockResolvedValue({ ...RESULT, total: 120 });
    renderPage();

    await screen.findByText('Jane Doe');
    // PaginationNext's accessible name is its aria-label ("Go to next page"), which overrides the
    // visible "Next" text node — a case-sensitive /Next/ never matches it.
    await user.click(screen.getByRole('link', { name: /next/i }));

    await waitFor(() =>
      expect(groupsApi.getGroupResults).toHaveBeenCalledWith('g1', { ...DEFAULT_PARAMS, page: 2 })
    );
  });

  it('shows a View menu that can hide a column', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Jane Doe');
    expect(screen.getByText('Remark')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View' }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Remark' }));

    await waitFor(() => expect(screen.queryByText('Window seat')).not.toBeInTheDocument());
  });

  it("seeds columns and sort from the group's saved view on load", async () => {
    vi.mocked(groupsApi.getGroup).mockResolvedValue({
      id: 'g1',
      name: 'Qatar bookings',
      owner: { id: 'u1', name: 'Anna' },
      sharedWith: { mode: 'private', users: [] },
      conditions: [{ field: 'airlineCode', operator: 'equals', value: 'QR' }],
      excludedCount: 0,
      view: { hiddenColumns: ['remark'], sort: { id: 'amount', desc: true } },
    });
    renderPage();

    await screen.findByText('Jane Doe');
    expect(screen.queryByText('Window seat')).not.toBeInTheDocument();
    expect(groupsApi.getGroupResults).toHaveBeenCalledWith('g1', {
      page: 1, pageSize: 25, sortBy: 'amount', sortDir: 'desc',
    });
  });

  it("debounce-saves the owner's view when a column is toggled", async () => {
    useAuthStore.setState({ accessToken: 't', user: { id: 'u1', name: 'Anna', email: 'a@t.test', role: 'agent' } });
    const updateView = vi.mocked(groupsApi.updateGroupView).mockResolvedValue({ hiddenColumns: ['remark'] });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Jane Doe');

    await user.click(screen.getByRole('button', { name: 'View' }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Remark' }));

    await waitFor(
      () => expect(updateView).toHaveBeenCalledWith('g1', { hiddenColumns: ['remark'], sort: undefined }),
      { timeout: 2000 }
    );
  });

  it('lets a superadmin persist the view of a group they do not own', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: { id: 'someone-else', name: 'Sup', email: 's@t.test', role: 'superadmin' },
    });
    const updateView = vi.mocked(groupsApi.updateGroupView).mockResolvedValue({ hiddenColumns: ['remark'] });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Jane Doe');

    await user.click(screen.getByRole('button', { name: 'View' }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Remark' }));

    await waitFor(
      () => expect(updateView).toHaveBeenCalledWith('g1', { hiddenColumns: ['remark'], sort: undefined }),
      { timeout: 2000 }
    );
  });

  it('does not persist a column toggle for a shared, non-owner viewer', async () => {
    useAuthStore.setState({ accessToken: 't', user: { id: 'u2', name: 'Bob', email: 'b@t.test', role: 'agent' } });
    const updateView = vi.mocked(groupsApi.updateGroupView).mockResolvedValue({ hiddenColumns: [] });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Jane Doe');

    await user.click(screen.getByRole('button', { name: 'View' }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Remark' }));
    await waitFor(() => expect(screen.queryByText('Window seat')).not.toBeInTheDocument());

    // Give the 600ms debounce window time to fully elapse before asserting it never fired — there is
    // no bounded way to prove a negative with `waitFor` alone. This is a deliberate exception to the
    // "no raw sleeps" instinct, specific to proving a debounced call did NOT happen.
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(updateView).not.toHaveBeenCalled();
  });

  it("re-seeds to the new group's own saved view when navigating from one group to another", async () => {
    vi.mocked(groupsApi.getGroup).mockImplementation(async (id: string) =>
      id === 'g1'
        ? {
            id: 'g1', name: 'Qatar bookings', owner: { id: 'u1', name: 'Anna' },
            sharedWith: { mode: 'private', users: [] },
            conditions: [{ field: 'airlineCode', operator: 'equals', value: 'QR' }],
            excludedCount: 0,
            view: { hiddenColumns: ['remark'] },
          }
        : {
            id: 'g2', name: 'Refunds', owner: { id: 'u1', name: 'Anna' },
            sharedWith: { mode: 'private', users: [] },
            conditions: [{ field: 'airlineCode', operator: 'equals', value: 'EK' }],
            excludedCount: 0,
            view: { hiddenColumns: ['depCity'] },
          }
    );
    vi.mocked(groupsApi.getGroupResults).mockResolvedValue(RESULT);

    // Same QueryClient across both renders — this is modelling ONE app session where only the route
    // param changes, same as GroupResultsPage staying mounted across a client-side navigation.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <GroupResultsPage />
      </QueryClientProvider>
    );
    await screen.findByText('Jane Doe');
    expect(screen.queryByText('Remark')).not.toBeInTheDocument();
    expect(screen.getByText('Dep City')).toBeInTheDocument();

    vi.mocked(useParams).mockReturnValue({ groupId: 'g2' });
    rerender(
      <QueryClientProvider client={client}>
        <GroupResultsPage />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Remark')).toBeInTheDocument());
    expect(screen.queryByText('Dep City')).not.toBeInTheDocument();
  });

  it('excludes the selected rows and clears the selection', async () => {
    const user = userEvent.setup();
    vi.mocked(groupsApi.updateGroupExclusions).mockResolvedValue(1);

    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: `Select ${ROW.passengerName}` }));
    await user.click(screen.getByRole('button', { name: /exclude selected \(1\)/i }));

    await waitFor(() => {
      expect(groupsApi.updateGroupExclusions).toHaveBeenCalledWith('g1', { add: [ROW.id] });
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /exclude selected/i })).not.toBeInTheDocument();
    });
  });

  it('toasts on a failed exclude', async () => {
    const user = userEvent.setup();
    const errorToast = vi.spyOn(toast, 'error');
    vi.mocked(groupsApi.updateGroupExclusions).mockRejectedValue(new Error('nope'));

    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: `Select ${ROW.passengerName}` }));
    await user.click(screen.getByRole('button', { name: /exclude selected \(1\)/i }));

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
  });

  // Regression for a real race: MutationObserver.setOptions() re-runs on every render and replaces
  // an in-flight mutation's callbacks with the LATEST render's closure. If onSuccess reads the live
  // `selectedIds` state instead of the variables that were actually submitted, selecting more rows
  // while the first request is still pending makes the eventual toast report the WRONG count.
  it('reports the submitted count in the toast, not a later selection made while the request is in flight', async () => {
    const user = userEvent.setup();
    const successToast = vi.spyOn(toast, 'success');
    let resolveExclude: (value: number) => void = () => {};
    const pending = new Promise<number>((resolve) => {
      resolveExclude = resolve;
    });
    vi.mocked(groupsApi.updateGroupExclusions).mockReturnValue(pending);

    renderPage();

    // Select 1 row and click Exclude — the request goes out with exactly 1 id.
    await user.click(await screen.findByRole('checkbox', { name: `Select ${RESULT.rows[0].passengerName}` }));
    await user.click(screen.getByRole('button', { name: /exclude selected \(1\)/i }));
    await waitFor(() => {
      expect(groupsApi.updateGroupExclusions).toHaveBeenCalledWith('g1', { add: [RESULT.rows[0].id] });
    });

    // While that request is still in flight (nothing disables the checkboxes), select a second row.
    await user.click(await screen.findByRole('checkbox', { name: `Select ${RESULT.rows[1].passengerName}` }));

    // Now let the original (1-row) request resolve.
    resolveExclude(1);

    await waitFor(() => expect(successToast).toHaveBeenCalled());
    expect(successToast).toHaveBeenCalledWith('Row excluded');
    expect(successToast).not.toHaveBeenCalledWith('2 rows excluded');
  });

  it('opens the excluded-rows dialog from the Excluded button', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Jane Doe');

    expect(screen.queryByText('Excluded rows')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /excluded \(0\)/i }));

    expect(await screen.findByText('Excluded rows')).toBeInTheDocument();
  });

  it('downloads the group report when Print is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Qatar bookings');

    await user.click(screen.getByRole('button', { name: /print/i }));

    expect(groupsApi.getGroupReport).toHaveBeenCalledWith('g1', 'Qatar bookings');
  });
});
