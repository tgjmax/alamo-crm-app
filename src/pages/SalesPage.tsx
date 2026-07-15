import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesSummary } from '../api/sales.api';
import { BookingsTable } from '@/components/bookings/bookings-table';
import { MonthToggle, MonthValue } from '@/components/sales/month-toggle';
import { SalesSummaryCards } from '@/components/sales/sales-summary-cards';
import { useBranding } from '@/hooks/useBranding';
import { agencyYearMonth } from '@/utils/agencyTime';

export default function SalesPage() {
  const { timeZone } = useBranding();
  // Open on the AGENCY's current month, not the viewer's or UTC's — see utils/agencyTime.ts.
  // Seeded once; the picker is the user's from then on. Branding is warm from login, so `timeZone`
  // is the real zone by the time this mounts (the fallback would only bite in a boundary window).
  const [period, setPeriod] = useState<MonthValue>(() => agencyYearMonth(timeZone));

  const { data: summary } = useQuery({
    queryKey: ['sales', 'summary', period],
    queryFn: () => getSalesSummary(period.year, period.month),
  });

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Sales</h2>
        <MonthToggle value={period} onChange={setPeriod} current={agencyYearMonth(timeZone)} />
      </div>

      <SalesSummaryCards summary={summary} />

      <BookingsTable scope={{ year: period.year, month: period.month }} queryKeyPrefix="sales" defaultPageSize={15} />
    </div>
  );
}
