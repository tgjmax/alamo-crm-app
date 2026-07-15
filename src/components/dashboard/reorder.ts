import { arrayMove } from '@dnd-kit/sortable';

/** Pure reorder used by the dashboard's drag handler — a mouse drop and a keyboard drop both route
 * through it, so the ordering logic is unit-testable without a dnd runtime. */
export function reorder(ids: string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return ids;
  return arrayMove(ids, from, to);
}
