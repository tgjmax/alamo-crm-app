import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ManagedUser, listUsers, setUserActive, USERS_QUERY_KEY } from '@/api/users.api';
import { UserRole, useAuthStore } from '@/stores/authStore';
import { AddEditUserDialog } from '@/components/users/add-edit-user-dialog';
import { UserPermissionsDialog } from '@/components/users/user-permissions-dialog';
import { ResetPasswordDialog } from '@/components/users/reset-password-dialog';
import { errorMessage } from '@/utils/apiError';
import { canResetPasswordOf } from '@/utils/permissions';

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  agent: 'Agent',
};

const ROLE_BADGE: Record<UserRole, string> = {
  superadmin: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  admin: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  agent: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
};

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [permissionsFor, setPermissionsFor] = useState<ManagedUser | null>(null);
  const [resettingFor, setResettingFor] = useState<ManagedUser | null>(null);
  const [activeError, setActiveError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({ queryKey: USERS_QUERY_KEY, queryFn: listUsers });

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active),
    onSuccess: () => {
      setActiveError(null);
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
    onError: (err) => {
      setActiveError(errorMessage(err, 'Could not update this user. Check your connection and try again.'));
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">
            To change your own name, email or password, go to Settings → My Profile.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Add User</Button>
      </div>

      {activeError && <p className="text-sm text-destructive">{activeError}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const isSelf = user.id === currentUser?.id;
              const canReset = canResetPasswordOf(currentUser, user);
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_BADGE[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={user.active ? 'text-green-700' : 'text-muted-foreground'}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {/* Self-service (name, email, password, photo) lives at Settings → My
                        Profile, which enforces currentPassword — unlike this dialog's Reset
                        password. Edit's Role select is also refused on yourself by the backend
                        (403 CANNOT_MODIFY_SELF_ROLE). Deactivate is likewise never offered on
                        your own row (403 CANNOT_MODIFY_SELF_ACTIVE). That leaves no actions at
                        all on your own row, so — mirroring customer-row-actions.tsx — the
                        trigger itself is not rendered rather than opening an empty menu. */}
                    {!isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(user)}>Edit</DropdownMenuItem>
                          {/* A Super Admin has unrestricted access by virtue of the role — there is
                              nothing to configure, so the entry is not offered at all. */}
                          {user.role !== 'superadmin' && (
                            <DropdownMenuItem onClick={() => setPermissionsFor(user)}>Permissions</DropdownMenuItem>
                          )}
                          {/* Hidden (not just disabled) when the target holds a permission the
                              current actor lacks -- resetting a password is a full account
                              takeover, so offering it here would just be a UI dead end: the
                              backend refuses with 403 CANNOT_RESET_MORE_PRIVILEGED regardless.
                              See canResetPasswordOf() (utils/permissions.ts). */}
                          {canReset && (
                            <DropdownMenuItem onClick={() => setResettingFor(user)}>Reset password</DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => activeMutation.mutate({ id: user.id, active: !user.active })}
                          >
                            {user.active ? 'Deactivate' : 'Reactivate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <AddEditUserDialog
        open={creating || editing !== null}
        user={editing}
        actorRole={currentUser?.role ?? 'agent'}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
      <UserPermissionsDialog user={permissionsFor} onOpenChange={(open) => !open && setPermissionsFor(null)} />
      <ResetPasswordDialog user={resettingFor} onOpenChange={(open) => !open && setResettingFor(null)} />
    </div>
  );
}
