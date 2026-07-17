import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label } from './label';
import { Input } from './input';

describe('Label required asterisk', () => {
  it('renders no asterisk by default', () => {
    render(<Label>First name</Label>);
    expect(screen.getByText('First name').textContent).toBe('First name');
    expect(document.querySelector('.text-destructive')).toBeNull();
  });

  it('renders an aria-hidden required mark when required', () => {
    const { container } = render(<Label required>First name</Label>);
    const mark = container.querySelector('.text-destructive');
    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    // Asterisk is a CSS ::after pseudo-element (not a text node), so it never
    // enters textContent — that is what keeps getByLabelText('First name') working.
    expect(mark?.className).toContain("after:content-['*']");
  });

  it('keeps the input accessible name free of the asterisk (getByLabelText still works)', () => {
    render(
      <>
        <Label htmlFor="fn" required>First name</Label>
        <Input id="fn" />
      </>,
    );
    // Would throw if the asterisk leaked into the accessible name as "First name *".
    expect(screen.getByLabelText('First name')).toBeInTheDocument();
  });
});
