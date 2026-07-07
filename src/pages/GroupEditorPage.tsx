import { useEffect, useState } from 'react';
import axios from 'axios';
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
import GroupResultsTable from '../components/GroupResultsTable';
import {
  createGroup,
  getGroup,
  getGroupFields,
  previewGroup,
  updateGroup,
  GroupCondition,
  GroupQueryResult,
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

  async function runPreview(page: number) {
    setError(null);
    setBusy(true);
    try {
      setResult(await previewGroup(conditions, page));
    } catch (err) {
      const reason = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : undefined;
      setError(reason ?? 'Preview failed. Check the conditions and try again.');
    } finally {
      setBusy(false);
    }
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
    <div className="mx-auto max-w-4xl space-y-6">
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
              onClick={() => runPreview(1)}
            >
              {busy ? 'Working…' : 'Preview'}
            </Button>
            <Button type="button" disabled={busy || conditions.length === 0 || name.trim().length === 0} onClick={() => setSaveOpen(true)}>
              Save
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <GroupResultsTable result={result} busy={busy} onPageChange={runPreview} />
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
