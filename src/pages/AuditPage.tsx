import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AUDIT_PAGE_SIZES,
  AUDIT_QUERY_KEY,
  auditActionLabel,
  listAuditActions,
  listAuditEntries,
} from '@/api/audit.api';
import { getUserDirectory } from '@/api/users.api';
import { AuditChangeList } from '@/components/audit/audit-change-list';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateField } from '@/components/date-field';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatDisplayDateTime } from '@/utils/dateFormat';

// A Radix Select cannot hold a genuinely empty string value, so "no filter" is this
// sentinel rather than ''; every read site maps it back to `undefined` before it
// ever reaches `listAuditEntries` (which already drops undefined/blank params).
const ANY = '__any__';

export function AuditPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [actor, setActor] = useState<string>(ANY);
  const [action, setAction] = useState<string>(ANY);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: actions = [] } = useQuery({
    queryKey: [...AUDIT_QUERY_KEY, 'actions'],
    queryFn: listAuditActions,
  });
  const { data: directory = [] } = useQuery({
    queryKey: ['users', 'directory'],
    queryFn: getUserDirectory,
  });

  // Changing any filter must land the user back on page 1 — a page number valid
  // under the old filter set can easily be out of range under the new one.
  useEffect(() => {
    setPage(1);
  }, [actor, action, from, to, pageSize]);

  const filter = {
    page,
    pageSize,
    actor: actor === ANY ? undefined : actor,
    action: action === ANY ? undefined : action,
    from: from || undefined,
    to: to || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: [...AUDIT_QUERY_KEY, 'list', filter],
    queryFn: () => listAuditEntries(filter),
    placeholderData: keepPreviousData,
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  function clearFilters() {
    setActor(ANY);
    setAction(ANY);
    setFrom('');
    setTo('');
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit log</h2>
        <p className="text-sm text-muted-foreground">
          Deletions, financial edits, and account changes across the app. Read-only.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor="audit-actor">User</Label>
          <Select value={actor} onValueChange={setActor}>
            <SelectTrigger id="audit-actor" aria-label="Filter by user" className="w-56">
              <SelectValue placeholder="Any user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any user</SelectItem>
              {directory.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="audit-action">Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger id="audit-action" aria-label="Filter by action" className="w-56">
              <SelectValue placeholder="Any action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any action</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {auditActionLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="audit-from">From</Label>
          <DateField id="audit-from" ariaLabel="Filter from date" value={from} onChange={setFrom} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="audit-to">To</Label>
          <DateField id="audit-to" ariaLabel="Filter to date" value={to} onChange={setTo} />
        </div>

        <Button type="button" variant="ghost" onClick={clearFilters}>
          Clear
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44 whitespace-nowrap">When</TableHead>
              <TableHead className="w-48 whitespace-nowrap">Who</TableHead>
              <TableHead className="w-48 whitespace-nowrap">Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={4} rows={pageSize} />
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No audit entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatDisplayDateTime(entry.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{entry.actor?.name ?? 'Unknown user'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {auditActionLabel(entry.action)}
                  </TableCell>
                  <TableCell>
                    <AuditChangeList summary={entry.summary} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        pageSizes={AUDIT_PAGE_SIZES}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

export default AuditPage;
