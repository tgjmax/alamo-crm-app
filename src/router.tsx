import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import BookingsPage from './pages/BookingsPage';
import GroupsPage from './pages/GroupsPage';
import GroupEditorPage from './pages/GroupEditorPage';
import WidgetEditorPage from './pages/WidgetEditorPage';
import AppShell from './components/AppShell';
import { useAuthStore } from './stores/authStore';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: useAuthStore.getState().user ? '/dashboard' : '/login' });
  },
});

export const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authed',
  beforeLoad: () => {
    if (!useAuthStore.getState().user) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/dashboard',
  component: DashboardPage,
});

const widgetNewRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/dashboard/widgets/new',
  component: WidgetEditorPage,
});

const widgetEditRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/dashboard/widgets/$widgetId',
  component: WidgetEditorPage,
});

const customersRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/customers',
  component: CustomersPage,
});

const bookingsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/bookings',
  component: BookingsPage,
});

const groupsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/groups',
  component: GroupsPage,
});

const groupNewRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/groups/new',
  component: GroupEditorPage,
});

const groupEditRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/groups/$groupId',
  component: GroupEditorPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  authedRoute.addChildren([dashboardRoute, widgetNewRoute, widgetEditRoute, customersRoute, bookingsRoute, groupsRoute, groupNewRoute, groupEditRoute]),
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
