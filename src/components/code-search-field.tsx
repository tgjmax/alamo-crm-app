import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';

export interface CodeOption {
  /** The short code that gets stored (e.g. 'ORD', 'QR'). */
  code: string;
  /** Main dropdown line, shown as "label (CODE)" (e.g. "Chicago O'Hare International Airport (ORD)"). */
  label: string;
  /** Optional second line, shown smaller and italic (e.g. "Chicago, United States"). */
  sublabel?: string;
}

interface CodeSearchFieldProps {
  id?: string;
  ariaLabel: string;
  /** The stored value — free text; picking a suggestion replaces it with the option's code. */
  value: string;
  onChange: (value: string) => void;
  /** Server-side search (debounced 300 ms, fired from the first character). */
  search: (q: string) => Promise<CodeOption[]>;
  /** Distinguishes React Query cache entries between fields using different search functions. */
  queryKey: string;
  placeholder?: string;
  required?: boolean;
  /** Fired (after onChange with the code) when a suggestion is picked — gives callers the full option
   * so they can also store the label (e.g. airline name + code). */
  onPick?: (option: CodeOption) => void;
}

/** A free-text input with server-backed autocomplete over a code dataset (airports, airlines).
 * Picking a suggestion stores the CODE; anything can still be typed by hand. */
export function CodeSearchField({ id, ariaLabel, value, onChange, search, queryKey, placeholder, required, onPick }: CodeSearchFieldProps) {
  // null = list closed (nothing typed since last pick); string = active search text.
  const [query, setQuery] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query ?? ''), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: matches = [] } = useQuery({
    queryKey: [queryKey, 'code-search', debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: query !== null && debouncedQuery.trim().length >= 1,
  });

  function pick(option: CodeOption) {
    onChange(option.code);
    onPick?.(option);
    setQuery(null);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
        }}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
      />
      {query !== null && matches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-80 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow">
          {matches.map((option) => (
            <li
              key={`${option.code}-${option.label}`}
              className="cursor-pointer px-3 py-1 hover:bg-accent"
              onClick={() => pick(option)}
            >
              <div className="truncate text-xs" title={`${option.label} (${option.code})`}>
                {option.label} ({option.code})
              </div>
              {option.sublabel && <div className="truncate text-[11px] italic text-muted-foreground">{option.sublabel}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
