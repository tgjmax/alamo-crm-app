import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listGroups, deleteGroup, GroupSummary } from '../api/groups.api';

export default function GroupsPage() {
  const [pendingDelete, setPendingDelete] = useState<GroupSummary | null>(null);
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: listGroups });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setPendingDelete(null);
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to="/groups/new">New group</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h2 className="contents">Groups</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Sharing</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{g.name}</TableCell>
                  <TableCell className="text-muted-foreground">{g.owner.name}</TableCell>
                  <TableCell>
                    <Badge variant={g.sharedWith.mode === 'shared' ? 'default' : 'secondary'}>
                      {g.sharedWith.mode === 'shared' ? 'Shared' : 'Private'}
                    </Badge>
                  </TableCell>
                  <TableCell>{g.conditionCount}</TableCell>
                  <TableCell className="text-muted-foreground">{g.updatedAt.slice(0, 10)}</TableCell>
                  <TableCell className="space-x-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/groups/$groupId" params={{ groupId: g.id }}>
                        Open
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${g.name}`}
                      onClick={() => setPendingDelete(g)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete “{pendingDelete?.name}”? This only removes the saved filter, not any bookings or customers.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Confirm delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
