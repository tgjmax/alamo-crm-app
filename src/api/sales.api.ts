import { apiClient } from './client';
import { downloadFile } from './download';

export interface SalesSummary {
  year: number;
  month: number;
  isCurrentMonth: boolean;
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

export async function getSalesSummary(year: number, month: number): Promise<SalesSummary> {
  const res = await apiClient.get<SalesSummary>('/sales/summary', { params: { year, month } });
  return res.data;
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getSalesReport(year: number, month: number): Promise<void> {
  await downloadFile(`/sales/report?year=${year}&month=${month}`, `Sales-${MONTH_ABBR[month - 1]}${year}.pdf`);
}
