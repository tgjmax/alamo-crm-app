import { AuditSummary } from '@/api/audit.api';

/** An absent value is a CLEARED field, not a blank one — the void case depends on
 *  this reading legibly. Never render it as an empty string.
 *  `=== undefined`/`=== null`, never truthiness: a real `0` or `false` is a
 *  legitimate value and must not be swallowed by this check. */
function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '(cleared)';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface AuditChangeListProps {
  summary: AuditSummary;
}

export function AuditChangeList({ summary }: AuditChangeListProps): JSX.Element {
  if ('changes' in summary) {
    if (summary.changes.length === 0) {
      return <p className="text-sm text-muted-foreground">No field changes recorded.</p>;
    }
    return (
      <ul className="space-y-0.5 text-sm">
        {summary.changes.map((change) => (
          <li key={change.path} className="font-mono text-xs">
            <span className="text-muted-foreground">{change.path}: </span>
            <span className="line-through opacity-70">{formatValue(change.from)}</span>
            <span className="mx-1">→</span>
            <span className="font-medium">{formatValue(change.to)}</span>
          </li>
        ))}
      </ul>
    );
  }

  const fields = Object.entries(summary.snapshot);
  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">No details recorded.</p>;
  }
  return (
    <ul className="space-y-0.5 text-sm">
      {fields.map(([key, value]) => (
        <li key={key} className="font-mono text-xs">
          <span className="text-muted-foreground">{key}: </span>
          <span className="font-medium">{formatValue(value)}</span>
        </li>
      ))}
    </ul>
  );
}
