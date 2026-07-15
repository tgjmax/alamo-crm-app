import { beforeEach, describe, expect, it } from 'vitest';
import {
  THEME_STORAGE_KEY,
  readStoredTheme,
  resolveTheme,
  useThemeStore,
} from './themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ theme: readStoredTheme() });
  });

  it('defaults to system when storage is empty', () => {
    expect(readStoredTheme()).toBe('system');
  });

  it('reads a stored legal value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('ignores a garbage stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readStoredTheme()).toBe('system');
  });

  it('resolveTheme maps system by OS preference and passes literals through', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('setTheme updates state and writes through to localStorage', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
