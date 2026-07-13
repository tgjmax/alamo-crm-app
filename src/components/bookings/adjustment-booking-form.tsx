import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookingRow, createAdjustment, listBookings } from '@/api/bookings.api';
import { AdjustmentSharedFields } from './adjustment-shared-fields';

interface AdjustmentBookingFormProps {
  bookingType: 'Reissue' | 'Refund';
  /** Called once every checked passenger's adjustment has been created. */
  onDone: () => void;
  onCancel: () => void;
}

interface PnrGroup {
  pnr: string;
  invoiceNumber: string;
  passengers: BookingRow[];
}

export function AdjustmentBookingForm({ bookingType, onDone, onCancel }: AdjustmentBookingFormProps) {
  const [pnrQuery, setPnrQuery] = useState('');
  const [debouncedPnrQuery, setDebouncedPnrQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<PnrGroup | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [shared, setShared] = useState({
    bookingDate: new Date().toISOString().slice(0, 10),
    pnr: '',
    airlineCode: '',
    depCity: '',
    arrCity: '',
    depDate: '',
    arrDate: '',
    remark: '',
    paymentStatus: 'paid' as 'paid' | 'pending',
    paymentType: 'card' as 'card' | 'check' | 'cash',
    pendingAmount: '',
  });
  const [succeeded, setSucceeded] = useState<Set<string>>(new Set());
  const [failedNames, setFailedNames] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPnrQuery(pnrQuery), 300);
    return () => clearTimeout(t);
  }, [pnrQuery]);

  const { data: searchData } = useQuery({
    queryKey: ['bookings', 'pnr-search', debouncedPnrQuery],
    queryFn: () => listBookings({ q: debouncedPnrQuery, pageSize: 50 }),
    enabled: !selectedGroup && debouncedPnrQuery.trim().length >= 3,
  });

  // Only original (New) passengers are adjustable — adjustments can't be adjusted again.
  const pnrGroups = useMemo<PnrGroup[]>(() => {
    const rows = (searchData?.bookings ?? []).filter((r): r is BookingRow & { pnr: string } =>
      Boolean(r.bookingType === 'New' && r.pnr)
    );
    const byPnr = new Map<string, BookingRow[]>();
    for (const row of rows) {
      const list = byPnr.get(row.pnr) ?? [];
      list.push(row);
      byPnr.set(row.pnr, list);
    }
    return Array.from(byPnr.entries()).map(([pnr, passengers]) => ({
      pnr,
      invoiceNumber: passengers[0].invoiceNumber,
      passengers,
    }));
  }, [searchData]);

  function selectGroup(group: PnrGroup) {
    const first = group.passengers[0];
    setSelectedGroup(group);
    setChecked(Object.fromEntries(group.passengers.map((p) => [p.id, true])));
    setAmounts(Object.fromEntries(group.passengers.map((p) => [p.id, String(p.amount)])));
    setShared((s) => ({
      ...s,
      pnr: group.pnr,
      airlineCode: first.airlineCode ?? '',
      depCity: first.depCity ?? '',
      arrCity: first.arrCity ?? '',
      depDate: first.depDate?.slice(0, 10) ?? '',
      arrDate: first.arrDate?.slice(0, 10) ?? '',
    }));
    setSucceeded(new Set());
    setFailedNames([]);
  }

  function handlePnrQueryChange(value: string) {
    setPnrQuery(value);
    if (selectedGroup) setSelectedGroup(null);
  }

  const remainingTargets = selectedGroup
    ? selectedGroup.passengers.filter((p) => checked[p.id] && !succeeded.has(p.id))
    : [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedGroup || remainingTargets.length === 0) return;
    setSubmitting(true);
    setFailedNames([]);
    const newSucceeded = new Set(succeeded);
    const failures: string[] = [];
    for (const p of remainingTargets) {
      try {
        await createAdjustment(p.id, {
          bookingType,
          bookingDate: shared.bookingDate,
          amount: Number(amounts[p.id]),
          pnr: shared.pnr,
          airlineCode: shared.airlineCode || undefined,
          ...(bookingType === 'Reissue'
            ? {
                depCity: shared.depCity || undefined,
                arrCity: shared.arrCity || undefined,
                depDate: shared.depDate || undefined,
                arrDate: shared.arrDate || undefined,
              }
            : {}),
          remark: shared.remark || undefined,
          payment: {
            status: shared.paymentStatus,
            type: shared.paymentType,
            amount: shared.paymentStatus === 'pending' ? Number(shared.pendingAmount) : 0,
          },
        });
        newSucceeded.add(p.id);
      } catch {
        failures.push(p.passengerName);
      }
    }
    setSucceeded(newSucceeded);
    setFailedNames(failures);
    setSubmitting(false);
    if (failures.length === 0) {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onDone();
    }
  }

  const submitLabel = submitting
    ? 'Saving…'
    : failedNames.length > 0
      ? 'Retry failed'
      : bookingType === 'Reissue'
        ? 'Record reissue'
        : 'Record refund';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="adjustment-pnr-search">Original PNR</Label>
        <Input
          id="adjustment-pnr-search"
          value={pnrQuery}
          onChange={(e) => handlePnrQueryChange(e.target.value)}
          placeholder="Type at least 3 characters to search the original PNR"
        />
        {!selectedGroup && pnrGroups.length > 0 && (
          <ul className="rounded-md border bg-popover text-popover-foreground shadow">
            {pnrGroups.map((g) => (
              <li key={g.pnr}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => selectGroup(g)}
                >
                  {g.pnr} — {g.invoiceNumber} — {g.passengers.length}{' '}
                  {g.passengers.length === 1 ? 'passenger' : 'passengers'}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {!selectedGroup && searchData && debouncedPnrQuery.trim().length >= 3 && pnrGroups.length === 0 && (
          <p className="text-sm text-muted-foreground">No adjustable passengers found for this PNR.</p>
        )}
      </div>

      {selectedGroup && (
        <>
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Passengers</p>
            {selectedGroup.passengers.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Checkbox
                  id={`adjust-include-${p.id}`}
                  aria-label={`Include ${p.passengerName}`}
                  checked={checked[p.id] ?? false}
                  onCheckedChange={(v) => setChecked({ ...checked, [p.id]: v === true })}
                />
                <Label htmlFor={`adjust-include-${p.id}`} className="flex-1">
                  {p.passengerName}
                </Label>
                <Input
                  aria-label={`Amount for ${p.passengerName}`}
                  type="number"
                  className="w-32"
                  value={amounts[p.id] ?? ''}
                  onChange={(e) => setAmounts({ ...amounts, [p.id]: e.target.value })}
                  disabled={!checked[p.id]}
                  required={checked[p.id]}
                />
              </div>
            ))}
          </div>

          <AdjustmentSharedFields
            bookingType={bookingType}
            value={shared}
            onChange={(patch) => setShared({ ...shared, ...patch })}
          />
        </>
      )}

      {failedNames.length > 0 && (
        <p className="text-sm text-destructive">
          Failed for: {failedNames.join(', ')}. Click "Retry failed" to try again.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedGroup || remainingTargets.length === 0 || submitting}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
