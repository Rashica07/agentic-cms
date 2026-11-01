'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Settings as SettingsIcon,
  CreditCard,
  Users,
  Blocks,
  Bell,
  ScrollText,
  ShoppingCart,
  Store,
  ShieldCheck,
  Package,
  Percent,
  Building,
  HelpCircle,
  Search,
  ToggleLeft,
  Webhook,
  KeyRound,
  RadioTower
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useEnabledModules } from '@/hooks/useModules';

/**
 * `commerce: true` marks a section that only makes sense for a store (checkout,
 * shipping, sales channels, taxes). These stay hidden unless the tenant has
 * explicitly opted in to the 'commerce' module — a portfolio/CMS tenant never
 * sees them. Opt-in is deliberately strict (not the null=all-enabled default),
 * since no ecommerce backend exists yet; when it does, promote 'commerce' to a
 * real MODULE_KEY.
 */
const SETTINGS_SECTIONS: { id: string; name: string; icon: any; commerce?: boolean }[] = [
  { id: 'general', name: 'General', icon: SettingsIcon },
  { id: 'site', name: 'Site Connection', icon: RadioTower },
  { id: 'modules', name: 'Modules', icon: ToggleLeft },
  { id: 'plan-billing', name: 'Plan & Billing', icon: CreditCard },
  { id: 'team', name: 'Team & Permissions', icon: Users },
  { id: 'audit', name: 'Activity Log', icon: ScrollText },
  { id: 'webhooks', name: 'Webhooks', icon: Webhook },
  { id: 'api-keys', name: 'API Keys', icon: KeyRound },
  { id: 'apps', name: 'Apps & Integrations', icon: Blocks },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'policies', name: 'Policies', icon: ScrollText },
  { id: 'privacy-security', name: 'Privacy & Security', icon: ShieldCheck },
  { id: 'checkout', name: 'Checkout', icon: ShoppingCart, commerce: true },
  { id: 'sales-channels', name: 'Sales Channels', icon: Store, commerce: true },
  { id: 'shipping', name: 'Shipping & Fulfillment', icon: Package, commerce: true },
  { id: 'taxes', name: 'Taxes', icon: Percent, commerce: true },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { enabledModules } = useEnabledModules();
  // Strict opt-in: only when 'commerce' is explicitly listed, never via the
  // null=all-enabled default — so store-only settings stay hidden by default.
  const commerceEnabled = Array.isArray(enabledModules) && enabledModules.includes('commerce');
  const sections = SETTINGS_SECTIONS.filter((s) => !s.commerce || commerceEnabled);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* ─── HEADER ────────────────────────────────────────────── */}
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Settings</h1>
          <div className="flex items-center text-sm text-neutral-400 mt-1 space-x-2">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Home</Link>
            <span>›</span>
            <span className="text-neutral-300">Settings</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
        {/* ─── LEFT SIDEBAR (220px) ──────────────────────────────── */}
        <div className="md:w-[220px] shrink-0 flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-hide pb-10">
          
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <Input 
              placeholder="Search settings..." 
              className="pl-8 h-9 bg-surface-2 border-border-strong text-sm text-foreground focus-visible:ring-brand"
            />
          </div>

          <nav className="flex flex-col gap-1">
            {sections.map((s) => {
              const isActive = pathname.includes(`/settings/${s.id}`);
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/settings/${s.id}`}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-brand/10 text-brand-fg border-l-2 border-brand rounded-l-none pl-2.5'
                      : 'text-neutral-400 hover:bg-surface-2/80 hover:text-foreground border-l-2 border-transparent pl-2.5'
                  )}
                >
                  <s.icon 
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors', 
                      isActive ? 'text-brand-fg' : 'text-neutral-500 group-hover:text-foreground'
                    )} 
                  />
                  {s.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ─── MAIN CONTENT AREA ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 max-w-4xl overflow-y-auto pb-32 pr-2">
          {children}
        </div>
      </div>
    </div>
  );
}
