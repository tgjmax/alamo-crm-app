import { useEffect, useState } from 'react';
import axios from 'axios';
import { SortingState, Updater, VisibilityState } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ConditionBuilder from '../components/ConditionBuilder';
import { GroupResultsTable } from '../components/groups/group-results-table';
import {
  createGroup,
  DEFAULT_GROUP_PAGE_SIZE,
  getGroup,
  getGroupFields,
  previewGroup,
  updateGroup,
  GroupCondition,
  GroupQueryResult,
  GroupResultParams,
  GroupSortBy,
} from '../api/groups.api';
import { getUserDirectory } from '../api/users.api';
import { useAuthStore } from '../stores/authStore';

export default function GroupEditorPage() {
  const { groupId } = useParams({ strict: false }) as { groupId?: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canShare = user?.role === 'admin' || user?.permissions?.groups.createShared === true;

  const [name, setName] = useState('');
  const [conditions, setConditions] = useState<GroupCondition[]>([]);
  const [shareMode, setShareMode] = useState<'private' | 'shared'>('private');
  const [shareUsers, setShareUsers] = useState<string[]>([]);
  const [result, setResult] = useState<GroupQueryResult | null>(null);
  // null means "no preview has been run yet" — the table renders nothing until the user asks for one.
  const [previewParams, setPreviewParams] = useState<GroupResultParams | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  // Ephemeral, session-only — the editor's preview has no saved group to attach a view to yet.
  // Exists only because GroupResultsTable's columnVisibility prop is required, not because the
  // editor's own scope asked for a View menu.
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [saveOpen, setSaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: fields = [] } = useQuery({ queryKey: ['groups', 'fields'], queryFn: getGroupFields });
  const { data: directory = [] } = useQuery({ queryKey: ['users', 'directory'], queryFn: getUserDirectory });
  const { data: existing } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => getGroup(groupId as string),
    enabled: Boolean(groupId),
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setConditions(existing.conditions);
      setShareMode(existing.sharedWith.mode);
      setShareUsers(existing.sharedWith.users);
    }
  }, [existing]);

  useEffect(() => {
    if (!previewParams) return;
    let cancelled = false;

    async function run(params: GroupResultParams) {
      setError(null);
      setBusy(true);
      try {
        const next = await previewGroup(conditions, params);
        if (!cancelled) setResult(next);
      } catch (err) {
        if (cancelled) return;
        const reason = axios.isAxiosError(err)
          ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
          : undefined;
        setError(reason ?? 'Preview failed. Check the conditions and try again.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void run(previewParams);
    return () => {
      cancelled = true;
    };
    // `conditions` is deliberately NOT a dependency: editing one must not re-run a half-built
    // preview on every keystroke. It is still read LIVE when the effect does fire, so re-arming
    // via Preview OR via a sort/page/pageSize click always previews the conditions as they stand
    // now — never a frozen snapshot, which would sort results for a filter the user already changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewParams]);

  function handleSortingChange(updater: Updater<SortingState>) {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(next);
    setPreviewParams((prev) =>
      prev
        ? {
            ...prev,
            page: 1,
            sortBy: next[0]?.id as GroupSortBy | undefined,
            sortDir: next[0] ? (next[0].desc ? 'desc' : 'asc') : undefined,
          }
        : prev
    );
  }

  async function handleSave() {
    setError(null);
    setBusy(true);
    try {
      const input = {
        name,
        conditions,
        sharedWith: { mode: canShare ? shareMode : ('private' as const), users: canShare && shareMode === 'shared' ? shareUsers : [] },
      };
      if (groupId) await updateGroup(groupId, input);
      else await createGroup(input);
      setSaveOpen(false);
      await router.navigate({ to: '/groups' });
    } catch {
      setError('Saving failed. Check your connection and try again.');
      setSaveOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function toggleShareUser(id: string) {
    setShareUsers((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h2 className="contents">{groupId ? 'Edit group' : 'New group'}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
          </div>

          <ConditionBuilder fields={fields} users={directory} conditions={conditions} onChange={setConditions} />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || conditions.length === 0}
              onClick={() =>
                setPreviewParams({
                  page: 1,
                  pageSize: previewParams?.pageSize ?? DEFAULT_GROUP_PAGE_SIZE,
                  sortBy: sorting[0]?.id as GroupSortBy | undefined,
                  sortDir: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
                })
              }
            >
              {busy ? 'Working…' : 'Preview'}
            </Button>
            <Button type="button" disabled={busy || conditions.length === 0 || name.trim().length === 0} onClick={() => setSaveOpen(true)}>
              Save
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <GroupResultsTable
            result={result}
            busy={busy}
            page={previewParams?.page ?? 1}
            pageSize={previewParams?.pageSize ?? DEFAULT_GROUP_PAGE_SIZE}
            sorting={sorting}
            columnVisibility={columnVisibility}
            onPageChange={(page) => setPreviewParams((prev) => (prev ? { ...prev, page } : prev))}
            onPageSizeChange={(pageSize) => setPreviewParams((prev) => (prev ? { ...prev, pageSize, page: 1 } : prev))}
            onSortingChange={handleSortingChange}
            onColumnVisibilityChange={setColumnVisibility}
          />
        </CardContent>
      </Card>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save group</DialogTitle>
          </DialogHeader>
          {canShare && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Sharing</Label>
                <Select value={shareMode} onValueChange={(v) => setShareMode(v as 'private' | 'shared')}>
                  <SelectTrigger aria-label="Share mode" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {shareMode === 'shared' && (
                <div className="flex flex-wrap gap-3">
                  {directory
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <label key={u.id} className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          aria-label={`Share with ${u.name}`}
                          checked={shareUsers.includes(u.id)}
                          onCheckedChange={() => toggleShareUser(u.id)}
                        />
                        {u.name}
                      </label>
                    ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={handleSave}>
              {busy ? 'Working…' : 'Save group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
