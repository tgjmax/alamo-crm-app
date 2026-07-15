import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface MonthValue {
  year: number;
  month: number; // 1-12
}

interface MonthToggleProps {
  value: MonthValue;
  onChange: (next: MonthValue) => void;
  /** The latest selectable month — the agency's current month (see utils/agencyTime.ts). Passed in
   * rather than computed here so this stays a pure controlled component. */
  current: MonthValue;
}

/**
 * Month and Year are independent controls: the Month arrows step by one
 * calendar month at a time (crossing a year boundary when needed, same as a
 * normal calendar), while the Year arrows jump directly to the same month in
 * the previous/next year — the capability the combined single-stepper
 * version didn't have (you'd otherwise need 12 clicks to compare against
 * last year). Neither control ever lands on a future month (relative to
 * `current`, the agency's current month).
 */
export function MonthToggle({ value, onChange, current }: MonthToggleProps) {
  const currentYear = current.year;
  const currentMonth = current.month;

  const atCurrentMonth = value.year === currentYear && value.month === currentMonth;
  const atCurrentYear = value.year === currentYear;

  function stepMonth(delta: number) {
    let month = value.month + delta;
    let year = value.year;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    if (year > currentYear || (year === currentYear && month > currentMonth)) return;
    onChange({ year, month });
  }

  function stepYear(delta: number) {
    const year = value.year + delta;
    if (year > currentYear) return;
    const month = year === currentYear ? Math.min(value.month, currentMonth) : value.month;
    onChange({ year, month });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Previous month" onClick={() => stepMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[90px] text-center text-sm font-medium">{MONTH_NAMES[value.month - 1]}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Next month"
          disabled={atCurrentMonth}
          onClick={() => stepMonth(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Previous year" onClick={() => stepYear(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[60px] text-center text-sm font-medium">{value.year}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Next year"
          disabled={atCurrentYear}
          onClick={() => stepYear(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
