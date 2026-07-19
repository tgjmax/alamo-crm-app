import { AuthUser, UserPermissions, UserRole } from '../stores/authStore';

/** Human-readable role names for display (navbar, Users table, role picker). */
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  agent: 'Agent',
};

/**
 * "Admin or better." EVERY former `role === 'admin'` check in this app was really
 * this test — a superadmin must never end up with LESS access than an admin.
 */
export function isAdminOrAbove(user: AuthUser | null): boolean {
  return user?.role === 'superadmin' || user?.role === 'admin';
}

export function canViewSalesReports(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.data.viewReports);
}

export function canEditBookings(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.bookings.edit);
}

export function canDeleteBookings(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.bookings.delete);
}

export function canCreateBookings(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.bookings.create);
}

export function canCreateAdjustments(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.bookings.createAdjustment);
}

export function canSendInvoices(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.bookings.sendInvoice);
}

export function canSendQuotes(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.enquiries.sendQuote);
}

export function canDeleteEnquiries(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.enquiries.delete);
}

export function canCreateCustomers(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.customers.create);
}

export function canEditCustomers(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.customers.edit);
}

export function canDeleteCustomers(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || Boolean(user?.permissions?.customers.delete);
}

export function canEditOrganization(user: AuthUser | null): boolean {
  return isAdminOrAbove(user);
}

export function canManageUsers(user: AuthUser | null): boolean {
  return isAdminOrAbove(user);
}

/** The four permissions a Super Admin grants per-admin — mirrors the backend's
 *  ADMIN_RESTRICTED set (permission.middleware.ts) exactly, keyed on the permission PATH. */
const ADMIN_RESTRICTED_PATHS = new Set(['bookings.import', 'bookings.export', 'customers.import', 'customers.export']);

/**
 * Import/Export is the ONE thing an admin does not get for free — a superadmin
 * grants it per-admin. Mirrors the backend's ADMIN_RESTRICTED set exactly.
 */
export function canImportExport(
  user: AuthUser | null,
  module: 'bookings' | 'customers',
  action: 'import' | 'export'
): boolean {
  if (user?.role === 'superadmin') return true;
  return Boolean(user?.permissions?.[module][action]);
}

/**
 * "Does the CURRENT logged-in user hold this permission themselves?" — mirrors the backend's
 * `hasPermission(userId, role, path)` (permission.middleware.ts) exactly, which is what the new
 * grant-guard (`assertCanGrantPermissions`, user.service.ts) actually enforces server-side.
 * Used to DISABLE (never hide) checkboxes in the permissions dialog: an admin can see a
 * capability exists but cannot grant one it doesn't hold itself.
 *
 * Deliberately NOT the same shape as the plain `isAdminOrAbove(user) || permissions?.[x][y]`
 * pattern above: an admin gets every module/action for free EXCEPT the four ADMIN_RESTRICTED
 * paths, which fall through to the stored flag — reusing `canImportExport()` for that half
 * rather than re-encoding the restricted-key rule a third time.
 */
export function holdsPermission(user: AuthUser | null, module: keyof UserPermissions, action: string): boolean {
  if (user?.role === 'superadmin') return true;
  if (ADMIN_RESTRICTED_PATHS.has(`${module}.${action}`)) {
    return canImportExport(user, module as 'bookings' | 'customers', action as 'import' | 'export');
  }
  if (isAdminOrAbove(user)) return true;
  const moduleValue = user?.permissions?.[module] as Record<string, boolean> | undefined;
  return Boolean(moduleValue?.[action]);
}

/**
 * "May `actor` reset `target`'s password?" — the UI-hiding mirror of the backend's
 * `assertCanResetPassword()` (user.service.ts), which closes the SECOND half of the same
 * puppet-account hole `holdsPermission()`/the permissions dialog closes the first half of:
 * resetting a password is a full account takeover of the TARGET, so it must not be a route to a
 * capability the ACTOR lacks. The backend enforces this regardless (a 403
 * `CANNOT_RESET_MORE_PRIVILEGED`) — this only decides whether to show the menu item at all.
 *
 * Walks every module/action key genuinely present on the TARGET's own permissions object and
 * asks, for each, "does the target hold this (via `holdsPermission`) but the actor doesn't?" —
 * never a hardcoded key list, so this does not drift as `UserPermissions` grows. A superadmin
 * actor always passes, matching the backend (`hasPermission` returns `true` for every path).
 */
export function canResetPasswordOf(
  actor: AuthUser | null,
  target: { role: UserRole; permissions?: UserPermissions }
): boolean {
  if (actor?.role === 'superadmin') return true;
  const targetPermissions = target.permissions;
  if (!targetPermissions) return true;
  const targetAsUser = { role: target.role, permissions: targetPermissions } as AuthUser;
  for (const moduleKey of Object.keys(targetPermissions) as (keyof UserPermissions)[]) {
    const moduleObj = targetPermissions[moduleKey] as unknown as Record<string, boolean>;
    for (const action of Object.keys(moduleObj)) {
      const targetHoldsIt = holdsPermission(targetAsUser, moduleKey, action);
      if (!targetHoldsIt) continue;
      if (!holdsPermission(actor, moduleKey, action)) return false;
    }
  }
  return true;
}
