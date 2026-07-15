import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useThemeStore } from '../stores/themeStore';
import { useApplyTheme, useEffectiveTheme } from './useApplyTheme';

afterEach(() => {
  useThemeStore.setState({ theme: 'system' });
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

describe('useEffectiveTheme', () => {
  it('returns the literal theme when not system', () => {
    useThemeStore.setState({ theme: 'dark' });
    const { result } = renderHook(() => useEffectiveTheme());
    expect(result.current).toBe('dark');
  });

  it('resolves system to light when the OS does not prefer dark (setupTests matchMedia: false)', () => {
    useThemeStore.setState({ theme: 'system' });
    const { result } = renderHook(() => useEffectiveTheme());
    expect(result.current).toBe('light');
  });
});

describe('useApplyTheme', () => {
  it('adds the dark class when theme is dark and removes it when light', () => {
    useThemeStore.setState({ theme: 'dark' });
    const { rerender } = renderHook(() => useApplyTheme());
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => useThemeStore.setState({ theme: 'light' }));
    rerender();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
