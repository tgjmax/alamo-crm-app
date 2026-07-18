import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatDisplayDate } from '@/utils/dateFormat';

interface DateFieldProps {
  /** Accessible name — carried by the hidden native input, so label-text queries and
   * keyboard/screen-reader entry keep working exactly like a plain date input. */
  ariaLabel: string;
  /** 'YYYY-MM-DD' or '' */
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  /** Blocks submit when empty, via the hidden native input's own validation. */
  required?: boolean;
  /** Earliest selectable date, 'YYYY-MM-DD'. Omitted (the default) means any date — historic
   * bookings must stay editable, so only NEW-entry forms pass this. Applied to BOTH the calendar
   * and the hidden native input's `min`: the calendar alone would still let a keyboard or paste
   * entry through, since the native input is what actually carries the form value. */
  minDate?: string;
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** A date input that DISPLAYS 'DD-MMM-YYYY' (native `<input type="date">` display format is
 * locale-controlled and can't be changed) — a popover calendar for sighted users, backed by a
 * visually-hidden native date input that keeps the accessible name, form value, and tests. */
export function DateField({ ariaLabel, value, onChange, id, required, minDate }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  const min = minDate ? new Date(`${minDate}T00:00:00`) : undefined;

  return (
    <div className="relative">
      <input
        id={id}
        type="date"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        min={minDate}
        className="absolute h-px w-px opacity-0"
        tabIndex={-1}
      />
      {/* modal: the calendar portals OUTSIDE the parent Dialog, which disables pointer events on
          everything but itself while open — non-modal popovers are unclickable inside a dialog. */}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={`${ariaLabel} calendar`}
            className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground')}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {value ? formatDisplayDate(value) : 'dd MMM yyyy'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            disabled={min && { before: min }}
            startMonth={min}
            onSelect={(date) => {
              onChange(date ? toIso(date) : '');
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
