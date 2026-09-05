import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

/**
 * Per-tenant settings blob (tenant.settings), namespaced by area. Every field
 * is optional — the pages fall back to sensible defaults when unset.
 */
export type NotificationSettings = {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  orderUpdates?: boolean;
  systemAlerts?: boolean;
  weeklyDigest?: boolean;
};

export type PrivacySettings = {
  searchIndexing?: boolean;
  analyticsTracking?: boolean;
  cookieBanner?: boolean;
  twoFactorRequired?: boolean;
  dataRetentionDays?: number;
};

export type PolicySettings = {
  refund?: string;
  privacy?: string;
  terms?: string;
};

export type TenantSettings = {
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
  policies?: PolicySettings;
};

/** Reads the caller's tenant (cached) and exposes its settings blob. */
export function useSettings() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  const query = useQuery({
    // Shares the cache key with useEnabledModules so both read one fetch.
    queryKey: ['my-tenant', activeTenantId],
    queryFn: async () => createPulseClient(session?.accessToken).getMyTenant(),
    enabled: !!session?.accessToken,
    staleTime: 60_000,
  });

  const settings = (query.data?.settings ?? {}) as TenantSettings;
  return { ...query, settings };
}

/** Persist one namespace of the settings blob (merged server-side). */
export function useUpdateSettings() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<TenantSettings>) =>
      createPulseClient(session?.accessToken).updateMySettings(patch as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tenant', activeTenantId] });
    },
  });
}
