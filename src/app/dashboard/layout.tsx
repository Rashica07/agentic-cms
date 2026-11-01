'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Layers,
  FileText,
  Newspaper,
  Image as ImageIcon,
  FolderTree,
  Database,
  Paintbrush,
  AlignLeft,
  SearchCheck,
  FormInput,
  Contact,
  Mail,
  CalendarCheck,
  LineChart,
  Building2,
  Globe,
  Settings,
  Plus,
} from 'lucide-react';
import { useUIStore } from '@/store/useStore';
import { usePlan } from '@/hooks/usePlan';
import { useApiStatus } from '@/hooks/useApiStatus';
import { useEnabledModules, type ModuleKey } from '@/hooks/useModules';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import { cn } from '@/lib/utils';
import { SupportWidget } from '@/components/support-widget';
import { DemoBanner } from '@/components/demo-banner';
import { GlobalSearch } from '@/components/global-search';
import { AppShell, isNavActive, type ShellNavGroup, type ShellNavItem } from '@/components/omni/app-shell';
import { type Plan, type FeatureKey, PLAN_LABEL, hasFeature, requiredPlan } from '@/lib/plan';

type NavDef = Omit<ShellNavItem, 'lockedLabel'> & { module?: ModuleKey; gate?: FeatureKey };
type GroupDef = { label?: string; items: NavDef[] };

/** OMNI CMS information architecture — every item is an existing route. */
function navDefinition(isSuperAdmin: boolean): GroupDef[] {
  const groups: GroupDef[] = [
    {
      items: [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Copilot', href: '/dashboard/agent', icon: Sparkles, module: 'agent' },
      ],
    },
    {
      label: 'Content',
      items: [
        { name: 'Entries', href: '/dashboard/content', icon: Layers, module: 'content' },
        { name: 'Pages', href: '/dashboard/pages', icon: FileText, module: 'pages' },
        { name: 'Posts', href: '/dashboard/posts', icon: Newspaper, module: 'pages' },
        { name: 'Media', href: '/dashboard/media', icon: ImageIcon, module: 'media' },
        { name: 'Taxonomy', href: '/dashboard/categories', icon: FolderTree, module: 'content' },
      ],
    },
    {
      label: 'Model',
      items: [{ name: 'Schema', href: '/dashboard/schema', icon: Database, module: 'content' }],
    },
    {
      label: 'Site',
      items: [
        { name: 'Visual editor', href: '/dashboard/builder', icon: Paintbrush, module: 'pages' },
        { name: 'Menus', href: '/dashboard/menus', icon: AlignLeft, module: 'menus', gate: 'menus' },
        { name: 'SEO & redirects', href: '/dashboard/seo', icon: SearchCheck, gate: 'seo' },
      ],
    },
    {
      label: 'Engagement',
      items: [
        { name: 'Forms', href: '/dashboard/forms', icon: FormInput, module: 'forms', gate: 'forms' },
        { name: 'Contacts', href: '/dashboard/crm', icon: Contact, module: 'crm' },
        { name: 'Email', href: '/dashboard/email', icon: Mail, module: 'email' },
        { name: 'Reservations', href: '/dashboard/reservations', icon: CalendarCheck, module: 'reservations' },
        { name: 'Analytics', href: '/dashboard/analytics', icon: LineChart, module: 'analytics' },
      ],
    },
  ];
  if (isSuperAdmin) {
    groups.push({
      label: 'Platform',
      items: [
        { name: 'Tenants', href: '/dashboard/tenants', icon: Building2 },
        { name: 'Websites', href: '/dashboard/websites', icon: Globe },
      ],
    });
  }
  return groups;
}

const PREVIEW_PLANS: { value: Plan | null; label: string }[] = [
  { value: null, label: 'Real' },
  { value: 'starter', label: 'Starter' },
  { value: 'studio', label: 'Studio' },
  { value: 'agency', label: 'Agency' },
];

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const { isSidebarOpen, toggleSidebar, closeSidebar, previewPlan, setPreviewPlan, activeTenantId, activeTenantName, setActiveTenant } =
    useUIStore();
  const apiOnline = useApiStatus();
  const { plan, isSuperAdmin } = usePlan();
  const { isModuleEnabled, data: myTenant } = useEnabledModules();
  const { siteUrl } = useSiteInfo();

  useEffect(() => {
    if (session?.user && !activeTenantId) {
      setActiveTenant({
        id: session.user.tenantId || 'admin-workspace',
        slug: session.user.tenantSlug || 'admin-workspace',
        name: session.user.tenantSlug === 'admin-workspace' ? 'Admin Workspace' : session.user.name || 'Workspace',
      });
    }
  }, [session, activeTenantId, setActiveTenant]);

  // Disabled modules disappear; plan-gated features stay visible but locked
  // (with the plan that unlocks them). Server-side guards still enforce both.
  const groups: ShellNavGroup[] = navDefinition(isSuperAdmin)
    .map((g) => ({
      label: g.label,
      items: g.items
        .filter((i) => !i.module || isModuleEnabled(i.module))
        .map(({ module: _m, gate, ...i }) => ({
          ...i,
          lockedLabel: gate && !hasFeature(plan, gate) ? PLAN_LABEL[requiredPlan(gate)] : undefined,
        })),
    }))
    .filter((g) => g.items.length > 0);

  const footerItems: ShellNavItem[] = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, match: ['/dashboard/billing', '/dashboard/setup'] },
    ...(siteUrl ? [{ name: 'View site', href: siteUrl, icon: Globe, external: true }] : []),
  ];

  const allItems = [...groups.flatMap((g) => g.items), ...footerItems];
  const pageTitle = allItems.find((i) => isNavActive(pathname, i))?.name ?? 'Workspace';
  const tenantName =
    activeTenantName && activeTenantName !== session?.user?.name ? activeTenantName : session?.user?.tenantSlug ?? 'Workspace';

  return (
    <>
      <AppShell
        product="CMS"
        groups={groups}
        footerItems={footerItems}
        primaryAction={isModuleEnabled('content') ? { label: 'New entry', href: '/dashboard/content', icon: Plus } : undefined}
        workspace={{ name: myTenant?.name ?? prettyTenant(tenantName), plan: PLAN_LABEL[plan] }}
        user={{ name: session?.user?.name, email: session?.user?.email, role: session?.user?.role }}
        onLogout={() => signOut({ callbackUrl: '/login' })}
        onSearch={() => setSearchOpen(true)}
        apiOnline={apiOnline}
        banner={process.env.NEXT_PUBLIC_DEMO_MODE !== 'false' ? <DemoBanner /> : undefined}
        pageTitle={pageTitle}
        sidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        onCloseSidebar={closeSidebar}
        userMenuExtra={
          isSuperAdmin ? (
            <div className="border-b border-border px-2 py-2">
              <p className="omni-label mb-1">Preview plan</p>
              <div className="grid grid-cols-4 gap-1">
                {PREVIEW_PLANS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setPreviewPlan(m.value)}
                    className={cn(
                      'rounded-sm px-1 py-1 text-[11px]',
                      previewPlan === m.value ? 'bg-brand/15 text-brand-fg' : 'text-neutral-400 hover:bg-surface-2',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ) : undefined
        }
      >
        {children}
      </AppShell>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <SupportWidget />
    </>
  );
}

/** "meridian-roasters" → "Meridian Roasters" when only the slug is known. */
function prettyTenant(name: string) {
  return name.includes('-') && name === name.toLowerCase()
    ? name
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : name;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background text-sm text-neutral-500">Loading workspace…</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
