import { KeyboardEvent, useEffect, useState } from 'react';

interface UseListNavigationOptions<T> {
  /** The currently visible options. Passing an empty list disables navigation. */
  items: T[];
  /** Called when the user commits the highlighted option with Enter. */
  onSelect: (item: T) => void;
  /** Called when the user dismisses the list with Escape. */
  onClose: () => void;
}

interface ListNavigation {
  /** Index of the highlighted option, or -1 when the list is empty. */
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  /** Attach to the text input that owns the list. */
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Keyboard navigation for a hand-rolled autocomplete listbox: Down/Up move the highlight
 * (wrapping at both ends), Enter commits it, Escape dismisses.
 *
 * Enter is preventDefault-ed whenever an option is highlighted — without that, a dropdown
 * inside a <form> would submit the form instead of picking the airport the user was aiming at.
 */
export function useListNavigation<T>({ items, onSelect, onClose }: UseListNavigationOptions<T>): ListNavigation {
  const [activeIndex, setActiveIndex] = useState(-1);

  // A new set of results highlights the first option, so Enter alone picks the top match.
  useEffect(() => {
    setActiveIndex(items.length > 0 ? 0 : -1);
  }, [items.length]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(activeIndex >= items.length - 1 ? 0 : activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(activeIndex <= 0 ? items.length - 1 : activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < items.length) {
      event.preventDefault();
      onSelect(items[activeIndex]);
    }
  }

  return { activeIndex, setActiveIndex, handleKeyDown };
}
