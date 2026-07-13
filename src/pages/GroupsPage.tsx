import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteGroupDialog } from '@/components/groups/delete-group-dialog';
import { listGroups, deleteGroup, GroupSummary } from '../api/groups.api';

export default function GroupsPage() {
  const [pendingDelete, setPendingDelete] = useState<GroupSummary | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
                <TableRow
                  key={g.id}
                  className="cursor-pointer"
                  onClick={() => navigate({ to: '/groups/$groupId', params: { groupId: g.id } })}
                >
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${g.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(g);
                      }}
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

      <DeleteGroupDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        groupName={pendingDelete?.name}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
