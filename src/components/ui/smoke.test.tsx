import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

describe('shadcn foundation smoke test', () => {
  it('renders a shadcn Button with accessible role and text', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders a shadcn Input that forwards aria-label', () => {
    render(<Input aria-label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
