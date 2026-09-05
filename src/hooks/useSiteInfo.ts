import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

/**
 * Optional explicit override, unset by default. We must never invent a URL —
 * a guessed port sends "Open site" to whatever else happens to be running there.
 */
const FALLBACK_SITE_URL: string | null = process.env.NEXT_PUBLIC_SITE_URL || null;

/**
 * Resolves where THIS tenant's site is actually running, via the framework's
 * auto-discovery: in dev the backend scans sibling workspace apps (their
 * package.json `novusPulse` declarations, dev scripts, vite configs); in
 * prod it returns the configured tenant.siteUrl.
 *
 * `siteUrl` is null when nothing is known — callers must handle that and point
 * the user at Settings → Site Connection rather than open a bogus link.
 */
export function useSiteInfo() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  const query = useQuery({
    // Tenant-scoped: without this, switching workspace serves the previous
    // tenant's site URL straight from cache.
    queryKey: ['site-info', activeTenantId],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.getMySiteInfo();
    },
    enabled: !!session?.accessToken,
    staleTime: 60_000,
  });

  return {
    siteUrl: (query.data?.siteUrl ?? FALLBACK_SITE_URL) as string | null,
    source: query.data?.source ?? 'none',
    isLoading: query.isLoading,
  };
}
