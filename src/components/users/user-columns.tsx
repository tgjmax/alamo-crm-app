import { ColumnDef, FilterFn } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { ManagedUser } from '@/api/users.api';
import { AuthUser, UserRole } from '@/stores/authStore';
import { canResetPasswordOf, ROLE_LABELS } from '@/utils/permissions';

const ROLE_BADGE: Record<UserRole, string> = {
  superadmin: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  admin: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  agent: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
};

// Sort Role by privilege (Super Admin → Admin → Agent) rather than alphabetically on the
// raw enum, which would misorder it (admin < agent < superadmin).
const ROLE_ORDER: Record<UserRole, number> = { superadmin: 0, admin: 1, agent: 2 };

// Faceted (multi-select) filter: the column's filter value is a string[] of the
// selected facet values; a row matches if its value is one of them.
const includesSome: FilterFn<ManagedUser> = (row, columnId, filterValue: string[]) =>
  filterValue.includes(row.getValue(columnId));

export interface BuildUserColumnsOptions {
  currentUser: AuthUser | null;
  onEdit: (user: ManagedUser) => void;
  onPermissions: (user: ManagedUser) => void;
  onReset: (user: ManagedUser) => void;
  onSetActive: (user: ManagedUser) => void;
}

export function buildUserColumns({
  currentUser,
  onEdit,
  onPermissions,
  onReset,
  onSetActive,
}: BuildUserColumnsOptions): ColumnDef<ManagedUser>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => (
        <Badge className={ROLE_BADGE[row.original.role]}>{ROLE_LABELS[row.original.role]}</Badge>
      ),
      filterFn: includesSome,
      sortingFn: (a, b) => ROLE_ORDER[a.original.role] - ROLE_ORDER[b.original.role],
    },
    {
      id: 'status',
      accessorFn: (row) => (row.active ? 'active' : 'inactive'),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <span className={row.original.active ? 'text-green-700' : 'text-muted-foreground'}>
          {row.original.active ? 'Active' : 'Inactive'}
        </span>
      ),
      filterFn: includesSome,
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => {
        const user = row.original;
        // Self-service (name, email, password, photo) lives at Settings → My Profile.
        // Role edit / deactivate are backend-refused on yourself (CANNOT_MODIFY_SELF_*),
        // so the own row has no valid action — the trigger is omitted, not left empty
        // (mirrors customer-row-actions.tsx).
        if (user.id === currentUser?.id) return null;
        const canReset = canResetPasswordOf(currentUser, user);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(user)}>Edit</DropdownMenuItem>
              {/* Super Admin already has everything — nothing to configure. */}
              {user.role !== 'superadmin' && (
                <DropdownMenuItem onClick={() => onPermissions(user)}>Permissions</DropdownMenuItem>
              )}
              {/* Hidden (not disabled) when the target out-ranks the actor — the backend
                  refuses with 403 CANNOT_RESET_MORE_PRIVILEGED regardless. */}
              {canReset && (
                <DropdownMenuItem onClick={() => onReset(user)}>Reset password</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onSetActive(user)}>
                {user.active ? 'Deactivate' : 'Reactivate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
