import { render, screen } from '@testing-library/react';
import { SalesSummaryCards, SalesSummaryLike } from './sales-summary-cards';

const SUMMARY: SalesSummaryLike = {
  revenue: 400,
  lastMonthRevenue: 200,
  lastMonthChangePct: 100,
  lastYearRevenue: 800,
  lastYearChangePct: -50,
  topAirline: { code: 'QR', count: 2 },
  refundCount: 1,
  avgBookingValue: 150,
  pendingCount: 3,
  pendingAmount: 90,
};

describe('SalesSummaryCards', () => {
  it('renders all seven card values', () => {
    render(<SalesSummaryCards summary={SUMMARY} />);
    expect(screen.getByText('$400.00')).toBeInTheDocument();
    expect(screen.getByText('+100%')).toBeInTheDocument();
    expect(screen.getByText('-50%')).toBeInTheDocument();
    expect(screen.getByText('QR')).toBeInTheDocument();
    expect(screen.getByText('2 bookings')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('$90.00')).toBeInTheDocument();
    expect(screen.getByText('3 bookings')).toBeInTheDocument();
  });

  it('renders "—" fallbacks for null changePct and a null topAirline', () => {
    render(<SalesSummaryCards summary={{ ...SUMMARY, lastMonthChangePct: null, lastYearChangePct: null, topAirline: null }} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('renders "—" placeholders while loading (summary undefined)', () => {
    render(<SalesSummaryCards summary={undefined} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('colors Total Revenue blue, a positive change green, and a negative change red', () => {
    render(<SalesSummaryCards summary={SUMMARY} />);
    expect(screen.getByText('$400.00')).toHaveClass('text-blue-600');
    expect(screen.getByText('+100%')).toHaveClass('text-green-600');
    expect(screen.getByText('-50%')).toHaveClass('text-red-600');
  });

  it('applies no color to a null or zero change', () => {
    render(<SalesSummaryCards summary={{ ...SUMMARY, lastMonthChangePct: 0, lastYearChangePct: null }} />);
    expect(screen.getByText('0%')).not.toHaveClass('text-green-600', 'text-red-600');
    expect(screen.getByText('—', { selector: 'p.text-2xl' })).not.toHaveClass('text-green-600', 'text-red-600');
  });
});
