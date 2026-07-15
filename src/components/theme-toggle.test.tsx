import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useThemeStore } from '../stores/themeStore';
import { ThemeMenuItems } from './theme-toggle';

afterEach(() => {
  useThemeStore.setState({ theme: 'system' });
  localStorage.clear();
});

function renderMenu() {
  return render(
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger>menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('ThemeMenuItems', () => {
  it('exposes the Theme submenu trigger', () => {
    renderMenu();
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('opens the submenu and lets the user pick Dark, calling setTheme', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByText('Theme'));
    fireEvent.click(await screen.findByText('Dark'));
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});
