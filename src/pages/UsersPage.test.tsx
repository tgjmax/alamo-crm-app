import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import UsersPage from './UsersPage';
import { useAuthStore } from '@/stores/authStore';
import * as usersApi from '@/api/users.api';

vi.mock('@/api/users.api', async (importActual) => ({
  ...(await importActual<typeof usersApi>()),
  listUsers: vi.fn(),
  setUserActive: vi.fn(),
}));

const PERMS = {
  bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: true, import: false, export: false, sendInvoice: false },
  customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: false },
  groups: { createShared: false },
  data: { viewReports: false },
  enquiries: { sendQuote: false },
};

// A privileged agent -- holds customers.export, one of the four ADMIN_RESTRICTED keys an
// ordinary admin does NOT get for free. Used to test the password-reset takeover guard.
const PERMS_WITH_EXPORT = {
  ...PERMS,
  customers: { ...PERMS.customers, export: true },
};

const USERS: usersApi.ManagedUser[] = [
  { id: 'u1', name: 'Toncy Z', email: 't@a.test', role: 'superadmin', permissions: PERMS, active: true },
  { id: 'u2', name: 'Priya M', email: 'p@a.test', role: 'admin', permissions: PERMS, active: true },
  { id: 'u3', name: 'Alex K', email: 'a@a.test', role: 'agent', permissions: PERMS, active: false },
  // A second, non-self Super Admin — needed to test the role-based "no Permissions on a
  // superadmin row" rule independently of the self-row rule (Toncy Z, the logged-in user
  // in this fixture, is also a superadmin but is exercised by the self-row test instead).
  { id: 'u4', name: 'Sam R', email: 's@a.test', role: 'superadmin', permissions: PERMS, active: true },
  // A privileged agent -- holds customers.export. Used by the password-reset-takeover tests.
  { id: 'u5', name: 'Riley P', email: 'r@a.test', role: 'agent', permissions: PERMS_WITH_EXPORT, active: true },
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UsersPage />
    </QueryClientProvider>
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.listUsers).mockResolvedValue(USERS);
    useAuthStore.setState({
      accessToken: 't',
      user: { id: 'u1', name: 'Toncy Z', email: 't@a.test', role: 'superadmin' },
    });
  });

  it('renders a row per user with a role badge and a status', async () => {
    renderPage();
    expect(await screen.findByText('Priya M')).toBeInTheDocument();
    expect(screen.getAllByText('Super Admin')).toHaveLength(2);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('deactivates a user from the row actions', async () => {
    vi.mocked(usersApi.setUserActive).mockResolvedValue({ ...USERS[1], active: false });
    renderPage();
    await screen.findByText('Priya M');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Priya M' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }));
    await waitFor(() => expect(usersApi.setUserActive).toHaveBeenCalledWith('u2', false));
  });

  it('offers no actions at all on your own row — Edit/Reset password/Deactivate are all wrong there', async () => {
    renderPage();
    await screen.findByText('Toncy Z');
    // Own row: no actions trigger at all (not just an empty menu — the button itself is absent).
    expect(screen.queryByRole('button', { name: 'Actions for Toncy Z' })).not.toBeInTheDocument();
    // A hint points self-service to Settings instead of leaving a dead end.
    expect(screen.getByText(/Settings → My Profile/i)).toBeInTheDocument();
  });

  it('does not offer Permissions on a Super Admin row — the role already grants everything', async () => {
    renderPage();
    await screen.findByText('Sam R');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Sam R' }));
    expect(screen.queryByRole('menuitem', { name: 'Permissions' })).not.toBeInTheDocument();
    // …but the other actions on that row are still there, so this isn't just an empty menu.
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });

  it("offers Edit, Permissions, Reset password, and Deactivate on another user's row", async () => {
    renderPage();
    await screen.findByText('Priya M');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Priya M' }));
    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Permissions' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Reset password' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Deactivate' })).toBeInTheDocument();
  });

  it('DOES offer Permissions on an Admin row — that is where import/export gets granted', async () => {
    renderPage();
    await screen.findByText('Priya M');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Priya M' }));
    expect(await screen.findByRole('menuitem', { name: 'Permissions' })).toBeInTheDocument();
  });

  it('surfaces the server error when deactivating the last superadmin fails with 409 LAST_SUPERADMIN', async () => {
    vi.mocked(usersApi.setUserActive).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { code: 'LAST_SUPERADMIN', message: 'Cannot deactivate the last active Super Admin.' } } },
    });
    renderPage();
    await screen.findByText('Priya M');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Priya M' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }));
    expect(await screen.findByText('Cannot deactivate the last active Super Admin.')).toBeInTheDocument();
  });

  // --- Password-reset takeover: the row-action mirror of the backend's assertCanResetPassword()
  // guard (user.service.ts). Resetting a password is a full account takeover, so the menu item
  // must be HIDDEN (not just non-functional) whenever the target holds a permission the current
  // actor lacks. The backend enforces this regardless -- this only decides what's offered. ---

  it('hides Reset password on a privileged agent row for an admin without customers.export', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: { id: 'u2', name: 'Priya M', email: 'p@a.test', role: 'admin' },
    });
    renderPage();
    await screen.findByText('Riley P');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Riley P' }));
    expect(screen.queryByRole('menuitem', { name: 'Reset password' })).not.toBeInTheDocument();
    // The row still has other actions, so this isn't just an empty menu being suppressed.
    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });

  it('still shows Reset password on an ORDINARY agent row for that same admin', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: { id: 'u2', name: 'Priya M', email: 'p@a.test', role: 'admin' },
    });
    renderPage();
    await screen.findByText('Alex K');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Alex K' }));
    expect(await screen.findByRole('menuitem', { name: 'Reset password' })).toBeInTheDocument();
  });

  it('a superadmin sees Reset password on a privileged agent row too', async () => {
    renderPage(); // default logged-in user in this fixture (u1) is a superadmin
    await screen.findByText('Riley P');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Riley P' }));
    expect(await screen.findByRole('menuitem', { name: 'Reset password' })).toBeInTheDocument();
  });
});
