import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CABIN_CLASSES, CabinClass } from '@/api/enquiries.api';
import { CABIN_ABBREVIATIONS } from '@/utils/tripFormat';

interface CabinSelectFieldProps {
  value: CabinClass[];
  onChange: (cabins: CabinClass[]) => void;
}

/** Multi-select over the four cabin classes. Picks render as removable 3-letter cards below the
 * trigger, matching how preferred airlines display their codes. An empty selection is a valid
 * "any cabin" answer, not a missing value. */
export function CabinSelectField({ value, onChange }: CabinSelectFieldProps) {
  const [open, setOpen] = useState(false);

  function toggle(cabin: CabinClass, checked: boolean) {
    onChange(checked ? [...value, cabin] : value.filter((c) => c !== cabin));
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label="Cabin"
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {value.length === 0 ? 'All cabins' : `${value.length} selected`}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          {CABIN_CLASSES.map((cabin) => (
            <div key={cabin} className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent">
              <Checkbox
                id={`enquiry-cabin-${cabin}`}
                aria-label={cabin}
                checked={value.includes(cabin)}
                onCheckedChange={(checked) => toggle(cabin, checked === true)}
              />
              <Label htmlFor={`enquiry-cabin-${cabin}`} className="flex-1 cursor-pointer font-normal">
                {cabin}
              </Label>
            </div>
          ))}
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {value.map((cabin) => (
            <Badge key={cabin} variant="secondary" className="gap-1" title={cabin}>
              {CABIN_ABBREVIATIONS[cabin]}
              <button
                type="button"
                aria-label={`Remove ${cabin}`}
                onClick={() => toggle(cabin, false)}
                className="rounded-full hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
