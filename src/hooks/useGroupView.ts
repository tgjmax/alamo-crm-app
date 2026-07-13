import { useEffect, useRef } from 'react';
import { SortingState, VisibilityState } from '@tanstack/react-table';
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
      // Best-effort: a shared-but-non-owner request would 404 (defence in depth — canPersist
      // already prevents this from firing), and any other failure isn't worth surfacing for a
      // silent background save.
      void updateGroupView(groupId, view).catch(() => {});
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [groupId, canPersist, columnVisibility, sorting]);
}
