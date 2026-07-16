import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

export function useStats(days: number = 30) {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  
  return useQuery({
    queryKey: ['stats', activeTenantId, days],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.getAnalyticsStats(days);
    },
    enabled: !!session?.accessToken,
  });
}
