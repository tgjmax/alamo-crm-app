import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupResultsPage from './GroupResultsPage';
import * as groupsApi from '@/api/groups.api';

vi.mock('@/api/groups.api');
vi.mock('@tanstack/react-router', async () => ({
  ...(await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')),
  useParams: () => ({ groupId: 'g1' }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));

const RESULT: groupsApi.GroupQueryResult = {
  rows: [
    {
      id: 'r1', date: '2026-05-04T00:00:00.000Z', invoiceNumber: 'INV-1', passengerName: 'Jane Doe',
      bookingType: 'New', pnr: 'AAA', airlineCode: 'QR', arrCity: 'COK', amount: 400, paymentStatus: 'paid',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
};

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
  });
  vi.mocked(groupsApi.getGroupResults).mockResolvedValue(RESULT);
  vi.mocked(groupsApi.getGroupFields).mockResolvedValue([
    { key: 'airlineCode', label: 'Airline', type: 'string', operators: ['equals', 'contains', 'in'] },
  ]);
});

describe('GroupResultsPage', () => {
  it('shows the group name and its live matching rows', async () => {
    renderPage();
    expect(await screen.findByText('Qatar bookings')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(groupsApi.getGroupResults).toHaveBeenCalledWith('g1', 1);
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

  it('requests the next page when paging', async () => {
    const user = userEvent.setup();
    vi.mocked(groupsApi.getGroupResults).mockResolvedValue({ ...RESULT, total: 120 });
    renderPage();

    await screen.findByText('Jane Doe');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(groupsApi.getGroupResults).toHaveBeenCalledWith('g1', 2));
  });
});
