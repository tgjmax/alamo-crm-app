import { describe, expect, it } from 'vitest';
import {
  canViewSalesReports, canEditBookings, canDeleteBookings, canEditOrganization,
  isAdminOrAbove, canManageUsers, canImportExport,
  canCreateBookings, canCreateAdjustments, canCreateCustomers, canEditCustomers, canDeleteCustomers,
  canSendInvoices, canSendQuotes, canResetPasswordOf,
} from './permissions';
import { AuthUser } from '../stores/authStore';

const AGENT_PERMISSIONS_BASE = {
  bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: false, import: false, export: false, sendInvoice: false },
  customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: false },
  groups: { createShared: false },
  enquiries: { sendQuote: false, delete: false },
};

function agent(overrides: Partial<AuthUser['permissions']> = {}): AuthUser {
  return {
    id: 'u1',
    name: 'Agent',
    email: 'agent@alamo.test',
    role: 'agent',
    permissions: {
      bookings: { create: true, edit: false, delete: false, createAdjustment: true, viewAll: true, import: false, export: false, sendInvoice: false },
      customers: { create: true, edit: false, delete: false, viewPassport: false, import: false, export: false },
      groups: { createShared: false },
      data: { viewReports: false },
      enquiries: { sendQuote: false, delete: false },
      ...overrides,
    },
  } as AuthUser;
}

describe('canViewSalesReports', () => {
  it('is true for an admin regardless of permissions', () => {
    const admin: AuthUser = { id: '1', name: 'A', email: 'a@t.test', role: 'admin' };
    expect(canViewSalesReports(admin)).toBe(true);
  });

  it('is true for an agent with data.viewReports enabled', () => {
    const agent: AuthUser = {
      id: '2', name: 'B', email: 'b@t.test', role: 'agent',
      permissions: { ...AGENT_PERMISSIONS_BASE, data: { viewReports: true } },
    };
    expect(canViewSalesReports(agent)).toBe(true);
  });

  it('is false for an agent without data.viewReports, and for a null user', () => {
    const agent: AuthUser = {
      id: '3', name: 'C', email: 'c@t.test', role: 'agent',
      permissions: { ...AGENT_PERMISSIONS_BASE, data: { viewReports: false } },
    };
    expect(canViewSalesReports(agent)).toBe(false);
    expect(canViewSalesReports(null)).toBe(false);
  });
});

describe('canEditBookings', () => {
  it('is true for an admin regardless of permissions', () => {
    const admin: AuthUser = { id: '1', name: 'A', email: 'a@t.test', role: 'admin' };
    expect(canEditBookings(admin)).toBe(true);
  });

  it('is true for an agent with bookings.edit enabled', () => {
    const agent: AuthUser = {
      id: '2', name: 'B', email: 'b@t.test', role: 'agent',
      permissions: {
        ...AGENT_PERMISSIONS_BASE,
        bookings: { ...AGENT_PERMISSIONS_BASE.bookings, edit: true },
        data: { viewReports: false },
      },
    };
    expect(canEditBookings(agent)).toBe(true);
  });

  it('is false for an agent without bookings.edit, and for a null user', () => {
    const agent: AuthUser = {
      id: '3', name: 'C', email: 'c@t.test', role: 'agent',
      permissions: { ...AGENT_PERMISSIONS_BASE, data: { viewReports: false } },
    };
    expect(canEditBookings(agent)).toBe(false);
    expect(canEditBookings(null)).toBe(false);
  });
});

describe('canDeleteBookings', () => {
  it('is true for an admin regardless of permissions', () => {
    expect(canDeleteBookings({ id: 'a1', name: 'A', email: 'a@a', role: 'admin' } as AuthUser)).toBe(true);
  });

  it('is false for an agent without bookings.delete', () => {
    expect(canDeleteBookings(agent())).toBe(false);
  });

  it('is true for an agent with bookings.delete', () => {
    expect(
      canDeleteBookings(
        agent({ bookings: { create: true, edit: true, delete: true, createAdjustment: true, viewAll: true, import: false, export: false, sendInvoice: false } })
      )
    ).toBe(true);
  });

  it('is false for a null user', () => {
    expect(canDeleteBookings(null)).toBe(false);
  });
});

describe('canCreateBookings', () => {
  it('is true for a superadmin and an admin regardless of permissions', () => {
    expect(canCreateBookings({ id: '0', name: 'S', email: 's@t.test', role: 'superadmin' } as AuthUser)).toBe(true);
    expect(canCreateBookings({ id: '1', name: 'A', email: 'a@t.test', role: 'admin' } as AuthUser)).toBe(true);
  });

  it('is false for an agent without bookings.create', () => {
    expect(
      canCreateBookings(
        agent({ bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: false, import: false, export: false, sendInvoice: false } })
      )
    ).toBe(false);
  });

  it('is true for an agent with bookings.create', () => {
    expect(canCreateBookings(agent())).toBe(true);
  });

  it('is false for a null user', () => {
    expect(canCreateBookings(null)).toBe(false);
  });
});

describe('canCreateAdjustments', () => {
  it('is true for a superadmin and an admin regardless of permissions', () => {
    expect(canCreateAdjustments({ id: '0', name: 'S', email: 's@t.test', role: 'superadmin' } as AuthUser)).toBe(true);
    expect(canCreateAdjustments({ id: '1', name: 'A', email: 'a@t.test', role: 'admin' } as AuthUser)).toBe(true);
  });

  it('is false for an agent without bookings.createAdjustment', () => {
    expect(
      canCreateAdjustments(
        agent({ bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: false, import: false, export: false, sendInvoice: false } })
      )
    ).toBe(false);
  });

  it('is true for an agent with bookings.createAdjustment', () => {
    expect(canCreateAdjustments(agent())).toBe(true);
  });

  it('is false for a null user', () => {
    expect(canCreateAdjustments(null)).toBe(false);
  });
});

describe('canCreateCustomers', () => {
  it('is true for a superadmin and an admin regardless of permissions', () => {
    expect(canCreateCustomers({ id: '0', name: 'S', email: 's@t.test', role: 'superadmin' } as AuthUser)).toBe(true);
    expect(canCreateCustomers({ id: '1', name: 'A', email: 'a@t.test', role: 'admin' } as AuthUser)).toBe(true);
  });

  it('is false for an agent without customers.create', () => {
    expect(
      canCreateCustomers(
        agent({ customers: { create: false, edit: false, delete: false, viewPassport: false, import: false, export: false } })
      )
    ).toBe(false);
  });

  it('is true for an agent with customers.create', () => {
    expect(canCreateCustomers(agent())).toBe(true);
  });

  it('is false for a null user', () => {
    expect(canCreateCustomers(null)).toBe(false);
  });
});

describe('canEditCustomers', () => {
  it('is true for a superadmin and an admin regardless of permissions', () => {
    expect(canEditCustomers({ id: '0', name: 'S', email: 's@t.test', role: 'superadmin' } as AuthUser)).toBe(true);
    expect(canEditCustomers({ id: '1', name: 'A', email: 'a@t.test', role: 'admin' } as AuthUser)).toBe(true);
  });

  it('is false for an agent without customers.edit', () => {
    expect(canEditCustomers(agent())).toBe(false);
  });

  it('is true for an agent with customers.edit', () => {
    expect(
      canEditCustomers(
        agent({ customers: { create: true, edit: true, delete: false, viewPassport: false, import: false, export: false } })
      )
    ).toBe(true);
  });

  it('is false for a null user', () => {
    expect(canEditCustomers(null)).toBe(false);
  });
});

describe('canDeleteCustomers', () => {
  it('is true for a superadmin and an admin regardless of permissions', () => {
    expect(canDeleteCustomers({ id: '0', name: 'S', email: 's@t.test', role: 'superadmin' } as AuthUser)).toBe(true);
    expect(canDeleteCustomers({ id: '1', name: 'A', email: 'a@t.test', role: 'admin' } as AuthUser)).toBe(true);
  });

  it('is false for an agent without customers.delete', () => {
    expect(canDeleteCustomers(agent())).toBe(false);
  });

  it('is true for an agent with customers.delete', () => {
    expect(
      canDeleteCustomers(
        agent({ customers: { create: true, edit: false, delete: true, viewPassport: false, import: false, export: false } })
      )
    ).toBe(true);
  });

  it('is false for a null user', () => {
    expect(canDeleteCustomers(null)).toBe(false);
  });
});

const SUPER: AuthUser = { id: '0', name: 'S', email: 's@t.test', role: 'superadmin' };
const ADMIN: AuthUser = { id: '1', name: 'A', email: 'a@t.test', role: 'admin' };
const AGENT: AuthUser = { id: '2', name: 'G', email: 'g@t.test', role: 'agent' };

describe('isAdminOrAbove', () => {
  it('is true for a superadmin and an admin, false for an agent and null', () => {
    expect(isAdminOrAbove(SUPER)).toBe(true);
    expect(isAdminOrAbove(ADMIN)).toBe(true);
    expect(isAdminOrAbove(AGENT)).toBe(false);
    expect(isAdminOrAbove(null)).toBe(false);
  });
});

describe('canManageUsers', () => {
  it('is true for a superadmin and an admin only', () => {
    expect(canManageUsers(SUPER)).toBe(true);
    expect(canManageUsers(ADMIN)).toBe(true);
    expect(canManageUsers(AGENT)).toBe(false);
    expect(canManageUsers(null)).toBe(false);
  });
});

describe('canImportExport', () => {
  it('always allows a superadmin', () => {
    expect(canImportExport(SUPER, 'customers', 'export')).toBe(true);
    expect(canImportExport(SUPER, 'bookings', 'import')).toBe(true);
  });

  it('DENIES an admin by default — this is the whole point of the feature', () => {
    expect(canImportExport(ADMIN, 'customers', 'export')).toBe(false);
    expect(canImportExport(ADMIN, 'bookings', 'import')).toBe(false);
  });

  it('allows an admin once the permission has been granted', () => {
    const granted: AuthUser = {
      ...ADMIN,
      permissions: {
        bookings: { create: true, edit: true, delete: true, createAdjustment: true, viewAll: true, import: false, export: false, sendInvoice: false },
        customers: { create: true, edit: true, delete: true, viewPassport: true, import: false, export: true },
        groups: { createShared: true },
        data: { viewReports: true },
        enquiries: { sendQuote: false, delete: false },
      },
    };
    expect(canImportExport(granted, 'customers', 'export')).toBe(true);
    expect(canImportExport(granted, 'bookings', 'export')).toBe(false);
  });

  it('reads the flag for an agent', () => {
    expect(canImportExport(AGENT, 'customers', 'export')).toBe(false);
  });
});

describe('the existing admin-or-better gates accept a superadmin', () => {
  it('does not silently give a superadmin LESS access than an admin', () => {
    expect(canViewSalesReports(SUPER)).toBe(true);
    expect(canEditBookings(SUPER)).toBe(true);
    expect(canEditOrganization(SUPER)).toBe(true);
    expect(canDeleteBookings(SUPER)).toBe(true);
  });
});

describe('canSendInvoices', () => {
  it('is true for a superadmin and an admin regardless of permissions', () => {
    expect(canSendInvoices(SUPER)).toBe(true);
    expect(canSendInvoices(ADMIN)).toBe(true);
  });

  it('is false for an agent without bookings.sendInvoice', () => {
    expect(canSendInvoices(agent())).toBe(false);
  });

  it('is true for an agent with bookings.sendInvoice', () => {
    expect(
      canSendInvoices(
        agent({ bookings: { create: true, edit: false, delete: false, createAdjustment: true, viewAll: true, import: false, export: false, sendInvoice: true } })
      )
    ).toBe(true);
  });

  it('is false for a null user', () => {
    expect(canSendInvoices(null)).toBe(false);
  });
});

describe('canResetPasswordOf', () => {
  // Mirrors the backend's assertCanResetPassword() (user.service.ts): an actor may not reset
  // the password of a target who holds a permission the actor itself lacks.
  const ORDINARY_AGENT_PERMS = { ...AGENT_PERMISSIONS_BASE, data: { viewReports: false } };
  const PRIVILEGED_AGENT_PERMS = {
    ...AGENT_PERMISSIONS_BASE,
    customers: { ...AGENT_PERMISSIONS_BASE.customers, export: true },
    data: { viewReports: false },
  };

  it('REFUSES an admin without customers.export resetting a target that HAS it', () => {
    expect(canResetPasswordOf(ADMIN, { role: 'agent', permissions: PRIVILEGED_AGENT_PERMS })).toBe(false);
  });

  it('ALLOWS that same admin to reset an ORDINARY target holding nothing it lacks', () => {
    expect(canResetPasswordOf(ADMIN, { role: 'agent', permissions: ORDINARY_AGENT_PERMS })).toBe(true);
  });

  it('ALLOWS an admin WITH customers.export granted to reset the privileged target', () => {
    const grantedAdmin = {
      ...ADMIN,
      permissions: {
        bookings: { create: true, edit: true, delete: true, createAdjustment: true, viewAll: true, import: false, export: false, sendInvoice: false },
        customers: { create: true, edit: true, delete: true, viewPassport: true, import: false, export: true },
        groups: { createShared: true },
        data: { viewReports: true },
        enquiries: { sendQuote: false, delete: false },
      },
    };
    expect(canResetPasswordOf(grantedAdmin, { role: 'agent', permissions: PRIVILEGED_AGENT_PERMS })).toBe(true);
  });

  it('ALLOWS a superadmin to reset anyone regardless of permissions held', () => {
    expect(canResetPasswordOf(SUPER, { role: 'agent', permissions: PRIVILEGED_AGENT_PERMS })).toBe(true);
    expect(canResetPasswordOf(SUPER, { role: 'admin', permissions: PRIVILEGED_AGENT_PERMS })).toBe(true);
  });

  it('is false for a null actor when the target holds anything an unauthenticated actor cannot', () => {
    expect(canResetPasswordOf(null, { role: 'agent', permissions: PRIVILEGED_AGENT_PERMS })).toBe(false);
  });
});

describe('canSendQuotes', () => {
  it('is true for a superadmin and an admin regardless of permissions', () => {
    expect(canSendQuotes(SUPER)).toBe(true);
    expect(canSendQuotes(ADMIN)).toBe(true);
  });

  it('is false for an agent without enquiries.sendQuote', () => {
    expect(canSendQuotes(agent())).toBe(false);
  });

  it('is true for an agent with enquiries.sendQuote', () => {
    expect(canSendQuotes(agent({ enquiries: { sendQuote: true, delete: true } }))).toBe(true);
  });

  it('is false for a null user', () => {
    expect(canSendQuotes(null)).toBe(false);
  });
});
