import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

export const WEBHOOK_EVENTS = [
  { value: 'entry.published', label: 'Entry published' },
  { value: 'entry.updated', label: 'Entry updated' },
  { value: 'entry.unpublished', label: 'Entry unpublished' },
  { value: 'entry.deleted', label: 'Entry deleted' },
] as const;

export type Webhook = {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  active: boolean;
  lastTriggeredAt: string | null;
  lastStatus: string | null;
  createdAt: string;
};

/** Webhook routes are admin-only server-side — don't fire a request that 403s. */
function useAdminGate() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  return {
    session,
    isAdmin: role === 'admin' || role === 'super_admin',
  };
}

export function useWebhooks() {
  const { session, isAdmin } = useAdminGate();
  const { activeTenantId } = useUIStore();

  return useQuery<Webhook[]>({
    queryKey: ['webhooks', activeTenantId],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.getWebhooks();
    },
    enabled: !!session?.accessToken && isAdmin,
  });
}

export function useWebhookMutations() {
  const { session } = useAdminGate();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['webhooks', activeTenantId] });

  const create = useMutation({
    mutationFn: async (input: { name: string; url: string; events: string[]; secret?: string }) => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.createWebhook(input);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.updateWebhook(id, data);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.deleteWebhook(id);
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
