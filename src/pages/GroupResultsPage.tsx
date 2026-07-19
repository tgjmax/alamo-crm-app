import { useState } from 'react';
import { OnChangeFn, RowSelectionState, SortingState, Updater, VisibilityState } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { GroupResultsTable } from '@/components/groups/group-results-table';
import {
  DEFAULT_GROUP_PAGE_SIZE,
  deleteGroup,
  getGroup,
  getGroupFields,
  getGroupResults,
  GroupCondition,
  GroupDetail,
  GroupFieldMeta,
  GroupSortBy,
  updateGroupExclusions,
} from '@/api/groups.api';
import { OPERATOR_LABELS } from '@/utils/conditionLabels';
import { DeleteGroupDialog } from '@/components/groups/delete-group-dialog';
import { ExcludedRowsDialog } from '@/components/groups/excluded-rows-dialog';
import { useAuthStore } from '@/stores/authStore';
import { useGroupView } from '@/hooks/useGroupView';
import { isAdminOrAbove } from '@/utils/permissions';

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

interface GroupResultsSectionProps {
  group: GroupDetail;
  canPersistView: boolean;
}

/** Owns the table's page/sort/column-visibility state, seeded ONCE from the group's saved view via
 * lazy useState initializers. Rendered keyed by group.id at its call site, so if the group being
 * viewed ever changes, this remounts and re-seeds cleanly instead of leaking the previous group's
 * layout into the new one — the established "key-based remount over a reset effect" pattern. */
function GroupResultsSection({ group, canPersistView }: GroupResultsSectionProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_GROUP_PAGE_SIZE);
  const [sorting, setSorting] = useState<SortingState>(() =>
    group.view?.sort ? [{ id: group.view.sort.id, desc: group.view.sort.desc }] : []
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    Object.fromEntries((group.view?.hiddenColumns ?? []).map((id) => [id, false]))
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const queryClient = useQueryClient();

  const selectedIds = Object.keys(rowSelection);

  // The mutation carries its ids as VARIABLES (never closes over `selectedIds`) because
  // MutationObserver.setOptions() re-runs on every render and swaps an in-flight mutation's
  // callbacks for the latest render's closure — if onSuccess read `selectedIds` directly, selecting
  // more rows while the first request is still pending would make the eventual toast/deselect use
  // the WRONG (later) count. TanStack's second onSuccess argument is the variables that were
  // actually submitted, so it always reflects what this particular request sent, regardless of how
  // many times the component has re-rendered since.
  const excludeMutation = useMutation({
    mutationFn: (ids: string[]) => updateGroupExclusions(group.id, { add: ids }),
    onSuccess: (_data, submittedIds) => {
      // Deselect only the ids that were actually submitted — not the whole selection — so a
      // selection made while the request was in flight survives. Functional update so this reads
      // the CURRENT state, not a stale closure.
      setRowSelection((prev) => {
        const next = { ...prev };
        for (const id of submittedIds) delete next[id];
        return next;
      });
      // Excluding can drop the last row(s) off the current page (e.g. excluding all 3 rows on page
      // 4 of 4 leaves the user stranded on an empty page). Reset to page 1 rather than computing the
      // new page count.
      setPage(1);
      // Refetch both the visible rows and the group (whose excludedCount drives the badge).
      queryClient.invalidateQueries({ queryKey: ['groups', group.id] });
      toast.success(submittedIds.length === 1 ? 'Row excluded' : `${submittedIds.length} rows excluded`);
    },
    onError: () => {
      toast.error('Could not exclude those rows. Please try again.');
    },
  });

  const sortBy = sorting[0]?.id as GroupSortBy | undefined;
  const sortDir = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  // Page and sort/size must change together in the SAME state update, or `useQuery` fires once
  // with the OLD page and the NEW sort/size (a wasted round trip) before a separate effect catches
  // up and resets the page. Mirrors GroupEditorPage's handleSortingChange/onPageSizeChange.
  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  const handleSortingChange: OnChangeFn<SortingState> = (updater: Updater<SortingState>) => {
    setSorting(updater);
    setPage(1);
  };

  const { data: result, isFetching } = useQuery({
    queryKey: ['groups', group.id, 'results', { page, pageSize, sortBy, sortDir }],
    queryFn: () => getGroupResults(group.id, { page, pageSize, sortBy, sortDir }),
    placeholderData: keepPreviousData,
  });

  useGroupView(group.id, canPersistView, columnVisibility, sorting);

  return (
    <GroupResultsTable
      result={result ?? null}
      busy={isFetching}
      page={page}
      pageSize={pageSize}
      sorting={sorting}
      columnVisibility={columnVisibility}
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      toolbarActions={
        selectedIds.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={excludeMutation.isPending}
            onClick={() => excludeMutation.mutate(selectedIds)}
          >
            {excludeMutation.isPending && <Spinner className="mr-2" />}
            Exclude selected ({selectedIds.length})
          </Button>
        ) : null
      }
      onPageChange={setPage}
      onPageSizeChange={handlePageSizeChange}
      onSortingChange={handleSortingChange}
      onColumnVisibilityChange={setColumnVisibility}
    />
  );
}

export default function GroupResultsPage() {
  const { groupId } = useParams({ strict: false }) as { groupId: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const { data: group } = useQuery({ queryKey: ['groups', groupId], queryFn: () => getGroup(groupId) });
  const { data: fields = [] } = useQuery({ queryKey: ['groups', 'fields'], queryFn: getGroupFields });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      await router.navigate({ to: '/groups' });
    },
  });

  const canPersistView = Boolean(group && user && (isAdminOrAbove(user) || user.id === group.owner.id));

  return (
    <div className="mx-auto max-w-[1800px] space-y-6">
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
            <Button type="button" variant="outline" size="sm" onClick={() => setShowExcluded(true)}>
              Excluded ({group?.excludedCount ?? 0})
            </Button>
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
          {group && <GroupResultsSection key={group.id} group={group} canPersistView={canPersistView} />}
        </CardContent>
      </Card>

      <DeleteGroupDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        groupName={group?.name}
        onConfirm={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
      />

      {group && (
        <ExcludedRowsDialog
          open={showExcluded}
          onOpenChange={setShowExcluded}
          groupId={group.id}
          view={group.view}
        />
      )}
    </div>
  );
}
