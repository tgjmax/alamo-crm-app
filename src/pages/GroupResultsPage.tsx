import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useRouter } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GroupResultsTable from '@/components/GroupResultsTable';
import { deleteGroup, getGroup, getGroupFields, getGroupResults, GroupCondition, GroupFieldMeta } from '@/api/groups.api';
import { OPERATOR_LABELS } from '@/utils/conditionLabels';
import { DeleteGroupDialog } from '@/components/groups/delete-group-dialog';

/** 'Airline equals QR' — renders a stored condition using its registry label and the shared
 * operator label map, so the header reads in plain English, in the same language as the
 * condition builder, rather than exposing raw field/operator keys. */
function describeCondition(condition: GroupCondition, fields: GroupFieldMeta[]): string {
  const label = fields.find((f) => f.key === condition.field)?.label ?? condition.field;
  const operatorLabel = OPERATOR_LABELS[condition.operator] ?? condition.operator;
  const value = Array.isArray(condition.value)
    ? condition.value.join(condition.operator === 'between' ? ' and ' : ', ')
    : condition.value;
  // The valueless relative-date operators ('this month', 'this year') read fine on their own.
  return value === undefined || value === '' ? `${label} ${operatorLabel}` : `${label} ${operatorLabel} ${value}`;
}

export default function GroupResultsPage() {
  const { groupId } = useParams({ strict: false }) as { groupId: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: group } = useQuery({ queryKey: ['groups', groupId], queryFn: () => getGroup(groupId) });
  const { data: fields = [] } = useQuery({ queryKey: ['groups', 'fields'], queryFn: getGroupFields });
  const { data: result, isFetching } = useQuery({
    queryKey: ['groups', groupId, 'results', page],
    queryFn: () => getGroupResults(groupId, page),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      await router.navigate({ to: '/groups' });
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-xl">
              <h2 className="contents">{group?.name ?? 'Group'}</h2>
            </CardTitle>
            {group && (
              <p className="text-sm text-muted-foreground">
                {group.owner.name}
                {' · '}
                <Badge variant={group.sharedWith.mode === 'shared' ? 'default' : 'secondary'}>
                  {group.sharedWith.mode === 'shared' ? 'Shared' : 'Private'}
                </Badge>
              </p>
            )}
            {group && (
              <p className="text-sm text-muted-foreground">
                {group.conditions.map((c) => describeCondition(c, fields)).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/groups/$groupId/edit" params={{ groupId }}>
                Edit conditions
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Delete group"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {result && <GroupResultsTable result={result} busy={isFetching} onPageChange={setPage} />}
        </CardContent>
      </Card>

      <DeleteGroupDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        groupName={group?.name}
        onConfirm={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
