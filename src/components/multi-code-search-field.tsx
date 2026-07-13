import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CodeOption } from '@/components/code-search-field';
import { useListNavigation } from '@/hooks/useListNavigation';
import { cn } from '@/lib/utils';

interface MultiCodeSearchFieldProps {
  id?: string;
  ariaLabel: string;
  /** The stored codes (e.g. ['QR', 'EK']). */
  value: string[];
  onChange: (codes: string[]) => void;
  /** Server-side search (debounced 300 ms). */
  search: (q: string) => Promise<CodeOption[]>;
  /** Distinguishes React Query cache entries between fields using different search functions. */
  queryKey: string;
  placeholder?: string;
}

/** Multi-value sibling of CodeSearchField: picks accumulate as removable chips rather than
 * replacing the input's value. Unlike CodeSearchField, free text is NOT stored — only codes
 * picked from the dropdown, since a set of preferences has no use for an unresolvable code. */
export function MultiCodeSearchField({ id, ariaLabel, value, onChange, search, queryKey, placeholder }: MultiCodeSearchFieldProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: matches = [] } = useQuery({
    queryKey: [queryKey, 'multi-code-search', debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 1,
  });

  const unpicked = matches.filter((option) => !value.includes(option.code));

  function pick(option: CodeOption) {
    if (!value.includes(option.code)) onChange([...value, option.code]);
    setQuery('');
  }

  const isOpen = unpicked.length > 0;
  const listId = id ? `${id}-listbox` : undefined;
  const { activeIndex, setActiveIndex, handleKeyDown } = useListNavigation({
    items: unpicked,
    onSelect: pick,
    onClose: () => setQuery(''),
  });

  return (
    <div className="relative">
      <Input
        id={id}
        aria-label={ariaLabel}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={isOpen && activeIndex >= 0 && listId ? `${listId}-${activeIndex}` : undefined}
      />
      {value.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {value.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1">
              {code}
              <button
                type="button"
                aria-label={`Remove ${code}`}
                onClick={() => onChange(value.filter((c) => c !== code))}
                className="rounded-full hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow"
        >
          {unpicked.map((option, index) => (
            <li
              key={`${option.code}-${option.label}`}
              id={listId ? `${listId}-${index}` : undefined}
              role="option"
              aria-selected={index === activeIndex}
              className={cn('cursor-pointer px-3 py-1', index === activeIndex && 'bg-accent')}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => e.preventDefault()}
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
