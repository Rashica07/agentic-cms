import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';
import { MODULE_KEYS, type ModuleKey } from '@rashica07/novus-pulse';

export { MODULE_KEYS };
export type { ModuleKey };

/**
 * Fetches the caller's own tenant (cached via react-query) and exposes
 * which optional feature modules are enabled.
 *
 * `enabledModules` null/absent on the tenant means every module is
 * enabled — the default for tenants created before the per-tenant
 * module registry existed. Shared by the Settings > Modules page and
 * the dashboard sidebar (nav filtering), so both read from one cached
 * fetch instead of hitting the API twice.
 */
export function useEnabledModules() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  const query = useQuery({
    queryKey: ['my-tenant', activeTenantId],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.getMyTenant();
    },
    enabled: !!session?.accessToken,
    staleTime: 60_000,
  });

  const enabledModules = query.data?.enabledModules ?? null;

  const isModuleEnabled = (key: ModuleKey | string) =>
    enabledModules === null || enabledModules === undefined || enabledModules.includes(key);

  return { ...query, enabledModules, isModuleEnabled };
}

/** Persist the tenant's enabled module set (admin/super_admin only — server-enforced). */
export function useUpdateModules() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabledModules: string[]) => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.updateMyModules(enabledModules);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tenant', activeTenantId] });
    },
  });
}
