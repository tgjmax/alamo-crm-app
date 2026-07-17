import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ManagedUser, setUserActive, USERS_QUERY_KEY } from '@/api/users.api';
import { errorMessage } from '@/utils/apiError';

export function SetActiveDialog({
  user,
  onOpenChange,
}: {
  user: ManagedUser | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!user) return null;
  return <SetActiveBody key={user.id} user={user} onOpenChange={onOpenChange} />;
}

// Separate component + key-based remount so nothing carries over between rows.
// Mirrors reset-password-dialog.tsx; see CLAUDE.md's booking-edit notes.
function SetActiveBody({
  user,
  onOpenChange,
}: {
  user: ManagedUser;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const deactivating = user.active; // toggling AWAY from the current state
  const mutation = useMutation({
    mutationFn: () => setUserActive(user.id, !user.active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {deactivating ? `Deactivate ${user.name}?` : `Reactivate ${user.name}?`}
          </DialogTitle>
          <DialogDescription>
            {deactivating
              ? 'This revokes their access. They are signed out on their next request and cannot sign in again until reactivated.'
              : "This restores their access. They'll be able to sign in again."}
          </DialogDescription>
        </DialogHeader>
        {mutation.isError && (
          <p className="text-sm text-destructive">
            {errorMessage(mutation.error, 'Could not update this user.')}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={deactivating ? 'destructive' : 'default'}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Spinner />}
            {mutation.isPending
              ? deactivating
                ? 'Deactivating…'
                : 'Reactivating…'
              : deactivating
                ? 'Deactivate'
                : 'Reactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
