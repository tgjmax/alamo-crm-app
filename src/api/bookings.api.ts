import { apiClient } from './client';
import { downloadFile } from './download';

export interface PaymentInput {
  status: 'paid' | 'pending';
  type: 'card' | 'check' | 'cash';
  paidOn?: string;
}

export interface PassengerInput {
  passengerName: string;
  amount: number;
  customer?: string;
}

export interface CreateBookingInput {
  invoiceNumber: string;
  bookingDate: string;
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

export interface BookingListItem {
  id: string;
  invoiceNumber: string;
  bookingDate: string;
  pnr?: string;
  airlineCode?: string;
  depCity?: string;
  arrCity?: string;
  depDate?: string;
  arrDate?: string;
  remark?: string;
  payment?: PaymentInput;
  passengers: PassengerListItem[];
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

export interface BookingListPage {
  bookings: BookingListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listBookings(page = 1): Promise<BookingListPage> {
  const res = await apiClient.get<BookingListPage>('/bookings', { params: { page } });
  return res.data;
}

export async function addPassenger(bookingId: string, input: PassengerInput): Promise<PassengerListItem> {
  const res = await apiClient.post<PassengerListItem>(`/bookings/${bookingId}/passengers`, input);
  return res.data;
}

export interface AdjustmentInput {
  bookingType: 'Reissue' | 'Refund';
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

export interface ImportBookingRow {
  bookingType: 'New' | 'Reissue' | 'Refund';
  bookingDate: string;
  invoiceNumber?: string;
  passengerName: string;
  amount: number;
  pnr?: string;
  airlineCode?: string;
  depCity?: string;
  arrCity?: string;
  depDate?: string;
  arrDate?: string;
  remark?: string;
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
