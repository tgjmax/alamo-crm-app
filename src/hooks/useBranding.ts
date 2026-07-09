import { useQuery } from '@tanstack/react-query';
import { getBranding, Branding } from '@/api/organization.api';

const DEFAULT_BRANDING: Branding = { name: 'Alamo Travels', tagline: 'Internal CRM', logoUrl: null };

export function useBranding(): Branding {
  const { data } = useQuery({
    queryKey: ['organization', 'branding'],
    queryFn: getBranding,
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
  });
  return data ?? DEFAULT_BRANDING;
}
