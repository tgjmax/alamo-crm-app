import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { UserPermissionsDialog } from './user-permissions-dialog';
import { ManagedUser } from '@/api/users.api';
import * as usersApi from '@/api/users.api';
import { useAuthStore, AuthUser } from '@/stores/authStore';

vi.mock('@/api/users.api', async (importActual) => ({
  ...(await importActual<typeof usersApi>()),
  updateUser: vi.fn(),
}));

const BASE_PERMISSIONS = {
  bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: true, import: false, export: false, sendInvoice: false },
  customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: false },
  groups: { createShared: false },
  data: { viewReports: false },
  enquiries: { sendQuote: false },
};

function user(role: ManagedUser['role']): ManagedUser {
  return { id: 'u1', name: 'X', email: 'x@t.test', role, permissions: BASE_PERMISSIONS, active: true };
}

const SUPERADMIN_ACTOR: AuthUser = { id: 'actor-super', name: 'Super', email: 'super@t.test', role: 'superadmin' };

function renderDialog(u: ManagedUser) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UserPermissionsDialog user={u} onOpenChange={() => {}} />
    </QueryClientProvider>
  );
}

describe('UserPermissionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Every pre-existing test in this describe block is about which toggles are OFFERED for a
    // given TARGET role, not about actor-based disabling — default the actor to a superadmin
    // (holds every permission) so none of them accidentally hit the new disabled-checkbox
    // behavior. Tests that specifically exercise the grant-guard set their own actor below.
    useAuthStore.setState({ user: SUPERADMIN_ACTOR });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it('sends the COMPLETE permissions object for every module, not just the toggled module (wholesale-send guarantee)', async () => {
    vi.mocked(usersApi.updateUser).mockResolvedValue({} as usersApi.ManagedUser);
    renderDialog(user('agent'));

    await userEvent.click(screen.getByLabelText('Export customers'));
    await userEvent.click(screen.getByRole('button', { name: 'Save permissions' }));

    await waitFor(() =>
      expect(usersApi.updateUser).toHaveBeenCalledWith('u1', {
        permissions: {
          bookings: {
            create: false,
            edit: false,
            delete: false,
            createAdjustment: false,
            viewAll: true,
            import: false,
            export: false,
            sendInvoice: false,
          },
          customers: {
            create: false,
            edit: false,
            delete: false,
            viewPassport: false,
            import: false,
            export: true,
          },
          groups: { createShared: false },
          data: { viewReports: false },
          enquiries: { sendQuote: false },
        },
      })
    );
  });

  it('shows the FULL permission tree for an agent, including the two send-to-customer toggles', () => {
    renderDialog(user('agent'));
    expect(screen.getByLabelText('Create bookings')).toBeInTheDocument();
    expect(screen.getByLabelText('View passport details')).toBeInTheDocument();
    expect(screen.getByLabelText('Export customers')).toBeInTheDocument();
    expect(screen.getByLabelText('View sales reports')).toBeInTheDocument();
    expect(screen.getByLabelText('Send invoices to customers')).toBeInTheDocument();
    expect(screen.getByLabelText('Send quotes to customers')).toBeInTheDocument();
    // 15 pre-existing + the 2 new ones = 17.
    expect(screen.getAllByRole('checkbox')).toHaveLength(17);
  });

  it('shows ONLY the four import/export toggles for an admin — NOT the two new send toggles', () => {
    renderDialog(user('admin'));
    expect(screen.getByLabelText('Import bookings')).toBeInTheDocument();
    expect(screen.getByLabelText('Export bookings')).toBeInTheDocument();
    expect(screen.getByLabelText('Import customers')).toBeInTheDocument();
    expect(screen.getByLabelText('Export customers')).toBeInTheDocument();
    // Everything else is granted by the role itself and must not be offered.
    expect(screen.queryByLabelText('Create bookings')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('View sales reports')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Send invoices to customers')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Send quotes to customers')).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
  });

  it('offers nothing at all for a superadmin', () => {
    renderDialog(user('superadmin'));
    expect(screen.getByText(/unrestricted access/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Export customers')).not.toBeInTheDocument();
  });

  // Regression: the admin filter must key on the permission PATH (checkbox id, e.g.
  // "bookings.import"), not on display-label text. Asserting by id here — rather than by
  // label — is what makes this test fail under a label-keyed implementation if a toggle's
  // label copy is ever edited (see the module comment on ADMIN_RESTRICTED_PATHS).
  it("shows exactly the four ADMIN_RESTRICTED paths for an admin, identified by checkbox id, not label", () => {
    renderDialog(user('admin'));
    const checkboxes = screen.getAllByRole('checkbox');
    const ids = checkboxes.map((c) => c.id).sort();
    expect(ids).toEqual(['bookings.export', 'bookings.import', 'customers.export', 'customers.import']);
  });

  // --- Grant-guard: disable (never hide) a checkbox the ACTOR does not hold themselves ---

  it('a superadmin actor sees no disabled checkboxes (they hold everything)', () => {
    useAuthStore.setState({ user: SUPERADMIN_ACTOR });
    renderDialog(user('agent'));
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    for (const c of checkboxes) {
      expect(c).not.toBeDisabled();
    }
  });

  it('an admin actor WITHOUT customers.export sees that checkbox disabled, but other toggles enabled', () => {
    const adminNoExport: AuthUser = {
      id: 'actor-admin',
      name: 'Admin',
      email: 'admin@t.test',
      role: 'admin',
      permissions: {
        bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: true, import: false, export: false, sendInvoice: false },
        customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: false },
        groups: { createShared: false },
        data: { viewReports: false },
        enquiries: { sendQuote: false },
      },
    };
    useAuthStore.setState({ user: adminNoExport });
    renderDialog(user('agent'));

    expect(screen.getByLabelText('Export customers')).toBeDisabled();
    // Non-restricted toggles are granted to every admin for free, so they must stay enabled.
    expect(screen.getByLabelText('Create bookings')).not.toBeDisabled();
    expect(screen.getByLabelText('View sales reports')).not.toBeDisabled();
    expect(screen.getByText(/greyed-out permissions/i)).toBeInTheDocument();
  });

  it('an admin actor WITH customers.export granted sees it enabled', () => {
    const adminWithExport: AuthUser = {
      id: 'actor-admin2',
      name: 'Admin2',
      email: 'admin2@t.test',
      role: 'admin',
      permissions: {
        bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: true, import: false, export: false, sendInvoice: false },
        customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: true },
        groups: { createShared: false },
        data: { viewReports: false },
        enquiries: { sendQuote: false },
      },
    };
    useAuthStore.setState({ user: adminWithExport });
    renderDialog(user('agent'));

    expect(screen.getByLabelText('Export customers')).not.toBeDisabled();
  });
});
