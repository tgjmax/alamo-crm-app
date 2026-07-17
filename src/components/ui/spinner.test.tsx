import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('renders a decorative spinning svg with no status role by default', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg.animate-spin');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('merges a caller className on the decorative default', () => {
    const { container } = render(<Spinner className="size-8" />);
    expect(container.querySelector('svg.animate-spin')).toHaveClass('size-8');
  });

  it('exposes a status role with the given accessible name when label is passed', () => {
    render(<Spinner label="Loading" />);
    const status = screen.getByRole('status', { name: /loading/i });
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass('animate-spin');
    expect(status).not.toHaveAttribute('aria-hidden');
  });
});
