import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

export type Redirect = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  active: boolean;
  hits: number;
  createdAt: string;
  updatedAt: string;
};

export function useRedirects() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<Redirect[]>({
    queryKey: ['redirects', activeTenantId],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.getRedirects();
    },
    enabled: !!session?.accessToken,
  });
}

export function useRedirectMutations() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['redirects', activeTenantId] });

  const create = useMutation({
    mutationFn: async (input: { fromPath: string; toPath: string; statusCode: number }) => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.createRedirect(input);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.updateRedirect(id, data);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.deleteRedirect(id);
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
