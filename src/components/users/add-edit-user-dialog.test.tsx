import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { AddEditUserDialog } from './add-edit-user-dialog';
import * as usersApi from '@/api/users.api';
import { toast } from 'sonner';

vi.mock('@/api/users.api', async (importActual) => ({
  ...(await importActual<typeof usersApi>()),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderDialog(actorRole: 'superadmin' | 'admin') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AddEditUserDialog open user={null} actorRole={actorRole} onOpenChange={() => {}} />
    </QueryClientProvider>
  );
}

const EXISTING_USER: usersApi.ManagedUser = {
  id: 'u1',
  name: 'Priya M',
  email: 'priya@alamo.test',
  role: 'agent',
  permissions: {
    bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: true, import: false, export: false, sendInvoice: false },
    customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: false },
    groups: { createShared: false },
    data: { viewReports: false },
    enquiries: { sendQuote: false, delete: false },
  },
  active: true,
};

function renderEditDialog(actorRole: 'superadmin' | 'admin' = 'superadmin') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AddEditUserDialog open user={EXISTING_USER} actorRole={actorRole} onOpenChange={() => {}} />
    </QueryClientProvider>
  );
}

describe('AddEditUserDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an agent', async () => {
    vi.mocked(usersApi.createUser).mockResolvedValue({} as usersApi.ManagedUser);
    renderDialog('superadmin');
    await userEvent.type(screen.getByLabelText('Name'), 'Priya M');
    await userEvent.type(screen.getByLabelText('Email'), 'priya@alamo.test');
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() =>
      expect(usersApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Priya M', email: 'priya@alamo.test', role: 'agent' })
      )
    );
    expect(usersApi.createUser).not.toHaveBeenCalledWith(
      expect.objectContaining({ password: expect.anything() })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('priya@alamo.test'))
    );
  });

  it('has no password field (temp password is system-generated and emailed)', () => {
    renderDialog('superadmin');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('offers an admin only the Agent role — it cannot create another admin', async () => {
    renderDialog('admin');
    await userEvent.click(screen.getByRole('combobox', { name: 'Role' }));
    expect(await screen.findByRole('option', { name: 'Agent' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Super Admin' })).not.toBeInTheDocument();
  });

  it('lets a superadmin pick any role', async () => {
    renderDialog('superadmin');
    await userEvent.click(screen.getByRole('combobox', { name: 'Role' }));
    expect(await screen.findByRole('option', { name: 'Super Admin' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Agent' })).toBeInTheDocument();
  });

  describe('edit mode', () => {
    it('prefills the fields with the existing user and titles the dialog "Edit {name}"', () => {
      renderEditDialog();
      expect(screen.getByText('Edit Priya M')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toHaveValue('Priya M');
      expect(screen.getByLabelText('Email')).toHaveValue('priya@alamo.test');
      expect(screen.getByRole('combobox', { name: 'Role' })).toHaveTextContent('Agent');
    });

    it('does not render a Password field in edit mode', () => {
      renderEditDialog();
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    });

    it('saves via updateUser with no password key in the payload', async () => {
      vi.mocked(usersApi.updateUser).mockResolvedValue({} as usersApi.ManagedUser);
      renderEditDialog();

      await userEvent.clear(screen.getByLabelText('Name'));
      await userEvent.type(screen.getByLabelText('Name'), 'Priya Menon');
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      await waitFor(() => expect(usersApi.updateUser).toHaveBeenCalledTimes(1));
      const [id, payload] = vi.mocked(usersApi.updateUser).mock.calls[0];
      expect(id).toBe('u1');
      expect(payload).toEqual({ name: 'Priya Menon', email: 'priya@alamo.test', role: 'agent' });
      expect(payload).not.toHaveProperty('password');
    });
  });
});
