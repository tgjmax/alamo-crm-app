import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CodeSearchField } from '@/components/code-search-field';
import { DateField } from '@/components/date-field';
import { searchAirlines, searchAirports } from '@/api/flightData.api';
import { EnquiryFareOption, EnquirySegment } from '@/api/enquiries.api';

interface FareOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, edits this option; otherwise creates a new one. */
  initial?: EnquiryFareOption | null;
  onSave: (option: EnquiryFareOption) => void;
}

interface SegmentForm {
  from: string;
  to: string;
  date: string;
  departTime: string;
  arriveTime: string;
}

const EMPTY_SEGMENT: SegmentForm = { from: '', to: '', date: '', departTime: '', arriveTime: '' };

export function FareOptionDialog({ open, onOpenChange, initial, onSave }: FareOptionDialogProps) {
  const [airlineName, setAirlineName] = useState('');
  const [airlineCode, setAirlineCode] = useState<string | undefined>(undefined);
  const [price, setPrice] = useState('');
  const [baggageNotes, setBaggageNotes] = useState('');
  const [segments, setSegments] = useState<SegmentForm[]>([{ ...EMPTY_SEGMENT }]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setAirlineName(initial.airlineName);
      setAirlineCode(initial.airlineCode);
      setPrice(String(initial.pricePerPax));
      setBaggageNotes(initial.baggageNotes ?? '');
      setSegments(
        initial.segments.map((s) => ({
          from: s.from,
          to: s.to,
          date: s.date,
          departTime: s.departTime ?? '',
          arriveTime: s.arriveTime ?? '',
        }))
      );
    } else {
      setAirlineName('');
      setAirlineCode(undefined);
      setPrice('');
      setBaggageNotes('');
      setSegments([{ ...EMPTY_SEGMENT }]);
    }
  }, [open, initial]);

  function updateSegment(index: number, patch: Partial<SegmentForm>) {
    setSegments((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const option: EnquiryFareOption = {
      airlineCode,
      airlineName,
      pricePerPax: Number(price),
      baggageNotes: baggageNotes || undefined,
      segments: segments.map(
        (s): EnquirySegment => ({
          from: s.from,
          to: s.to,
          date: s.date,
          departTime: s.departTime || undefined,
          arriveTime: s.arriveTime || undefined,
        })
      ),
    };
    onSave(option);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit fare option' : 'Add fare option'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="fare-airline">Airline</Label>
              <CodeSearchField
                id="fare-airline"
                ariaLabel="Airline"
                value={airlineName}
                onChange={(value) => {
                  setAirlineName(value);
                  setAirlineCode(undefined); // free-typed text has no code until a suggestion is picked
                }}
                onPick={(option) => {
                  setAirlineName(option.label);
                  setAirlineCode(option.code);
                }}
                search={searchAirlines}
                queryKey="airlines"
                placeholder="e.g. Qatar or QR"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fare-price">Price per passenger</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground">$</span>
                <Input
                  id="fare-price"
                  aria-label="Price per passenger"
                  type="number"
                  min={0}
                  step="0.01"
                  className="pl-6"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Segments</p>
            {segments.map((segment, index) => (
              <div key={index} className="flex items-start gap-2">
                <CodeSearchField
                  ariaLabel={`Segment ${index + 1} from`}
                  value={segment.from}
                  onChange={(from) => updateSegment(index, { from })}
                  search={searchAirports}
                  queryKey="airports"
                  placeholder="From"
                  required
                />
                <CodeSearchField
                  ariaLabel={`Segment ${index + 1} to`}
                  value={segment.to}
                  onChange={(to) => updateSegment(index, { to })}
                  search={searchAirports}
                  queryKey="airports"
                  placeholder="To"
                  required
                />
                <div className="w-40 shrink-0">
                  <DateField
                    ariaLabel={`Segment ${index + 1} date`}
                    value={segment.date}
                    onChange={(date) => updateSegment(index, { date })}
                  />
                </div>
                <Input
                  aria-label={`Segment ${index + 1} depart time`}
                  type="time"
                  className="w-28"
                  value={segment.departTime}
                  onChange={(e) => updateSegment(index, { departTime: e.target.value })}
                />
                <Input
                  aria-label={`Segment ${index + 1} arrive time`}
                  type="time"
                  className="w-28"
                  value={segment.arriveTime}
                  onChange={(e) => updateSegment(index, { arriveTime: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove segment ${index + 1}`}
                  disabled={segments.length === 1}
                  onClick={() => setSegments((rows) => rows.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => setSegments((rows) => [...rows, { ...EMPTY_SEGMENT }])}>
              Add segment
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="fare-baggage">Baggage notes</Label>
            <Textarea
              id="fare-baggage"
              aria-label="Baggage notes"
              rows={2}
              value={baggageNotes}
              onChange={(e) => setBaggageNotes(e.target.value)}
              placeholder={'One line per note, e.g.\nNo check-in baggage included -  $65 per baggage.'}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save option</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
