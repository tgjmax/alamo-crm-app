import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currency';
import { formatPct, pctColorClass } from '@/utils/pctFormat';

/** Shape this component needs — matches (and is structurally satisfied by) the backend's SalesSummary. */
export interface SalesSummaryLike {
  revenue: number;
  lastMonthRevenue: number;
  lastMonthChangePct: number | null;
  lastYearRevenue: number;
  lastYearChangePct: number | null;
  topAirline: { code: string; count: number } | null;
  refundCount: number;
  avgBookingValue: number;
  pendingCount: number;
  pendingAmount: number;
}

interface SalesSummaryCardsProps {
  summary: SalesSummaryLike | undefined;
}

export function SalesSummaryCards({ summary }: SalesSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
            {summary ? formatCurrency(summary.revenue) : '—'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">vs Last Month</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-semibold tabular-nums ${summary ? pctColorClass(summary.lastMonthChangePct) : ''}`}>
            {summary ? formatPct(summary.lastMonthChangePct) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">{summary ? formatCurrency(summary.lastMonthRevenue) : ''}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">vs Last Year</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-semibold tabular-nums ${summary ? pctColorClass(summary.lastYearChangePct) : ''}`}>
            {summary ? formatPct(summary.lastYearChangePct) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">{summary ? formatCurrency(summary.lastYearRevenue) : ''}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Top Airline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{summary?.topAirline ? summary.topAirline.code : '—'}</p>
          <p className="text-xs text-muted-foreground">{summary?.topAirline ? `${summary.topAirline.count} bookings` : ''}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Refunds</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{summary ? summary.refundCount : '—'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Booking Value</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{summary ? formatCurrency(summary.avgBookingValue) : '—'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{summary ? formatCurrency(summary.pendingAmount) : '—'}</p>
          <p className="text-xs text-muted-foreground">{summary ? `${summary.pendingCount} bookings` : ''}</p>
        </CardContent>
      </Card>
    </div>
  );
}
