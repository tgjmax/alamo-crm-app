import { useQuery } from '@tanstack/react-query';
import { getBranding, Branding } from '@/api/organization.api';

/** Shared query key for the org-branding cache entry — import this instead of
 * hand-typing the literal so every consumer stays on the same cache entry. */
export const BRANDING_QUERY_KEY = ['organization', 'branding'] as const;
/** Kept under the backend's 300-second presigned logo URL expiry. */
export const BRANDING_REFRESH_MS = 4 * 60 * 1000;

const DEFAULT_BRANDING: Branding = { name: 'Alamo Travels', tagline: 'Internal CRM', logoUrl: null, invoiceTerms: null };

export function useBranding(): Branding {
  const { data } = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: getBranding,
    staleTime: BRANDING_REFRESH_MS,
    refetchInterval: BRANDING_REFRESH_MS,
  });
  return data ?? DEFAULT_BRANDING;
}
