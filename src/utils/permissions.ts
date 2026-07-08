import { AuthUser } from '../stores/authStore';

export function canViewSalesReports(user: AuthUser | null): boolean {
  return user?.role === 'admin' || Boolean(user?.permissions?.data.viewReports);
}
