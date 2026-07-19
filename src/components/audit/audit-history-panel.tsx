import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { AUDIT_QUERY_KEY, AuditEntryPage, AuditListParams, auditActionLabel, listAuditEntries } from '@/api/audit.api';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDisplayDateTime } from '@/utils/dateFormat';
import { AuditChangeList } from './audit-change-list';

interface AuditHistoryPanelProps {
  /** Which record's history to load — e.g. `{ bookingRef: id }` for an invoice,
   *  `{ targetCollection: 'users', targetId: id }` for a user. */
  filter: AuditListParams;
  title?: string;
}

export function AuditHistoryPanel({ filter, title = 'History' }: AuditHistoryPanelProps): JSX.Element {
  const { data, isLoading, isError }: UseQueryResult<AuditEntryPage> = useQuery({
    queryKey: [...AUDIT_QUERY_KEY, 'record', filter],
    queryFn: () => listAuditEntries({ ...filter, pageSize: 25 }),
  });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} data-testid="audit-skeleton" className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Could not load history.</p>}

      {!isLoading && data && data.entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No recorded changes.</p>
      )}

      {!isLoading && data && data.entries.length > 0 && (
        <ol className="space-y-3">
          {data.entries.map((entry) => (
            <li key={entry.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{auditActionLabel(entry.action)}</span>
                <span className="text-xs text-muted-foreground">{formatDisplayDateTime(entry.createdAt)}</span>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {entry.actor?.name ?? 'Unknown user'}
              </p>
              <AuditChangeList summary={entry.summary} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
