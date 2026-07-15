import { renderHook, waitFor } from '@testing-library/react';
import { VisibilityState } from '@tanstack/react-table';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import * as groupsApi from '@/api/groups.api';
import { useGroupView } from './useGroupView';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useGroupView', () => {
  it('toasts when the background view save fails', async () => {
    vi.spyOn(groupsApi, 'updateGroupView').mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(toast, 'error');

    const { rerender } = renderHook(
      ({ vis }: { vis: VisibilityState }) => useGroupView('g1', true, vis, []),
      { initialProps: { vis: {} } }
    );
    // The first run (mount with seeded values) is skipped; a genuine change is what triggers a save.
    rerender({ vis: { remark: false } });

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/could not save/i)), {
      timeout: 2000,
    });
  });

  it('does not toast when the background view save succeeds', async () => {
    vi.spyOn(groupsApi, 'updateGroupView').mockResolvedValue({ hiddenColumns: ['remark'] });
    const errorSpy = vi.spyOn(toast, 'error');

    const { rerender } = renderHook(
      ({ vis }: { vis: VisibilityState }) => useGroupView('g1', true, vis, []),
      { initialProps: { vis: {} } }
    );
    rerender({ vis: { remark: false } });

    // Let the 600ms debounce window fully elapse, then the resolved promise settle — the only
    // reliable way to prove a toast did NOT fire (see GroupResultsPage.test.tsx's non-owner case).
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
