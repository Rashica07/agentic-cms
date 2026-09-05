import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'publish' | 'archive'
  | 'trash' | 'restore' | 'login' | 'invite_sent' | 'invite_accepted';

export type AuditLogEntry = {
  id: string;
  userId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  user?: { firstName?: string; lastName?: string; email?: string } | null;
};

/**
 * Tenant audit log, newest first. The backend route is admin-only, so this
 * stays disabled for other roles rather than firing a request that 403s.
 */
export function useAuditLogs(limit = 8) {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const role = session?.user?.role;
  const canRead = role === 'admin' || role === 'super_admin';

  return useQuery<AuditLogEntry[]>({
    queryKey: ['audit-logs', activeTenantId, limit],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      const res = await pulse.getAuditLogs(limit, 0);
      // Service returns a bare array today; tolerate a paged { items } shape too.
      return Array.isArray(res) ? res : (res?.items ?? []);
    },
    enabled: !!session?.accessToken && canRead,
    staleTime: 30_000,
  });
}
