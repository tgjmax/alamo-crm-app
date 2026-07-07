import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { vi } from 'vitest';
import { createAppRouter } from '../router';
import { useAuthStore } from '../stores/authStore';
import * as groupsApi from '../api/groups.api';

function renderAtGroups() {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/groups'] }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

const GROUPS = [
  {
    id: 'g1', name: 'May QR bookings', owner: { id: 'u1', name: 'Admin' },
    sharedWith: { mode: 'shared' as const, users: ['u2'] }, conditionCount: 2, updatedAt: '2026-07-06T00:00:00.000Z',
  },
  {
    id: 'g2', name: 'Refunds', owner: { id: 'u1', name: 'Admin' },
    sharedWith: { mode: 'private' as const, users: [] }, conditionCount: 1, updatedAt: '2026-07-05T00:00:00.000Z',
  },
];

describe('GroupsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 't',
      user: { id: 'u1', name: 'Admin', email: 'a@t.test', role: 'admin' },
    });
  });

  it('lists visible groups with share badges', async () => {
    vi.spyOn(groupsApi, 'listGroups').mockResolvedValue(GROUPS);
    renderAtGroups();
    expect(await screen.findByText('May QR bookings')).toBeInTheDocument();
    expect(screen.getByText('Refunds')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('deletes a group after dialog confirmation', async () => {
    vi.spyOn(groupsApi, 'listGroups').mockResolvedValue(GROUPS);
    const del = vi.spyOn(groupsApi, 'deleteGroup').mockResolvedValue();
    renderAtGroups();
    await screen.findByText('May QR bookings');

    await userEvent.click(screen.getByRole('button', { name: 'Delete May QR bookings' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => expect(del).toHaveBeenCalledWith('g1'));
  });
});
