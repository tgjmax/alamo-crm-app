import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesSummary } from '../api/sales.api';
import { BookingsTable } from '@/components/bookings/bookings-table';
import { MonthToggle, MonthValue } from '@/components/sales/month-toggle';
import { SalesSummaryCards } from '@/components/sales/sales-summary-cards';

function currentPeriod(): MonthValue {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export default function SalesPage() {
  const [period, setPeriod] = useState<MonthValue>(currentPeriod);

  const { data: summary } = useQuery({
    queryKey: ['sales', 'summary', period],
    queryFn: () => getSalesSummary(period.year, period.month),
  });

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Sales</h2>
        <MonthToggle value={period} onChange={setPeriod} />
      </div>

      <SalesSummaryCards summary={summary} />

      <BookingsTable scope={{ year: period.year, month: period.month }} queryKeyPrefix="sales" defaultPageSize={15} />
    </div>
  );
}
