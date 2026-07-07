import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createBooking } from '@/api/bookings.api';
import { searchCustomers } from '@/api/customers.api';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = {
  invoiceNumber: '',
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
  passengerName: '',
  amount: '',
};

export function CreateBookingDialog({ open, onOpenChange }: CreateBookingDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [nameQuery, setNameQuery] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setNameQuery('');
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
      pnr: form.pnr || undefined,
      airlineCode: form.airlineCode || undefined,
      depCity: form.depCity || undefined,
      arrCity: form.arrCity || undefined,
      depDate: form.depDate || undefined,
      arrDate: form.arrDate || undefined,
      remark: form.remark || undefined,
      payment: { status: form.paymentStatus, type: form.paymentType },
      passengers: [{ passengerName: form.passengerName, amount: Number(form.amount) }],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            aria-label="Invoice number"
            value={form.invoiceNumber}
            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            placeholder="Invoice number"
            required
          />
          <Input
            aria-label="PNR"
            value={form.pnr}
            onChange={(e) => setForm({ ...form, pnr: e.target.value })}
            placeholder="PNR (optional)"
          />
          <Input
            aria-label="Airline code"
            value={form.airlineCode}
            onChange={(e) => setForm({ ...form, airlineCode: e.target.value })}
            placeholder="Airline code (optional)"
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
          <div className="relative">
            <Input
              aria-label="Passenger name"
              value={form.passengerName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Type at least 3 letters to search existing customers"
              required
            />
            {matches.length > 0 && (
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
      </DialogContent>
    </Dialog>
  );
}
