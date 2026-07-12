import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CodeSearchField } from '@/components/code-search-field';
import { DateField } from '@/components/date-field';
import { searchAirports } from '@/api/flightData.api';
import { createEnquiry, Enquiry, updateEnquiry } from '@/api/enquiries.api';

interface EnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this enquiry instead of creating a new one. */
  enquiry?: Enquiry | null;
}

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  from: '',
  to: '',
  tripType: 'round' as 'oneway' | 'round',
  travelDate: '',
  returnDate: '',
  dateFlexibility: '',
  paxCount: '',
  notes: '',
};

export function EnquiryDialog({ open, onOpenChange, enquiry }: EnquiryDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();
  const isEdit = Boolean(enquiry);

  useEffect(() => {
    if (!open) return;
    if (enquiry) {
      setForm({
        name: enquiry.enquirer.name,
        phone: enquiry.enquirer.phone ?? '',
        email: enquiry.enquirer.email ?? '',
        from: enquiry.trip.from ?? '',
        to: enquiry.trip.to ?? '',
        tripType: enquiry.trip.tripType,
        travelDate: enquiry.trip.travelDate ?? '',
        returnDate: enquiry.trip.returnDate ?? '',
        dateFlexibility: enquiry.trip.dateFlexibility ?? '',
        paxCount: enquiry.trip.paxCount !== undefined ? String(enquiry.trip.paxCount) : '',
        notes: enquiry.notes ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, enquiry]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        enquirer: { name: form.name, phone: form.phone || undefined, email: form.email || undefined },
        trip: {
          from: form.from || undefined,
          to: form.to || undefined,
          tripType: form.tripType,
          travelDate: form.travelDate || undefined,
          returnDate: form.tripType === 'round' ? form.returnDate || undefined : undefined,
          dateFlexibility: form.dateFlexibility || undefined,
          paxCount: form.paxCount ? Number(form.paxCount) : undefined,
        },
        notes: form.notes || undefined,
      };
      return enquiry ? updateEnquiry(enquiry.id, payload) : createEnquiry(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      onOpenChange(false);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit enquiry' : 'New enquiry'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="enquiry-name">Enquirer name</Label>
              <Input
                id="enquiry-name"
                aria-label="Enquirer name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="enquiry-phone">Phone</Label>
              <Input
                id="enquiry-phone"
                aria-label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="enquiry-email">Email</Label>
              <Input
                id="enquiry-email"
                aria-label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="enquiry-from">From</Label>
              <CodeSearchField
                id="enquiry-from"
                ariaLabel="From"
                value={form.from}
                onChange={(from) => setForm({ ...form, from })}
                search={searchAirports}
                queryKey="airports"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="enquiry-to">To</Label>
              <CodeSearchField
                id="enquiry-to"
                ariaLabel="To"
                value={form.to}
                onChange={(to) => setForm({ ...form, to })}
                search={searchAirports}
                queryKey="airports"
              />
            </div>
            <div className="space-y-1">
              <Label>Trip type</Label>
              <Select
                value={form.tripType}
                onValueChange={(v) => setForm({ ...form, tripType: v as 'oneway' | 'round' })}
              >
                <SelectTrigger aria-label="Trip type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Round trip</SelectItem>
                  <SelectItem value="oneway">One-way</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="enquiry-travel-date">Travel date</Label>
              <DateField
                id="enquiry-travel-date"
                ariaLabel="Travel date"
                value={form.travelDate}
                onChange={(travelDate) => setForm({ ...form, travelDate })}
              />
            </div>
            {form.tripType === 'round' && (
              <div className="space-y-1">
                <Label htmlFor="enquiry-return-date">Return date</Label>
                <DateField
                  id="enquiry-return-date"
                  ariaLabel="Return date"
                  value={form.returnDate}
                  onChange={(returnDate) => setForm({ ...form, returnDate })}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="enquiry-flexibility">Date flexibility</Label>
              <Input
                id="enquiry-flexibility"
                aria-label="Date flexibility"
                value={form.dateFlexibility}
                onChange={(e) => setForm({ ...form, dateFlexibility: e.target.value })}
                placeholder="e.g. ±3 days"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="enquiry-pax">Passengers</Label>
              <Input
                id="enquiry-pax"
                aria-label="Passengers"
                type="number"
                min={1}
                value={form.paxCount}
                onChange={(e) => setForm({ ...form, paxCount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="enquiry-notes">Notes</Label>
            <Textarea
              id="enquiry-notes"
              aria-label="Notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">Save failed. Check your connection and try again.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save enquiry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
