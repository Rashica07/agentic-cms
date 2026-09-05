import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

/** Only returned by createApiKey — the raw key is never retrievable again. */
export type CreatedApiKey = ApiKey & { rawKey: string };

export function useApiKeys() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const role = session?.user?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';

  return useQuery<ApiKey[]>({
    queryKey: ['api-keys', activeTenantId],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.getApiKeys();
    },
    enabled: !!session?.accessToken && isAdmin,
  });
}

export function useApiKeyMutations() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['api-keys', activeTenantId] });

  const create = useMutation<CreatedApiKey, Error, string>({
    mutationFn: async (name: string) => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.createApiKey(name);
    },
    onSuccess: invalidate,
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.revokeApiKey(id);
    },
    onSuccess: invalidate,
  });

  return { create, revoke };
}
