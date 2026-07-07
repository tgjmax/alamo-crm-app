import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CopyableTextProps {
  value: string;
  /** What gets copied to the clipboard, if different from the displayed `value` (e.g. digits-only). Defaults to `value`. */
  copyValue?: string;
  maxChars?: number;
}

export function CopyableText({ value, copyValue, maxChars }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);
  const textToCopy = copyValue ?? value;

  if (!value) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span
        className={maxChars ? 'inline-block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-bottom' : undefined}
        style={maxChars ? { maxWidth: `${maxChars}ch` } : undefined}
        title={maxChars ? value : undefined}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        aria-label={`Copy ${textToCopy}`}
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
