import { canViewSalesReports } from './permissions';
import { AuthUser } from '../stores/authStore';

const AGENT_PERMISSIONS_BASE = {
  bookings: { create: false, edit: false, delete: false, createAdjustment: false, viewAll: false },
  customers: { create: false, edit: false, delete: false, viewPassport: false },
  groups: { createShared: false },
};

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
