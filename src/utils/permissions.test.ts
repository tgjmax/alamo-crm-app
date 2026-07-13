import { describe, expect, it } from 'vitest';
import { canViewSalesReports, canEditBookings, canDeleteBookings } from './permissions';
import { AuthUser } from '../stores/authStore';

const AGENT_PERMISSIONS_BASE = {
  bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: false },
  customers: { create: false, edit: false, delete: false, viewPassport: false },
  groups: { createShared: false },
};

function agent(overrides: Partial<AuthUser['permissions']> = {}): AuthUser {
  return {
    id: 'u1',
    name: 'Agent',
    email: 'agent@alamo.test',
    role: 'agent',
    permissions: {
      bookings: { create: true, edit: false, delete: false, createAdjustment: true, viewAll: true },
      customers: { create: true, edit: false, delete: false, viewPassport: false },
      groups: { createShared: false },
      data: { import: false, export: false, viewReports: false },
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
      permissions: { ...AGENT_PERMISSIONS_BASE, data: { import: false, export: false, viewReports: true } },
    };
    expect(canViewSalesReports(agent)).toBe(true);
  });

  it('is false for an agent without data.viewReports, and for a null user', () => {
    const agent: AuthUser = {
      id: '3', name: 'C', email: 'c@t.test', role: 'agent',
      permissions: { ...AGENT_PERMISSIONS_BASE, data: { import: false, export: false, viewReports: false } },
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
        data: { import: false, export: false, viewReports: false },
      },
    };
    expect(canEditBookings(agent)).toBe(true);
  });

  it('is false for an agent without bookings.edit, and for a null user', () => {
    const agent: AuthUser = {
      id: '3', name: 'C', email: 'c@t.test', role: 'agent',
      permissions: { ...AGENT_PERMISSIONS_BASE, data: { import: false, export: false, viewReports: false } },
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
        agent({ bookings: { create: true, edit: true, delete: true, createAdjustment: true, viewAll: true } })
      )
    ).toBe(true);
  });

  it('is false for a null user', () => {
    expect(canDeleteBookings(null)).toBe(false);
  });
});
