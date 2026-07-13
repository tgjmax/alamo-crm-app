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

export const TRIP_TYPES = ['oneway', 'round', 'multicity'] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export const TRIP_STOPS = ['nonstop', 'upto1', 'upto2'] as const;
export type TripStops = (typeof TRIP_STOPS)[number];

export const STOPS_LABELS: Record<TripStops, string> = {
  nonstop: 'Nonstop',
  upto1: 'Up to 1 stop',
  upto2: 'Up to 2 stops',
};

/** One leg of the requested itinerary. Every field is optional — an enquiry can be
 * "Houston to Kochi, sometime in August". Distinct from EnquirySegment (a quoted fare
 * option's flight, which carries times and has required fields). */
export interface EnquiryTripSegment {
  from?: string;
  to?: string;
  date?: string; // YYYY-MM-DD
}

export interface EnquiryPax {
  adults: number;
  children: number;
  infants: number;
}

export interface EnquiryTrip {
  tripType: TripType;
  segments: EnquiryTripSegment[];
  dateFlexibility?: string;
  pax: EnquiryPax;
  budgetPerPax?: number; // USD
  cabins: CabinClass[]; // [] = no preference
  preferredAirlines: string[]; // IATA codes; [] = no preference
  stops?: TripStops; // undefined = no preference
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
