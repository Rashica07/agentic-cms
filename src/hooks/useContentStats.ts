import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

export type TypeStat = {
  apiId: string;
  name: string;
  icon: string | null;
  entryCount: number;
  publishedCount: number;
  draftCount: number;
};

export type RecentEntry = {
  id: string;
  slug: string;
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
  locale: string;
  typeApiId: string;
  updatedAt: string;
};

export type ContentStats = {
  types: TypeStat[];
  totals: { entries: number; published: number; drafts: number; scheduled: number; trashed: number };
  recent: RecentEntry[];
};

/** Entry counts per content type + status, and the 8 most recently touched entries. */
export function useContentStats() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<ContentStats>({
    queryKey: ['content-stats', activeTenantId],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.getContentStats();
    },
    enabled: !!session?.accessToken,
    staleTime: 30_000,
  });
}
