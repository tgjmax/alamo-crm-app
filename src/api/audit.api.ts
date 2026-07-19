import { apiClient } from './client';

export const AUDIT_QUERY_KEY = ['audit'] as const;

export interface AuditFieldChange {
  path: string;
  from: unknown;
  to: unknown;
}

/** Edits carry `changes`; deletes carry `snapshot`. Exactly one is present. */
export type AuditSummary =
  | { changes: AuditFieldChange[] }
  | { snapshot: Record<string, unknown> };

export interface AuditActor {
  id: string;
  name: string;
  email: string;
}

export interface AuditEntry {
  id: string;
  /** Populated by the backend. Shows the actor's CURRENT name — entries are not
   *  name-snapshotted, so a renamed user's past entries follow the rename. May be
   *  `null` — a Mongoose `.populate()` can yield null whenever the ref target can't
   *  be resolved. This app never deletes users (they're deactivated, never removed —
   *  there is deliberately no DELETE route), so that is NOT the reason here; it is
   *  purely defensive typing against what `.populate()` can return in general. */
  actor: AuditActor | null;
  action: string;
  targetCollection: string;
  /** Optional: an outbound-email-relay action (`invoice.send`) has no persisted document to
   *  point at — this app deliberately stores no Invoice collection — so there is no id to
   *  record. Nothing in this app currently renders `targetId` from a fetched entry (it is only
   *  ever sent as an outgoing query param via `AuditListParams`), so its absence needs no
   *  fallback rendering — just don't assume it's always present when reading one. */
  targetId?: string;
  bookingRef?: string;
  summary: AuditSummary;
  createdAt: string;
}

export interface AuditEntryPage {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditListParams {
  page?: number;
  pageSize?: number;
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
  targetCollection?: string;
  targetId?: string;
  bookingRef?: string;
}

export const AUDIT_PAGE_SIZES = [10, 25, 50, 100];

export async function listAuditEntries(params: AuditListParams): Promise<AuditEntryPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== '') {
      query.set(key, String(value));
    }
  }
  const res = await apiClient.get<AuditEntryPage>(`/audit?${query.toString()}`);
  return res.data;
}

export async function listAuditActions(): Promise<string[]> {
  const res = await apiClient.get<{ actions: string[] }>('/audit/actions');
  return res.data.actions;
}

/** Human labels for the action catalogue. Hand-synced with the backend's
 *  `auditActions.ts` — same manual-sync arrangement as the Groups field registry.
 *  An unmapped action must degrade to its raw key (see `auditActionLabel`), never crash.
 *  21 actions total (15 LEDGER + 6 USER) — keep this count and the spelling of every
 *  key identical to `LEDGER_ACTIONS`/`USER_ACTIONS` in the backend source. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'booking.update': 'Booking edited',
  'booking.void': 'Booking voided',
  'booking.delete': 'Invoice deleted',
  'passenger.update': 'Passenger edited',
  'passenger.paymentUpdate': 'Payment updated',
  'passenger.delete': 'Passenger deleted',
  'adjustment.update': 'Adjustment edited',
  'customer.delete': 'Customer deleted',
  'customer.bulkDelete': 'Customers bulk-deleted',
  'enquiry.delete': 'Enquiry deleted',
  'enquiry.update': 'Enquiry edited',
  // The two email sends: label must read as "left the building" at a glance — this is
  // the whole reason these two actions exist (an outbound email relay was previously
  // unlogged), so "emailed" rather than a bare "sent" is deliberate.
  'invoice.send': 'Invoice emailed',
  'enquiry.sendQuote': 'Quote emailed',
  'group.delete': 'Group deleted',
  'widget.delete': 'Widget deleted',
  'user.create': 'User created',
  'user.roleChange': 'Role changed',
  'user.permissionsChange': 'Permissions changed',
  'user.passwordReset': 'Password reset',
  'user.deactivate': 'User deactivated',
  'user.reactivate': 'User reactivated',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
