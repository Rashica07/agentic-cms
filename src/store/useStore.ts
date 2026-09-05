import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plan } from '@/lib/plan';

/**
 * Mirror the active tenant into a cookie so SERVER-SIDE code can read it.
 *
 * The dashboard talks to the backend two ways: the pulse SDK (client-side,
 * already sends `x-tenant-id` from `activeTenantId`) and the Next.js `/api/*`
 * proxy routes (server-side, cannot read this client store). A super_admin's
 * JWT has no tenant, so the proxies need the active tenant from somewhere they
 * CAN read — this cookie, which rides along automatically on same-origin
 * `/api/*` requests. Only honored for super_admins by the backend TenantGuard;
 * regular users are always scoped by their own JWT, so this cannot escalate.
 */
const TENANT_COOKIE = 'np_active_tenant';
function syncTenantCookie(tenantId: string | null) {
  if (typeof document === 'undefined') return;
  if (tenantId) {
    document.cookie = `${TENANT_COOKIE}=${tenantId}; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    document.cookie = `${TENANT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/**
 * UI state store for the CMS panel.
 *
 * `previewPlan` — lets the platform owner (super_admin) preview the panel
 * as if they were on a different billing plan. This is a UI-only overlay,
 * clearly labeled as a preview — it never changes any real entitlements.
 * Replaces the old "Dev Tools" toggle, which was a fake plan-picker.
 */
interface UIState {
  // Mobile drawer
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  // Desktop icon rail (collapsed keeps every button visible as an icon)
  sidebarCollapsed: boolean;
  toggleCollapsed: () => void;
  // Owner-only plan preview
  previewPlan: Plan | null;
  setPreviewPlan: (plan: Plan | null) => void;
  // Active tenant selection
  activeTenantId: string | null;
  activeTenantSlug: string | null;
  activeTenantName: string | null;
  setActiveTenant: (tenant: { id: string; name: string; slug: string } | null) => void;
  /**
   * Wipe the active-tenant selection AND its cookie. Call on login and logout:
   * the store is persisted in localStorage, so without this a new user on the
   * same browser inherits the PREVIOUS user's active tenant — a cross-tenant
   * leak (a fresh signup landing on someone else's workspace).
   */
  resetTenant: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      closeSidebar: () => set({ isSidebarOpen: false }),
      sidebarCollapsed: false,
      toggleCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      previewPlan: null,
      setPreviewPlan: (previewPlan) => set({ previewPlan }),
      activeTenantId: null,
      activeTenantSlug: null,
      activeTenantName: null,
      setActiveTenant: (tenant) => {
        syncTenantCookie(tenant?.id ?? null);
        set({
          activeTenantId: tenant?.id ?? null,
          activeTenantSlug: tenant?.slug ?? null,
          activeTenantName: tenant?.name ?? null,
        });
      },
      resetTenant: () => {
        syncTenantCookie(null);
        set({ activeTenantId: null, activeTenantSlug: null, activeTenantName: null });
      },
    }),
    {
      name: 'np-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        previewPlan: state.previewPlan,
        activeTenantId: state.activeTenantId,
        activeTenantSlug: state.activeTenantSlug,
        activeTenantName: state.activeTenantName,
      }),
      // localStorage survives across sessions but the cookie may not (cleared,
      // expired). Re-mirror it on rehydration so the proxies never fall out of
      // sync with a tenant the user already picked.
      onRehydrateStorage: () => (state) => {
        if (state) syncTenantCookie(state.activeTenantId);
      },
    }
  )
);
