import { useEffect, useRef } from 'react';
import { SortingState, VisibilityState } from '@tanstack/react-table';
import { toast } from 'sonner';
import { GroupSortBy, GroupView, updateGroupView } from '@/api/groups.api';

const SAVE_DEBOUNCE_MS = 600;

function toHiddenColumns(columnVisibility: VisibilityState): string[] {
  return Object.entries(columnVisibility)
    .filter(([, visible]) => visible === false)
    .map(([id]) => id);
}

function toSort(sorting: SortingState): GroupView['sort'] {
  const [first] = sorting;
  return first ? { id: first.id as GroupSortBy, desc: first.desc } : undefined;
}

/** Debounced auto-save of a group's column visibility + sort, ONLY when the current user can write
 * to the group (its owner, or an admin) — mirrors the backend's ownership gate on
 * PATCH /groups/:id/view exactly. A no-op for anyone else: their table interactions must never
 * attempt a write that would 404. */
export function useGroupView(
  groupId: string,
  canPersist: boolean,
  columnVisibility: VisibilityState,
  sorting: SortingState
): void {
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Skip the save that would otherwise fire the instant this hook mounts with its SEEDED
    // (already-saved) values — there is nothing new to persist yet. Resets correctly on every
    // remount since a ref is fresh per component instance, matching the key={group.id} remount
    // this hook's consumer uses when switching groups.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (!canPersist) return;

    const timer = setTimeout(() => {
      const view: GroupView = { hiddenColumns: toHiddenColumns(columnVisibility), sort: toSort(sorting) };
      // A shared-but-non-owner request would 404, but canPersist already prevents this from firing
      // (the .catch is defence in depth). A genuine failure IS surfaced — this background save is the
      // same class as the dashboard layout save, which toasts; a silently-lost view change leaves the
      // user believing their columns/sort stuck when they didn't.
      void updateGroupView(groupId, view).catch(() =>
        toast.error('Could not save your view. Your column and sort changes may not persist.')
      );
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [groupId, canPersist, columnVisibility, sorting]);
}
