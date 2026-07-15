import { FormEvent, ReactNode, useState } from 'react';
import { Hash, Plane, PlaneLanding, PlaneTakeoff, StickyNote, Ticket, User, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookingDetail, createBooking, DuplicateInvoice, updateBooking, UpdateBookingInput, UpdatePassengerInput } from '@/api/bookings.api';
import { searchCustomers } from '@/api/customers.api';
import { AddEditCustomerDialog } from '@/components/customers/add-edit-customer-dialog';
import { CodeSearchField } from '@/components/code-search-field';
import { DateField } from '@/components/date-field';
import { IconInput } from '@/components/icon-input';
import { searchAirports, searchAirlines } from '@/api/flightData.api';
import { useListNavigation } from '@/hooks/useListNavigation';
import { duplicateInvoice, errorMessage } from '@/utils/apiError';
import { formatDisplayDate } from '@/utils/dateFormat';
import { ticketingName } from '@/utils/ticketingName';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { canCreateCustomers } from '@/utils/permissions';

const emptyForm = {
  invoiceNumber: '',
  bookingDate: new Date().toISOString().slice(0, 10),
  voided: false,
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
  // Never rendered — neither this form nor its `paymentStatus`/`paymentType`/`pendingAmount`
  // siblings expose a "paid on" control. It only exists so an existing booking's `payment.paidOn`
  // (set via record-payment-dialog.tsx) survives a wholesale `PATCH /bookings/:id`, which replaces
  // `payment` as a whole object — any field this form doesn't send is erased server-side. On
  // CREATE there is nothing to preserve, so this stays '' and is never submitted (see handleSubmit).
  paidOn: '',
};

interface PassengerRow {
  /** Present only for a passenger already stored on the invoice. A row the user just added has
   * no id, which is exactly how the backend tells "create" from "update" in its diff. */
  id?: string;
  name: string;
  amount: string;
  customer?: string;
}

const EMPTY_PASSENGER: PassengerRow = { name: '', amount: '' };

function formStateFrom(initial?: BookingDetail): typeof emptyForm {
  if (!initial) return emptyForm;
  const b = initial.booking;
  return {
    invoiceNumber: b.invoiceNumber,
    bookingDate: b.bookingDate,
    voided: b.voided,
    pnr: b.pnr ?? '',
    airlineCode: b.airlineCode ?? '',
    depCity: b.depCity ?? '',
    arrCity: b.arrCity ?? '',
    depDate: b.depDate ?? '',
    arrDate: b.arrDate ?? '',
    remark: b.remark ?? '',
    paymentStatus: b.payment?.status ?? 'paid',
    paymentType: b.payment?.type ?? 'card',
    // `!= null` (not truthy) so a pending payment stored with amount 0 still seeds '0', not ''
    // into this `required` input.
    pendingAmount: b.payment?.amount != null ? String(b.payment.amount) : '',
    paidOn: b.payment?.paidOn ?? '',
  };
}

function passengerRowsFrom(initial?: BookingDetail): PassengerRow[] {
  if (!initial || initial.passengers.length === 0) return [{ ...EMPTY_PASSENGER }];
  return initial.passengers.map((p) => ({
    id: p.id,
    name: p.passengerName,
    amount: String(p.amount),
    customer: p.customer,
  }));
}

interface BookingFormProps {
  /** Absent = create a new booking. Present = edit this one. */
  initial?: BookingDetail;
  /** Rendered into the form's first grid cell. The create dialog passes its Booking Type
   * <Select> here; the edit dialog passes nothing (a New booking can't become a Reissue). */
  typeSelector?: ReactNode;
  onDone: () => void;
  onCancel: () => void;
}

export function BookingForm({ initial, typeSelector, onDone, onCancel }: BookingFormProps) {
  const user = useAuthStore((s) => s.user);
  const canAddCustomer = canCreateCustomers(user);
  // No reset-on-`initial`-change effect here on purpose: `initial` comes from a TanStack Query in
  // the edit dialog, and this form's own `onSuccess` invalidates ['bookings'] — a background
  // refetch mid-edit would hand this component a new `initial` object identity and (if an effect
  // watched it) silently wipe whatever the user had typed. Both callers instead remount this
  // component on open/close (`EditBookingDialog` keys it by `data.booking.id`, `CreateBookingDialog`
  // keys it by `open ? 'open' : 'closed'`), so these lazy initializers already re-seed correctly
  // without any effect. (This exact class of bug was fixed once already in this codebase — see
  // send-quote-dialog.tsx's `wasOpen`-gated reset effect — so don't reintroduce it here.)
  const [form, setForm] = useState(() => formStateFrom(initial));
  const [passengers, setPassengers] = useState<PassengerRow[]>(() => passengerRowsFrom(initial));
  // Which passenger row's autocomplete is active, and what it has typed.
  const [search, setSearch] = useState<{ index: number; query: string } | null>(null);
  // Which passenger row an inline "add new customer" should fill on success.
  const [addCustomerIndex, setAddCustomerIndex] = useState(0);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  // The payload the backend warned about, held so "Save anyway" can re-send exactly it with
  // confirmDuplicate set. Non-null iff the warning panel is showing.
  const [pendingDuplicate, setPendingDuplicate] = useState<{ input: UpdateBookingInput; duplicate: DuplicateInvoice } | null>(null);
  // True once the user has tried to submit with an unlinked passenger — drives the inline
  // "pick a customer" message. Every non-voided passenger must be tied to a Customer record.
  const [linkAttempted, setLinkAttempted] = useState(false);
  const queryClient = useQueryClient();

  const searchQuery = search?.query ?? '';
  const { data: matches = [] } = useQuery({
    queryKey: ['customers', 'search', searchQuery],
    queryFn: () => searchCustomers(searchQuery),
    enabled: searchQuery.trim().length >= 3,
  });

  const saveMutation = useMutation({
    mutationFn: async (input: UpdateBookingInput): Promise<void> => {
      if (initial) {
        await updateBooking(initial.booking.id, input);
      } else {
        await createBooking(input);
      }
    },
    onMutate: () => setPendingDuplicate(null),
    onError: (err, input) => {
      const duplicate = duplicateInvoice(err);
      if (duplicate) setPendingDuplicate({ input, duplicate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      onDone();
    },
  });

  function updatePassenger(index: number, patch: Partial<PassengerRow>) {
    setPassengers((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function selectMatch(index: number, name: string, customerId: string) {
    updatePassenger(index, { name, customer: customerId });
    setSearch(null);
  }

  /** The suggestion list is open for a row when that row is the one being searched and the
   * query is long enough — the same condition that renders it. */
  function isNameListOpen(index: number): boolean {
    return search?.index === index && search.query.trim().length >= 3;
  }

  const {
    activeIndex: nameActiveIndex,
    setActiveIndex: setNameActiveIndex,
    handleKeyDown: handleNameKeyDown,
  } = useListNavigation({
    items: matches,
    onSelect: (m) => {
      if (search) selectMatch(search.index, ticketingName(m), m.id);
    },
    onClose: () => setSearch(null),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Every non-voided passenger must be linked to a Customer (picked from autocomplete or
    // inline-created). The name control never accepts hand-typed final values, so an unlinked row
    // here means the user never picked (or re-picked) anyone.
    if (!form.voided && passengers.some((p) => !p.customer)) {
      setLinkAttempted(true);
      return;
    }

    // Rows that will actually be submitted (a blank never-typed row is dropped; a stored row is
    // always kept). Voided invoices don't render passengers and submit a placeholder instead.
    const storedRows = passengers.filter((p) => Boolean(p.id) || p.name.trim().length > 0);

    saveMutation.mutate({
      invoiceNumber: form.invoiceNumber,
      bookingDate: form.bookingDate,
      voided: form.voided,
      pnr: form.voided ? undefined : form.pnr || undefined,
      airlineCode: form.voided ? undefined : form.airlineCode || undefined,
      depCity: form.voided ? undefined : form.depCity || undefined,
      arrCity: form.voided ? undefined : form.arrCity || undefined,
      depDate: form.voided ? undefined : form.depDate || undefined,
      arrDate: form.voided ? undefined : form.arrDate || undefined,
      remark: form.remark || undefined,
      payment: form.voided
        ? undefined
        : {
            status: form.paymentStatus,
            type: form.paymentType,
            amount: form.paymentStatus === 'pending' ? Number(form.pendingAmount) : 0,
            // Round-tripped invisibly: this form has no "paid on" control of its own. On CREATE,
            // `form.paidOn` is always '' (never seeded from anything), so this is always
            // `undefined` there and the field is simply absent from the payload, matching
            // pre-existing CREATE behavior exactly. On EDIT, it carries through whatever
            // record-payment-dialog.tsx already set, so saving an unrelated field here (a remark
            // typo fix, say) doesn't silently erase it via the wholesale PATCH.
            paidOn: form.paidOn || undefined,
          },
      // A voided invoice hides the Passengers section, but the `VOID` placeholder is CREATE-only
      // (`!initial`): the backend requires >=1 passenger on every booking, and a brand-new voided
      // invoice has no stored passengers yet, so it needs a dummy row to satisfy that. In EDIT
      // mode there ARE stored passengers, and `PATCH /bookings/:id` treats `passengers[]` as the
      // complete desired end state — a stored passenger omitted from the array is DELETED, and an
      // entry with no `id` is indistinguishable from "start fresh". Submitting the id-less VOID
      // placeholder here would delete every real passenger on the invoice. `voided` only relaxes
      // the backend's pnr/airlineCode requirement; it does not require a dummy passenger, so in
      // edit mode we send the stored rows with their ids, exactly like the non-voided path — don't
      // collapse these two branches back together.
      passengers:
        form.voided && !initial
          ? [{ passengerName: 'VOID', amount: 0 }]
          : storedRows.map<UpdatePassengerInput>((p) => ({
              // A row with no id is a passenger the user just added — the backend creates it.
              ...(p.id ? { id: p.id } : {}),
              passengerName: p.name,
              amount: Number(p.amount),
              ...(p.customer ? { customer: p.customer } : {}),
            })),
    });
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Row: Booking Type | Invoice# | Booking Date | Mark as voided — the create dialog passes a
          typeSelector for the first cell; the edit dialog passes none (a New booking can't become a
          Reissue), so that cell is dropped entirely and the grid collapses by one column rather than
          leaving a blank leading column.

          Booking Date defaults to today but MUST be editable: an invoice is routinely entered days
          after it was raised, and the ledger is largely back-filled historical data. It is also the
          field the duplicate-invoice warning keys on (invoice# + booking date + PNR), so leaving it
          silently pinned to today — as this form did until 2026-07-13 — both mis-dates the row and
          skews that check. */}
      <div className={cn('grid items-end gap-3', typeSelector ? 'grid-cols-4' : 'grid-cols-3')}>
        {typeSelector && <div className="space-y-1">{typeSelector}</div>}
        <div className="space-y-1">
          <Label htmlFor="booking-invoice-number">Invoice#</Label>
          <IconInput
            id="booking-invoice-number"
            aria-label="Invoice number"
            icon={<Hash />}
            value={form.invoiceNumber}
            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            placeholder="e.g. 1042"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-date">Booking Date</Label>
          <DateField
            id="booking-date"
            ariaLabel="Booking Date"
            value={form.bookingDate}
            onChange={(iso) => setForm({ ...form, bookingDate: iso })}
            required
          />
        </div>
        <div className="flex items-center gap-2 pb-2.5">
          <Checkbox
            id="booking-voided"
            checked={form.voided}
            onCheckedChange={(checked) => setForm({ ...form, voided: checked === true })}
          />
          <Label htmlFor="booking-voided">Mark as voided</Label>
        </div>
      </div>

      {/* Passengers: one row per passenger — hidden entirely when voided (a placeholder
          VOID passenger is submitted instead, since the backend requires ≥1 passenger). */}
      {!form.voided && (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Passengers</p>
        {passengers.map((passenger, index) => {
          const nameLabel = index === 0 ? 'Passenger name' : `Passenger name ${index + 1}`;
          const searching = search?.index === index;
          const mode: 'search' | 'selected' | 'unlinked' = searching
            ? 'search'
            : passenger.customer
              ? 'selected'
              : passenger.name.trim().length > 0
                ? 'unlinked'
                : 'search';
          return (
          <div key={index} className="flex items-start gap-2">
            <div className="relative flex-1">
              {mode === 'selected' && (
                <div className="flex items-center gap-2">
                  <IconInput aria-label={nameLabel} icon={<User />} value={passenger.name} readOnly />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Change customer for passenger ${index + 1}`}
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      updatePassenger(index, { name: '', customer: undefined });
                      setSearch({ index, query: '' });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {mode === 'unlinked' && (
                <div className="space-y-1">
                  <IconInput aria-label={nameLabel} icon={<User />} value={passenger.name} readOnly />
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-destructive">Not linked — select a customer</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Select customer for passenger ${index + 1}`}
                      onClick={() => setSearch({ index, query: '' })}
                    >
                      Select customer
                    </Button>
                  </div>
                </div>
              )}
              {mode === 'search' && (
                <>
                  <IconInput
                    aria-label={nameLabel}
                    icon={<User />}
                    value={searching ? search.query : ''}
                    onChange={(e) => setSearch({ index, query: e.target.value })}
                    onKeyDown={searching ? handleNameKeyDown : undefined}
                    placeholder="Search customer (3+ letters)"
                    role="combobox"
                    aria-expanded={isNameListOpen(index)}
                    aria-controls={`passenger-listbox-${index}`}
                    aria-autocomplete="list"
                    aria-activedescendant={
                      isNameListOpen(index) && nameActiveIndex >= 0
                        ? `passenger-listbox-${index}-${nameActiveIndex}`
                        : undefined
                    }
                  />
                  {/* A historic (originally-unlinked) row keeps its stored name in state while the
                      user re-searches; surface it so they know who to match. A ✕-cleared selected
                      row has name '' here, so this only shows for the historic case. */}
                  {searching && !passenger.customer && passenger.name.trim().length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">Originally recorded as {passenger.name}</p>
                  )}
                  {linkAttempted && !passenger.customer && (
                    <p role="alert" className="mt-1 text-sm text-destructive">
                      Select a customer from the list, or add a new one.
                    </p>
                  )}
                  {isNameListOpen(index) && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border bg-popover text-popover-foreground shadow">
                      {/* "+ Add new customer" pinned above the (scrollable) matches so it never sinks
                          below a long result list; max-h-48 ≈ 6 rows visible, the rest scroll.
                          Gated on customers.create — it opens the Add-Customer dialog, so that's the
                          permission it needs, not a bookings one. Searching/selecting an EXISTING
                          customer below is unaffected and stays available to everyone. */}
                      {canAddCustomer && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start border-b font-medium"
                          onClick={() => {
                            setAddCustomerIndex(index);
                            setAddCustomerOpen(true);
                          }}
                        >
                          + Add new customer
                        </Button>
                      )}
                      {matches.length > 0 && (
                        <ul id={`passenger-listbox-${index}`} role="listbox" className="max-h-48 overflow-y-auto">
                          {matches.map((m, matchIndex) => (
                            <li
                              key={m.id}
                              id={`passenger-listbox-${index}-${matchIndex}`}
                              role="option"
                              aria-selected={matchIndex === nameActiveIndex}
                              className={cn('cursor-pointer px-3 py-1', matchIndex === nameActiveIndex && 'bg-accent')}
                              onMouseEnter={() => setNameActiveIndex(matchIndex)}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectMatch(index, ticketingName(m), m.id)}
                            >
                              <div>{ticketingName(m)}</div>
                              <div className="text-xs text-muted-foreground">{m.dob}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="relative w-32 shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground">
                $
              </span>
              <Input
                aria-label={index === 0 ? 'Amount' : `Amount ${index + 1}`}
                type="number"
                className="pl-6"
                value={passenger.amount}
                onChange={(e) => updatePassenger(index, { amount: e.target.value })}
                placeholder="Amount"
                required
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove passenger ${index + 1}`}
              disabled={passengers.length === 1}
              className="h-9 w-9 shrink-0 rounded-md bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 disabled:bg-muted disabled:text-muted-foreground dark:bg-red-950 dark:text-red-300"
              onClick={() => setPassengers((rows) => rows.filter((_, i) => i !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          );
        })}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            // Reset the submit-attempt flag so a fresh blank row doesn't inherit the red
            // "Select a customer" alert from a previous failed submit before it's even been used.
            setLinkAttempted(false);
            setPassengers((rows) => [...rows, { ...EMPTY_PASSENGER }]);
          }}
        >
          Add passenger
        </Button>
      </div>
      )}

      {/* Row: PNR | Airline Code (hidden when voided) */}
      {!form.voided && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="booking-pnr">PNR</Label>
            <IconInput
              id="booking-pnr"
              aria-label="PNR"
              icon={<Ticket />}
              value={form.pnr}
              onChange={(e) => setForm({ ...form, pnr: e.target.value })}
              placeholder="e.g. X4F2QP"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="booking-airline">Airline Code</Label>
            <CodeSearchField
              id="booking-airline"
              ariaLabel="Airline code"
              value={form.airlineCode}
              onChange={(airlineCode) => setForm({ ...form, airlineCode })}
              search={searchAirlines}
              queryKey="airlines"
              placeholder="e.g. Qatar or QR"
              icon={<Plane />}
              required
            />
          </div>
        </div>
      )}

      {!form.voided && (
        <>
          {/* Row: Departure City | Arrival City */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="booking-dep-city">Departure City</Label>
              <CodeSearchField
                id="booking-dep-city"
                ariaLabel="Departure city"
                value={form.depCity}
                onChange={(depCity) => setForm({ ...form, depCity })}
                search={searchAirports}
                queryKey="airports"
                placeholder="e.g. Chicago or ORD"
                icon={<PlaneTakeoff />}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="booking-arr-city">Arrival City</Label>
              <CodeSearchField
                id="booking-arr-city"
                ariaLabel="Arrival city"
                value={form.arrCity}
                onChange={(arrCity) => setForm({ ...form, arrCity })}
                search={searchAirports}
                queryKey="airports"
                placeholder="e.g. Kochi or COK"
                icon={<PlaneLanding />}
                required
              />
            </div>
          </div>

          {/* Row: Departure Date | Arrival Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="booking-dep-date">Departure Date</Label>
              <DateField
                id="booking-dep-date"
                ariaLabel="Departure Date"
                value={form.depDate}
                onChange={(iso) => setForm({ ...form, depDate: iso })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="booking-arr-date">Arrival Date</Label>
              <DateField
                id="booking-arr-date"
                ariaLabel="Arrival Date"
                value={form.arrDate}
                onChange={(iso) => setForm({ ...form, arrDate: iso })}
                required
              />
            </div>
          </div>
        </>
      )}

      {/* Row: Remark */}
      <div className="space-y-1">
        <Label htmlFor="booking-remark">Remark</Label>
        <IconInput
          id="booking-remark"
          icon={<StickyNote />}
          value={form.remark}
          onChange={(e) => setForm({ ...form, remark: e.target.value })}
          placeholder={form.voided ? 'e.g. VOID' : 'Optional note'}
        />
      </div>

      {/* Row: Payment Status | Payment Type (Paid only) | Pending Amount (Pending only) */}
      {!form.voided && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Payment Status</Label>
            <Select
              value={form.paymentStatus}
              onValueChange={(v) => setForm({ ...form, paymentStatus: v as 'paid' | 'pending' })}
            >
              <SelectTrigger aria-label="Payment status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.paymentStatus === 'paid' && (
            <div className="space-y-1">
              <Label>Payment Type</Label>
              <Select
                value={form.paymentType}
                onValueChange={(v) => setForm({ ...form, paymentType: v as 'card' | 'check' | 'cash' })}
              >
                <SelectTrigger aria-label="Payment type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {form.paymentStatus === 'pending' && (
            <div className="space-y-1">
              <Label htmlFor="booking-pending-amount">Pending Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground">
                  $
                </span>
                <Input
                  id="booking-pending-amount"
                  aria-label="Amount owed"
                  type="number"
                  className="pl-6"
                  value={form.pendingAmount}
                  onChange={(e) => setForm({ ...form, pendingAmount: e.target.value })}
                  required
                />
              </div>
            </div>
          )}
        </div>
      )}
      {pendingDuplicate && (
        <div className="rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <p className="font-medium">
            Invoice {pendingDuplicate.duplicate.invoiceNumber} already exists with the same date and PNR.
          </p>
          <p className="mt-1 text-muted-foreground">
            {formatDisplayDate(pendingDuplicate.duplicate.bookingDate)}
            {pendingDuplicate.duplicate.pnr ? ` · ${pendingDuplicate.duplicate.pnr}` : ''}
            {pendingDuplicate.duplicate.passengerNames.length > 0
              ? ` · ${pendingDuplicate.duplicate.passengerNames.join(', ')}`
              : ''}
          </p>
          <p className="mt-2">Is this a different invoice?</p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPendingDuplicate(null);
                // Also clears saveMutation's own error state, not just the panel above — without
                // this the generic error line re-renders right underneath with the SAME "already
                // exists" text the panel just showed, once `pendingDuplicate` goes back to null.
                saveMutation.reset();
              }}
            >
              Go back
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate({ ...pendingDuplicate.input, confirmDuplicate: true })}
            >
              Save anyway
            </Button>
          </div>
        </div>
      )}
      {saveMutation.isError && !pendingDuplicate && (
        <p className="text-sm text-destructive">
          {errorMessage(saveMutation.error, 'Save failed. Check your connection and try again.')}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : initial ? 'Save changes' : 'Create booking'}
        </Button>
      </DialogFooter>
    </form>
    <AddEditCustomerDialog
      open={addCustomerOpen}
      onOpenChange={setAddCustomerOpen}
      onCreated={(fullName, customerId) => {
        updatePassenger(addCustomerIndex, { name: fullName, customer: customerId });
        setSearch(null);
      }}
    />
    </>
  );
}
