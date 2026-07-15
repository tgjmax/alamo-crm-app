import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { getSalesReport, getSalesSummary } from '../api/sales.api';
import { BookingsTable } from '@/components/bookings/bookings-table';
import { Button } from '@/components/ui/button';
import { MonthToggle, MonthValue } from '@/components/sales/month-toggle';
import { SalesSummaryCards } from '@/components/sales/sales-summary-cards';
import { useBranding } from '@/hooks/useBranding';
import { useAuthStore } from '@/stores/authStore';
import { agencyYearMonth } from '@/utils/agencyTime';
import { canViewSalesReports } from '@/utils/permissions';

export default function SalesPage() {
  const { timeZone } = useBranding();
  // Open on the AGENCY's current month, not the viewer's or UTC's — see utils/agencyTime.ts.
  // Seeded once; the picker is the user's from then on. Branding is warm from login, so `timeZone`
  // is the real zone by the time this mounts (the fallback would only bite in a boundary window).
  const [period, setPeriod] = useState<MonthValue>(() => agencyYearMonth(timeZone));
  const user = useAuthStore((s) => s.user);
  const [downloading, setDownloading] = useState(false);
  const canReport = canViewSalesReports(user);

  const { data: summary } = useQuery({
    queryKey: ['sales', 'summary', period],
    queryFn: () => getSalesSummary(period.year, period.month),
  });

  async function handlePrint(): Promise<void> {
    setDownloading(true);
    try {
      await getSalesReport(period.year, period.month);
    } catch {
      toast.error('Could not generate the report. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Sales</h2>
        <div className="flex items-center gap-2">
          {canReport && (
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={downloading}>
              <Printer className="mr-2 size-4" />
              {downloading ? 'Preparing…' : 'Print report'}
            </Button>
          )}
          <MonthToggle value={period} onChange={setPeriod} current={agencyYearMonth(timeZone)} />
        </div>
      </div>

      <SalesSummaryCards summary={summary} />

      <BookingsTable scope={{ year: period.year, month: period.month }} queryKeyPrefix="sales" defaultPageSize={15} />
    </div>
  );
}
