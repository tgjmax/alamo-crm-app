import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import { listAuditEntries, listAuditActions, AUDIT_ACTION_LABELS, auditActionLabel } from './audit.api';

// Mirrors the backend's `LEDGER_ACTIONS`/`USER_ACTIONS` (`auditActions.ts`) verbatim —
// 15 ledger + 6 user = 21. Spelled out here (not just `Object.keys(AUDIT_ACTION_LABELS)`)
// so a label that's present but misspelled relative to the real backend action string
// still fails this test, not just an accidental omission.
const ALL_BACKEND_ACTIONS = [
  'booking.update',
  'booking.void',
  'booking.delete',
  'passenger.paymentUpdate',
  'passenger.update',
  'passenger.delete',
  'adjustment.update',
  'customer.delete',
  'customer.bulkDelete',
  'enquiry.delete',
  'enquiry.update',
  'invoice.send',
  'enquiry.sendQuote',
  'group.delete',
  'widget.delete',
  'user.create',
  'user.roleChange',
  'user.permissionsChange',
  'user.passwordReset',
  'user.deactivate',
  'user.reactivate',
];

vi.mock('./client', () => ({ apiClient: { get: vi.fn() } }));

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

describe('listAuditEntries', () => {
  it('sends only the params that were provided', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { entries: [], total: 0, page: 1, pageSize: 25 },
    });

    await listAuditEntries({ page: 2, bookingRef: 'b1' });

    const [url] = vi.mocked(apiClient.get).mock.calls[0];
    expect(url).toContain('page=2');
    expect(url).toContain('bookingRef=b1');
    expect(url).not.toContain('actor=');
    expect(url).not.toContain('action=');
  });

  it('returns the page payload', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { entries: [], total: 7, page: 1, pageSize: 25 },
    });
    const page = await listAuditEntries({});
    expect(page.total).toBe(7);
  });
});

describe('listAuditActions', () => {
  it('unwraps the actions array', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { actions: ['booking.delete'] } });
    expect(await listAuditActions()).toEqual(['booking.delete']);
  });
});

describe('AUDIT_ACTION_LABELS', () => {
  it('has exactly 21 entries, one per backend action, with no extras', () => {
    expect(Object.keys(AUDIT_ACTION_LABELS).sort()).toEqual([...ALL_BACKEND_ACTIONS].sort());
  });

  it('maps every backend action to a non-empty human label', () => {
    for (const action of ALL_BACKEND_ACTIONS) {
      expect(AUDIT_ACTION_LABELS[action]).toBeTruthy();
    }
  });

  it('the two email-send actions read as something leaving the building', () => {
    expect(auditActionLabel('invoice.send')).toMatch(/email/i);
    expect(auditActionLabel('enquiry.sendQuote')).toMatch(/email/i);
  });
});

describe('auditActionLabel', () => {
  it('degrades an unmapped action to its raw key rather than rendering undefined', () => {
    expect(auditActionLabel('some.futureAction')).toBe('some.futureAction');
  });

  it('resolves a mapped action to its human label', () => {
    expect(auditActionLabel('booking.delete')).toBe('Invoice deleted');
  });
});
