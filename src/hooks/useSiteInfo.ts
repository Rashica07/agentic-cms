import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';

const FALLBACK_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:21113';

/**
 * Resolves where THIS tenant's site is actually running, via the framework's
 * auto-discovery: in dev the backend scans sibling workspace apps (their
 * package.json `novusPulse` declarations, dev scripts, vite configs); in
 * prod it returns the configured tenant.siteUrl. Falls back to
 * NEXT_PUBLIC_SITE_URL only when discovery finds nothing.
 */
export function useSiteInfo() {
  const { data: session } = useSession();

  const query = useQuery({
    queryKey: ['site-info'],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.getMySiteInfo();
    },
    enabled: !!session?.accessToken,
    staleTime: 60_000,
  });

  return {
    siteUrl: query.data?.siteUrl ?? FALLBACK_SITE_URL,
    source: query.data?.source ?? 'none',
    isLoading: query.isLoading,
  };
}
