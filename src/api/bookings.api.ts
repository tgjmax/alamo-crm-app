import { apiClient } from './client';
import { downloadFile } from './download';

export interface PaymentInput {
  status: 'paid' | 'pending';
  type: 'card' | 'check' | 'cash';
  paidOn?: string;
  amount: number;
}

export interface PassengerInput {
  passengerName: string;
  amount: number;
  customer?: string;
}

export interface CreateBookingInput {
  invoiceNumber: string;
  bookingDate: string;
  voided?: boolean;
  pnr?: string;
  airlineCode?: string;
  depCity?: string;
  arrCity?: string;
  depDate?: string;
  arrDate?: string;
  remark?: string;
  payment?: PaymentInput;
  passengers: PassengerInput[];
}

export interface PassengerListItem {
  id: string;
  passengerName: string;
  amount: number;
}

export interface CreateBookingResponse {
  id: string;
  invoiceNumber: string;
  passengers: PassengerListItem[];
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResponse> {
  const res = await apiClient.post<CreateBookingResponse>('/bookings', input);
  return res.data;
}

/** One flattened row per passenger (New, Reissue, or Refund) — `id` is the passenger id. */
export interface BookingRow {
  id: string;
  bookingDate: string;
  invoiceNumber: string;
  passengerName: string;
  amount: number;
  pnr?: string;
  airlineCode?: string;
  depCity?: string;
  arrCity?: string;
  depDate?: string;
  arrDate?: string;
  paymentStatus?: 'paid' | 'pending';
  paymentAmount?: number;
  paymentType?: 'card' | 'check' | 'cash';
  paymentPaidOn?: string;
  voided?: boolean;
  bookingType: 'New' | 'Reissue' | 'Refund';
  /** The underlying Booking's id — present only on New rows (payment lives on the Booking,
   * not the passenger, for those). Undefined on Reissue/Refund rows, which use `id` (their
   * own passenger id) directly instead. */
  bookingId?: string;
  remark?: string;
}

export interface BookingRowPage {
  bookings: BookingRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const BOOKING_PAGE_SIZES = [10, 15, 25, 50, 100] as const;

export type DateRangeOperator = 'before' | 'after' | 'between';

export interface DateRangeParam {
  operator: DateRangeOperator;
  from?: string;
  to?: string;
}

export type BookingSortBy =
  | 'date' | 'invoiceNumber' | 'passengerName' | 'amount' | 'pnr' | 'airlineCode'
  | 'depCity' | 'arrCity' | 'depDate' | 'arrDate';

export interface BookingListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  paymentStatus?: 'paid' | 'pending';
  airlineCode?: string;
  depDate?: DateRangeParam;
  arrDate?: DateRangeParam;
  year?: number;
  month?: number;
  voided?: boolean;
  sortBy?: BookingSortBy;
  sortDir?: 'asc' | 'desc';
}

export async function listBookings(params: BookingListParams = {}): Promise<BookingRowPage> {
  const { depDate, arrDate, ...rest } = params;
  const query: Record<string, unknown> = { ...rest };
  if (depDate) {
    query.depDateOp = depDate.operator;
    if (depDate.from) query.depDateFrom = depDate.from;
    if (depDate.to) query.depDateTo = depDate.to;
  }
  if (arrDate) {
    query.arrDateOp = arrDate.operator;
    if (arrDate.from) query.arrDateFrom = arrDate.from;
    if (arrDate.to) query.arrDateTo = arrDate.to;
  }
  const res = await apiClient.get<BookingRowPage>('/bookings', { params: query });
  return res.data;
}

export async function addPassenger(bookingId: string, input: PassengerInput): Promise<PassengerListItem> {
  const res = await apiClient.post<PassengerListItem>(`/bookings/${bookingId}/passengers`, input);
  return res.data;
}

export async function updateBookingPayment(bookingId: string, payment: PaymentInput): Promise<void> {
  await apiClient.patch(`/bookings/${bookingId}/payment`, payment);
}

export interface AdjustmentInput {
  bookingType: 'Reissue' | 'Refund';
  bookingDate: string;
  amount: number;
  pnr: string;
  airlineCode?: string;
  depCity?: string;
  arrCity?: string;
  depDate?: string;
  arrDate?: string;
  remark?: string;
  payment: PaymentInput;
}

export interface AdjustmentResponse {
  id: string;
  bookingType: 'Reissue' | 'Refund';
  parentRef: string;
  amount: number;
}

export async function createAdjustment(passengerId: string, input: AdjustmentInput): Promise<AdjustmentResponse> {
  const res = await apiClient.post<AdjustmentResponse>(`/passengers/${passengerId}/adjustments`, input);
  return res.data;
}

export async function updatePassengerPayment(passengerId: string, payment: PaymentInput): Promise<void> {
  await apiClient.patch(`/passengers/${passengerId}/payment`, payment);
}

export interface ImportBookingRow {
  bookingType: 'New' | 'Reissue' | 'Refund';
  bookingDate: string;
  invoiceNumber?: string;
  passengerName: string;
  amount: number;
  voided?: boolean;
  pnr?: string;
  airlineCode?: string;
  depCity?: string;
  arrCity?: string;
  depDate?: string;
  arrDate?: string;
  remark?: string;
  pendingAmount?: number;
}

export interface PaymentDefault {
  status: 'paid' | 'pending';
  type: 'card' | 'check' | 'cash';
}

export interface ImportBookingResult {
  index: number;
  status: 'imported' | 'would_import' | 'needs_manual_linking' | 'failed';
  reason?: string;
}

export async function importBookings(
  rows: ImportBookingRow[],
  paymentDefault: PaymentDefault,
  dryRun: boolean
): Promise<ImportBookingResult[]> {
  const res = await apiClient.post<{ results: ImportBookingResult[] }>('/bookings/import', {
    dryRun,
    paymentDefault,
    rows,
  });
  return res.data.results;
}

export async function exportBookings(): Promise<void> {
  await downloadFile('/bookings/export', 'bookings.xlsx');
}
