import { Link, Outlet, useRouter } from '@tanstack/react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LayoutDashboard, Users, BookOpen, TrendingUp, Filter } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { canViewSalesReports } from '../utils/permissions';
import { logoutRequest } from '../api/auth.api';

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const router = useRouter();
  const showSales = canViewSalesReports(user);

  async function handleSignOut() {
    // Clears the httpOnly refresh cookie server-side — without this, the boot-time
    // session restore would silently log the user back in on their next reload.
    // A failed logout call (e.g. network issue) shouldn't block leaving the app.
    try {
      await logoutRequest();
    } catch {
      // Ignore — local session is cleared and the user is navigated away regardless.
    } finally {
      clearSession();
      await router.navigate({ to: '/login' });
    }
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <span className="px-2 text-sm font-semibold">Alamo Travels</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/customers">
                  <Users />
                  <span>Customers</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/bookings">
                  <BookOpen />
                  <span>Bookings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {showSales && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/sales">
                    <TrendingUp />
                    <span>Sales</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/groups">
                  <Filter />
                  <span>Groups</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <div className="flex min-h-svh flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="text-sm text-muted-foreground">
                <span className="text-foreground">{user.name}</span> ({user.role})
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
