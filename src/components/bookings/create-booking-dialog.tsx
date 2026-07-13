import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createBooking } from '@/api/bookings.api';
import { searchCustomers } from '@/api/customers.api';
import { AddEditCustomerDialog } from '@/components/customers/add-edit-customer-dialog';
import { CodeSearchField } from '@/components/code-search-field';
import { DateField } from '@/components/date-field';
import { searchAirports, searchAirlines } from '@/api/flightData.api';
import { AdjustmentBookingForm } from './adjustment-booking-form';
import { useListNavigation } from '@/hooks/useListNavigation';
import { cn } from '@/lib/utils';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
};

interface PassengerRow {
  name: string;
  amount: string;
}

const EMPTY_PASSENGER: PassengerRow = { name: '', amount: '' };

export function CreateBookingDialog({ open, onOpenChange }: CreateBookingDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [passengers, setPassengers] = useState<PassengerRow[]>([{ ...EMPTY_PASSENGER }]);
  // Which passenger row's autocomplete is active, and what it has typed.
  const [search, setSearch] = useState<{ index: number; query: string } | null>(null);
  // Which passenger row an inline "add new customer" should fill on success.
  const [addCustomerIndex, setAddCustomerIndex] = useState(0);
  const [bookingKind, setBookingKind] = useState<'New' | 'Reissue' | 'Refund'>('New');
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setPassengers([{ ...EMPTY_PASSENGER }]);
    setSearch(null);
    setAddCustomerIndex(0);
    setBookingKind('New');
    setAddCustomerOpen(false);
  }, [open]);

  const searchQuery = search?.query ?? '';
  const { data: matches = [] } = useQuery({
    queryKey: ['customers', 'search', searchQuery],
    queryFn: () => searchCustomers(searchQuery),
    enabled: searchQuery.trim().length >= 3,
  });

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onOpenChange(false);
    },
  });

  function updatePassenger(index: number, patch: Partial<PassengerRow>) {
    setPassengers((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleNameChange(index: number, value: string) {
    updatePassenger(index, { name: value });
    setSearch({ index, query: value });
  }

  function selectMatch(index: number, name: string) {
    updatePassenger(index, { name });
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
      if (search) selectMatch(search.index, `${m.firstName} ${m.lastName}`);
    },
    onClose: () => setSearch(null),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({
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
          },
      // A voided invoice hides the Passengers section but the backend requires ≥1 passenger,
      // so a placeholder row is recorded instead.
      passengers: form.voided
        ? [{ passengerName: 'VOID', amount: 0 }]
        : passengers.map((p) => ({ passengerName: p.name, amount: Number(p.amount) })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {bookingKind === 'New' ? 'Create booking' : bookingKind === 'Reissue' ? 'Record reissue' : 'Record refund'}
          </DialogTitle>
        </DialogHeader>
        {bookingKind === 'New' ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row: Booking Type | Invoice# | Mark as voided */}
          <div className="grid grid-cols-3 items-end gap-3">
            <div className="space-y-1">
              <Label>Booking Type</Label>
              <Select value={bookingKind} onValueChange={(v) => setBookingKind(v as 'New' | 'Reissue' | 'Refund')}>
                <SelectTrigger aria-label="Booking type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Reissue">Reissue</SelectItem>
                  <SelectItem value="Refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="booking-invoice-number">Invoice#</Label>
              <Input
                id="booking-invoice-number"
                aria-label="Invoice number"
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
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
            {passengers.map((passenger, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="relative flex-1">
                  <Input
                    aria-label={index === 0 ? 'Passenger name' : `Passenger name ${index + 1}`}
                    value={passenger.name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    onKeyDown={search?.index === index ? handleNameKeyDown : undefined}
                    placeholder="Passenger Name (type 3+ letters to search)"
                    required
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
                  {isNameListOpen(index) && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border bg-popover text-popover-foreground shadow">
                      {/* "+ Add new customer" pinned above the (scrollable) matches so it never sinks
                          below a long result list; max-h-48 ≈ 6 rows visible, the rest scroll. */}
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
                      {matches.length > 0 && (
                        <ul id={`passenger-listbox-${index}`} role="listbox" className="max-h-48 overflow-y-auto">
                          {matches.map((m, matchIndex) => (
                            <li
                              key={m.id}
                              id={`passenger-listbox-${index}-${matchIndex}`}
                              role="option"
                              aria-selected={matchIndex === nameActiveIndex}
                              className={cn(
                                'cursor-pointer px-3 py-1',
                                matchIndex === nameActiveIndex && 'bg-accent'
                              )}
                              onMouseEnter={() => setNameActiveIndex(matchIndex)}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectMatch(index, `${m.firstName} ${m.lastName}`)}
                            >
                              {m.firstName} {m.lastName}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPassengers((rows) => [...rows, { ...EMPTY_PASSENGER }])}
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
                <Input
                  id="booking-pnr"
                  aria-label="PNR"
                  value={form.pnr}
                  onChange={(e) => setForm({ ...form, pnr: e.target.value })}
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
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="booking-arr-date">Arrival Date</Label>
                  <DateField
                    id="booking-arr-date"
                    ariaLabel="Arrival Date"
                    value={form.arrDate}
                    onChange={(iso) => setForm({ ...form, arrDate: iso })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Row: Remark */}
          <div className="space-y-1">
            <Label htmlFor="booking-remark">Remark</Label>
            <Input
              id="booking-remark"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
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
          {createMutation.isError && (
            <p className="text-sm text-destructive">Save failed. Check your connection and try again.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Create booking'}
            </Button>
          </DialogFooter>
        </form>
        ) : (
          <>
            <div className="w-1/3 space-y-1 pr-2">
              <Label>Booking Type</Label>
              <Select value={bookingKind} onValueChange={(v) => setBookingKind(v as 'New' | 'Reissue' | 'Refund')}>
                <SelectTrigger aria-label="Booking type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Reissue">Reissue</SelectItem>
                  <SelectItem value="Refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AdjustmentBookingForm
              key={bookingKind}
              bookingType={bookingKind}
              onDone={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </>
        )}
        <AddEditCustomerDialog
          open={addCustomerOpen}
          onOpenChange={setAddCustomerOpen}
          onCreated={(fullName) => {
            updatePassenger(addCustomerIndex, { name: fullName });
            setSearch(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
