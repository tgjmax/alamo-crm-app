import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  /** Names the show/hide button, e.g. "current password" -> "Show current password".
   * Distinct per field so several password inputs on one page stay unambiguous. */
  fieldLabel?: string;
}

/** A password Input with a show/hide toggle. The `id` still carries the accessible name from a
 * sibling <Label>, so `getByLabelText` and autofill keep working exactly like a plain input. */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, fieldLabel = 'password', ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const Icon = visible ? EyeOff : Eye;

    return (
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-9', className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={`${visible ? 'Hide' : 'Show'} ${fieldLabel}`}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          disabled={props.disabled}
        >
          <Icon className="size-4" />
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
