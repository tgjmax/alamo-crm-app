import { apiClient } from './client';

export const ENQUIRY_STATUSES = ['New', 'Quoted', 'Booked', 'Closed'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export interface EnquirySegment {
  from: string;
  to: string;
  date: string; // YYYY-MM-DD
  departTime?: string; // HH:mm
  arriveTime?: string;
}

export interface EnquiryFareOption {
  airlineCode?: string;
  airlineName: string;
  pricePerPax: number;
  baggageNotes?: string;
  segments: EnquirySegment[];
}

export interface EnquiryTrip {
  from?: string;
  to?: string;
  tripType: 'oneway' | 'round';
  travelDate?: string;
  returnDate?: string;
  dateFlexibility?: string;
  paxCount?: number;
}

export interface Enquiry {
  id: string;
  enquirer: { name: string; phone?: string; email?: string };
  trip: EnquiryTrip;
  notes?: string;
  status: EnquiryStatus;
  fareOptions: EnquiryFareOption[];
  quoteSentAt: string | null;
  createdAt: string;
}

export interface CreateEnquiryInput {
  enquirer: Enquiry['enquirer'];
  trip?: Partial<EnquiryTrip>;
  notes?: string;
}

export interface UpdateEnquiryInput extends Partial<CreateEnquiryInput> {
  status?: EnquiryStatus;
  fareOptions?: EnquiryFareOption[];
}

export interface EnquiryListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: EnquiryStatus;
}

export interface EnquiryPage {
  enquiries: Enquiry[];
  total: number;
  page: number;
  pageSize: number;
}

export const ENQUIRY_PAGE_SIZES = [10, 25, 50, 100] as const;

export async function listEnquiries(params: EnquiryListParams = {}): Promise<EnquiryPage> {
  const res = await apiClient.get<EnquiryPage>('/enquiries', { params });
  return res.data;
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<Enquiry> {
  const res = await apiClient.post<Enquiry>('/enquiries', input);
  return res.data;
}

export async function getEnquiry(id: string): Promise<Enquiry> {
  const res = await apiClient.get<Enquiry>(`/enquiries/${id}`);
  return res.data;
}

export async function updateEnquiry(id: string, input: UpdateEnquiryInput): Promise<Enquiry> {
  const res = await apiClient.patch<Enquiry>(`/enquiries/${id}`, input);
  return res.data;
}

export async function deleteEnquiry(id: string): Promise<void> {
  await apiClient.delete(`/enquiries/${id}`);
}

export async function sendEnquiryQuote(
  id: string,
  input: { toEmail: string; optionIndexes: number[]; personalMessage?: string }
): Promise<{ sent: boolean }> {
  const res = await apiClient.post<{ sent: boolean }>(`/enquiries/${id}/send-quote`, input);
  return res.data;
}
