import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface IconInputProps extends React.ComponentProps<'input'> {
  /** Leading lucide icon rendered inside the input. Decorative — the field's accessible name
   * still comes from its <Label>/aria-label, so the icon is hidden from assistive tech. */
  icon: React.ReactNode;
}

/** An Input with a leading icon, matching CodeSearchField's icon treatment so a plain field and an
 * autocomplete field sitting side by side in the same form line up identically. */
export const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
  ({ icon, className, ...props }, ref) => (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:size-4"
      >
        {icon}
      </span>
      <Input ref={ref} className={cn('pl-9', className)} {...props} />
    </div>
  ),
);
IconInput.displayName = 'IconInput';
