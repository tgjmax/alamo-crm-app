import { FormEvent, useEffect, useState } from 'react';
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
import { AdjustmentBookingForm } from './adjustment-booking-form';

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
  passengerName: '',
  amount: '',
};

export function CreateBookingDialog({ open, onOpenChange }: CreateBookingDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [nameQuery, setNameQuery] = useState('');
  const [bookingKind, setBookingKind] = useState<'New' | 'Reissue' | 'Refund'>('New');
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setNameQuery('');
    setBookingKind('New');
    setAddCustomerOpen(false);
  }, [open]);

  const { data: matches = [] } = useQuery({
    queryKey: ['customers', 'search', nameQuery],
    queryFn: () => searchCustomers(nameQuery),
    enabled: nameQuery.trim().length >= 3,
  });

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onOpenChange(false);
    },
  });

  function handleNameChange(value: string) {
    setForm({ ...form, passengerName: value });
    setNameQuery(value);
  }

  function selectMatch(name: string) {
    setForm({ ...form, passengerName: name });
    setNameQuery('');
  }

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
      passengers: [{ passengerName: form.passengerName, amount: Number(form.amount) }],
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
        <div className="flex items-center gap-2">
          <Label>Booking type</Label>
          <Select value={bookingKind} onValueChange={(v) => setBookingKind(v as 'New' | 'Reissue' | 'Refund')}>
            <SelectTrigger aria-label="Booking type" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Reissue">Reissue</SelectItem>
              <SelectItem value="Refund">Refund</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {bookingKind === 'New' ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            aria-label="Invoice number"
            value={form.invoiceNumber}
            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            placeholder="Invoice number"
            required
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="booking-voided"
              checked={form.voided}
              onCheckedChange={(checked) => setForm({ ...form, voided: checked === true })}
            />
            <Label htmlFor="booking-voided">Mark as voided</Label>
          </div>
          {!form.voided && (
            <>
              <Input
                aria-label="PNR"
                value={form.pnr}
                onChange={(e) => setForm({ ...form, pnr: e.target.value })}
                placeholder="PNR"
                required
              />
              <Input
                aria-label="Airline code"
                value={form.airlineCode}
                onChange={(e) => setForm({ ...form, airlineCode: e.target.value })}
                placeholder="Airline code"
                required
              />
              <Input
                aria-label="Departure city"
                value={form.depCity}
                onChange={(e) => setForm({ ...form, depCity: e.target.value })}
                placeholder="Departure city (optional)"
              />
              <Input
                aria-label="Arrival city"
                value={form.arrCity}
                onChange={(e) => setForm({ ...form, arrCity: e.target.value })}
                placeholder="Arrival city (optional)"
              />
              <div className="space-y-2">
                <Label htmlFor="booking-dep-date">Departure date</Label>
                <Input
                  id="booking-dep-date"
                  type="date"
                  value={form.depDate}
                  onChange={(e) => setForm({ ...form, depDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-arr-date">Arrival date</Label>
                <Input
                  id="booking-arr-date"
                  type="date"
                  value={form.arrDate}
                  onChange={(e) => setForm({ ...form, arrDate: e.target.value })}
                />
              </div>
            </>
          )}
          <div className="relative">
            <Input
              aria-label="Passenger name"
              value={form.passengerName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Type at least 3 letters to search existing customers"
              required
            />
            {nameQuery.trim().length >= 3 && (
              <ul className="mt-1 rounded-md border bg-popover text-popover-foreground shadow">
                {matches.map((m) => (
                  <li
                    key={m.id}
                    className="cursor-pointer px-3 py-1 hover:bg-accent"
                    onClick={() => selectMatch(`${m.firstName} ${m.lastName}`)}
                  >
                    {m.firstName} {m.lastName}
                  </li>
                ))}
                <li>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setAddCustomerOpen(true)}
                  >
                    + Add new customer
                  </Button>
                </li>
              </ul>
            )}
          </div>
          <Input
            aria-label="Amount"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="Amount"
            required
          />
          <div className="space-y-2">
            <Label htmlFor="booking-remark">Remark</Label>
            <Input
              id="booking-remark"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>
          {!form.voided && (
            <>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Label>Payment status</Label>
                  <Select
                    value={form.paymentStatus}
                    onValueChange={(v) => setForm({ ...form, paymentStatus: v as 'paid' | 'pending' })}
                  >
                    <SelectTrigger aria-label="Payment status" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Payment type</Label>
                  <Select
                    value={form.paymentType}
                    onValueChange={(v) => setForm({ ...form, paymentType: v as 'card' | 'check' | 'cash' })}
                  >
                    <SelectTrigger aria-label="Payment type" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.paymentStatus === 'pending' && (
                <Input
                  aria-label="Amount owed"
                  type="number"
                  value={form.pendingAmount}
                  onChange={(e) => setForm({ ...form, pendingAmount: e.target.value })}
                  placeholder="Amount owed"
                  required
                />
              )}
            </>
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
          <AdjustmentBookingForm
            key={bookingKind}
            bookingType={bookingKind}
            onDone={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
        <AddEditCustomerDialog
          open={addCustomerOpen}
          onOpenChange={setAddCustomerOpen}
          onCreated={(fullName) => {
            setForm((f) => ({ ...f, passengerName: fullName }));
            setNameQuery('');
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
