import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A spinning indicator. Decorative by default (aria-hidden) — the button text beside it carries
 * the accessible state. Pass `label` only when the spinner stands ALONE with no adjacent text, to
 * expose a status role/name. Inside a <Button> it inherits size-4 + gap-2 from the button's [&_svg]
 * rules, so `<Button><Spinner />Saving…</Button>` needs no extra layout. */
export function Spinner({
  label,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & { label?: string }) {
  return (
    <Loader2
      {...(label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true })}
      className={cn('animate-spin', className)}
      {...props}
    />
  );
}
