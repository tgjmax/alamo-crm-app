import { useState } from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { summarizePax } from '@/utils/tripFormat';

export type PassengerCounts = { adults: number; children: number; infants: number };

interface PassengerCountFieldProps {
  value: PassengerCounts;
  onChange: (value: PassengerCounts) => void;
}

type PaxKey = keyof PassengerCounts;

/** Infants sit on a lap, so they can never outnumber the adults holding them. Adults themselves
 * can't drop below 1 — an enquiry with no adult passenger isn't a trip anyone can book. */
const MINIMUMS: Record<PaxKey, number> = { adults: 1, children: 0, infants: 0 };

const ROWS: { key: PaxKey; label: string; caption?: string }[] = [
  { key: 'adults', label: 'Adults' },
  { key: 'children', label: 'Children', caption: 'Ages 2 to 11' },
  { key: 'infants', label: 'Infants on Lap', caption: 'Under 2' },
];

export function PassengerCountField({ value, onChange }: PassengerCountFieldProps) {
  const [open, setOpen] = useState(false);

  function step(key: PaxKey, delta: number) {
    const next = { ...value, [key]: Math.max(MINIMUMS[key], value[key] + delta) };
    // An infant on a lap needs an adult lap to sit on.
    if (next.infants > next.adults) next.infants = next.adults;
    onChange(next);
  }

  function maxedOut(key: PaxKey): boolean {
    return key === 'infants' && value.infants >= value.adults;
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label="Passengers"
          className="w-full justify-start gap-2 font-normal"
        >
          <Users className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{summarizePax(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="divide-y">
          {ROWS.map(({ key, label, caption }) => (
            <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <div className="text-sm font-medium">{label}</div>
                {caption && <div className="text-xs text-muted-foreground">{caption}</div>}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label={`Remove ${label}`}
                  className="size-8 rounded-full"
                  disabled={value[key] <= MINIMUMS[key]}
                  onClick={() => step(key, -1)}
                >
                  <Minus className="size-4" />
                </Button>
                <span aria-label={`${label} count`} className="w-4 text-center text-sm tabular-nums">
                  {value[key]}
                </span>
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  aria-label={`Add ${label}`}
                  className="size-8 rounded-full"
                  disabled={maxedOut(key)}
                  onClick={() => step(key, 1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end p-3">
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
