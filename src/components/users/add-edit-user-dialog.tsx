import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Mail, User } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconInput } from '@/components/icon-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManagedUser, createUser, updateUser, USERS_QUERY_KEY } from '@/api/users.api';
import { UserRole } from '@/stores/authStore';
import { errorMessage } from '@/utils/apiError';
import { ROLE_LABELS } from '@/utils/permissions';

/** An Admin may only ever create or edit an Agent — mirrors the backend's manageableRoles(). */
function assignableRoles(actorRole: UserRole): UserRole[] {
  return actorRole === 'superadmin' ? ['superadmin', 'admin', 'agent'] : ['agent'];
}

export function AddEditUserDialog({
  open,
  user,
  actorRole,
  onOpenChange,
}: {
  open: boolean;
  user: ManagedUser | null;
  actorRole: UserRole;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* key-based remount re-seeds state per record; no reset effect. */}
        {open && <Body key={user?.id ?? 'new'} user={user} actorRole={actorRole} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  user,
  actorRole,
  onOpenChange,
}: {
  user: ManagedUser | null;
  actorRole: UserRole;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(() => user?.name ?? '');
  const [email, setEmail] = useState(() => user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(() => user?.role ?? 'agent');
  const queryClient = useQueryClient();
  const roles = assignableRoles(actorRole);

  const mutation = useMutation({
    mutationFn: () =>
      user
        ? updateUser(user.id, { name, email, role })
        : createUser({ name, email, password, role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      onOpenChange(false);
    },
  });

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{user ? `Edit ${user.name}` : 'Add user'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="user-name">Name</Label>
        <IconInput
          id="user-name"
          icon={<User />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya Menon"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-email">Email</Label>
        <IconInput
          id="user-email"
          icon={<Mail />}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>

      {!user && (
        <div className="space-y-2">
          <Label htmlFor="user-password">Password</Label>
          <IconInput
            id="user-password"
            icon={<KeyRound />}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="user-role">Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
          <SelectTrigger id="user-role" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive">{errorMessage(mutation.error, 'Could not save the user.')}</p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : user ? 'Save changes' : 'Create user'}
        </Button>
      </DialogFooter>
    </form>
  );
}
