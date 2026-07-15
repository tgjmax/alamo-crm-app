import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { ManagedUser, listUsers, USERS_QUERY_KEY } from '@/api/users.api';
import { useAuthStore } from '@/stores/authStore';
import { AddEditUserDialog } from '@/components/users/add-edit-user-dialog';
import { UserPermissionsDialog } from '@/components/users/user-permissions-dialog';
import { ResetPasswordDialog } from '@/components/users/reset-password-dialog';
import { SetActiveDialog } from '@/components/users/set-active-dialog';
import { buildUserColumns } from '@/components/users/user-columns';

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [permissionsFor, setPermissionsFor] = useState<ManagedUser | null>(null);
  const [resettingFor, setResettingFor] = useState<ManagedUser | null>(null);
  const [settingActiveFor, setSettingActiveFor] = useState<ManagedUser | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: users = [], isLoading } = useQuery({ queryKey: USERS_QUERY_KEY, queryFn: listUsers });

  const columns = useMemo(
    () =>
      buildUserColumns({
        currentUser,
        onEdit: setEditing,
        onPermissions: setPermissionsFor,
        onReset: setResettingFor,
        onSetActive: setSettingActiveFor,
      }),
    [currentUser]
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const roleFilter = new Set((table.getColumn('role')?.getFilterValue() as string[]) ?? []);
  const statusFilter = new Set((table.getColumn('status')?.getFilterValue() as string[]) ?? []);

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

      <div role="group" aria-label="Filters" className="flex items-center gap-2">
        <DataTableFacetedFilter
          title="Role"
          searchable={false}
          options={[
            { label: 'Super Admin', value: 'superadmin' },
            { label: 'Admin', value: 'admin' },
            { label: 'Agent', value: 'agent' },
          ]}
          selectedValues={roleFilter}
          onChange={(set) => table.getColumn('role')?.setFilterValue(set.size ? [...set] : undefined)}
        />
        <DataTableFacetedFilter
          title="Status"
          searchable={false}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          selectedValues={statusFilter}
          onChange={(set) => table.getColumn('status')?.setFilterValue(set.size ? [...set] : undefined)}
        />
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
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
      <SetActiveDialog user={settingActiveFor} onOpenChange={(open) => !open && setSettingActiveFor(null)} />
    </div>
  );
}
