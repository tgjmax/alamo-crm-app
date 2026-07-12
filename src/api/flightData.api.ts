import { apiClient } from './client';
import { CodeOption } from '@/components/code-search-field';

interface AirportResult {
  code: string;
  name: string;
  city: string;
  country: string;
}

interface AirlineResult {
  code: string;
  name: string;
}

/** Airports matching a code prefix or name/city substring — main line "Airport name (CODE)",
 * sublabel "City, Country". */
export async function searchAirports(q: string): Promise<CodeOption[]> {
  const res = await apiClient.get<AirportResult[]>('/airports/search', { params: { q } });
  return res.data.map((a) => ({
    code: a.code,
    label: a.name,
    sublabel: [a.city, a.country].filter(Boolean).join(', '),
  }));
}

/** Active airlines matching a code prefix or name substring. */
export async function searchAirlines(q: string): Promise<CodeOption[]> {
  const res = await apiClient.get<AirlineResult[]>('/airlines/search', { params: { q } });
  return res.data.map((a) => ({ code: a.code, label: a.name }));
}
