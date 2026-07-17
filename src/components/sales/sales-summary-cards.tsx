import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
          {summary ? (
            <p className="text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {formatCurrency(summary.revenue)}
            </p>
          ) : (
            <Skeleton data-testid="summary-skeleton" className="h-7 w-24" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">vs Last Month</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <>
              <p className={`text-2xl font-semibold tabular-nums ${pctColorClass(summary.lastMonthChangePct)}`}>
                {formatPct(summary.lastMonthChangePct)}
              </p>
              <p className="text-xs text-muted-foreground">{formatCurrency(summary.lastMonthRevenue)}</p>
            </>
          ) : (
            <Skeleton data-testid="summary-skeleton" className="h-7 w-24" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">vs Last Year</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <>
              <p className={`text-2xl font-semibold tabular-nums ${pctColorClass(summary.lastYearChangePct)}`}>
                {formatPct(summary.lastYearChangePct)}
              </p>
              <p className="text-xs text-muted-foreground">{formatCurrency(summary.lastYearRevenue)}</p>
            </>
          ) : (
            <Skeleton data-testid="summary-skeleton" className="h-7 w-24" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Top Airline</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <>
              <p className="text-2xl font-semibold">{summary.topAirline ? summary.topAirline.code : '—'}</p>
              <p className="text-xs text-muted-foreground">
                {summary.topAirline ? `${summary.topAirline.count} bookings` : ''}
              </p>
            </>
          ) : (
            <Skeleton data-testid="summary-skeleton" className="h-7 w-24" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Refunds</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <p className="text-2xl font-semibold tabular-nums">{summary.refundCount}</p>
          ) : (
            <Skeleton data-testid="summary-skeleton" className="h-7 w-24" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Booking Value</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <p className="text-2xl font-semibold tabular-nums">{formatCurrency(summary.avgBookingValue)}</p>
          ) : (
            <Skeleton data-testid="summary-skeleton" className="h-7 w-24" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(summary.pendingAmount)}</p>
              <p className="text-xs text-muted-foreground">{`${summary.pendingCount} bookings`}</p>
            </>
          ) : (
            <Skeleton data-testid="summary-skeleton" className="h-7 w-24" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
