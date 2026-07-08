import { apiClient } from './client';

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
