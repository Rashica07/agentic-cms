'use client';

import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Blocks, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Layers,
  Image as ImageIcon,
  Navigation,
  FormInput,
  ShoppingBag,
  LineChart,
  Sparkles,
  CalendarCheck,
  Users2,
  Mail,
} from 'lucide-react';
import { MODULE_KEYS, type ModuleKey, useEnabledModules, useUpdateModules } from '@/hooks/useModules';

const MODULE_META: Record<ModuleKey, { label: string; description: string; icon: LucideIcon }> = {
  reservations: {
    label: 'Reservations',
    description: 'Bookings, tables and opening hours — including the public booking API.',
    icon: CalendarCheck,
  },
  pages: {
    label: 'Pages',
    description: 'Published site pages built with the visual editor.',
    icon: FileText,
  },
  content: {
    label: 'Content',
    description: 'Custom content types and entries — the headless CMS.',
    icon: Layers,
  },
  media: {
    label: 'Media Library',
    description: 'Uploaded images and files available across your site.',
    icon: ImageIcon,
  },
  menus: {
    label: 'Menus',
    description: 'Site navigation menus served to public frontends.',
    icon: Navigation,
  },
  forms: {
    label: 'Forms',
    description: 'Public form submissions from your site visitors.',
    icon: FormInput,
  },
  products: {
    label: 'Products',
    description: 'Storefront product catalog for the public site.',
    icon: ShoppingBag,
  },
  analytics: {
    label: 'Analytics',
    description: 'Traffic and event tracking dashboard.',
    icon: LineChart,
  },
  agent: {
    label: 'Copilot',
    description: 'The AI copilot / tool-calling assistant.',
    icon: Sparkles,
  },
  crm: {
    label: 'CRM',
    description: 'Contacts, notes and pipeline — auto-linked from forms and reservations.',
    icon: Users2,
  },
  email: {
    label: 'Email Campaigns',
    description: 'Newsletters and broadcasts to CRM contacts, with templates and scheduling.',
    icon: Mail,
  },
};

export default function ModulesSettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canManage = role === 'admin' || role === 'super_admin';

  const { enabledModules, isModuleEnabled, isLoading } = useEnabledModules();
  const { mutate: updateModules, isPending } = useUpdateModules();

  const handleToggle = (key: ModuleKey, checked: boolean) => {
    if (!canManage || isPending) return;

    // enabledModules is null → everything is currently enabled. Materialize
    // the full set before removing one, so we don't accidentally shrink to
    // just the toggled keys.
    const current = enabledModules ?? [...MODULE_KEYS];
    const next = checked
      ? Array.from(new Set([...current, key]))
      : current.filter((k) => k !== key);

    updateModules(next, {
      onSuccess: () => {
        toast.success(`${MODULE_META[key].label} ${checked ? 'enabled' : 'disabled'}`);
      },
      onError: () => {
        toast.error(`Failed to update ${MODULE_META[key].label}`);
      },
    });
  };

  return (
    <div className="space-y-6 pb-10 anim-fade-in">
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="bg-brand/10 w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
              <Blocks className="h-5 w-5 text-brand" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Modules</CardTitle>
              <CardDescription className="mt-0.5">
                Turn features on or off for this workspace. Disabling a module hides its
                public output — your data is kept and comes right back when you re-enable it.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {!canManage && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-neutral-400">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Only admins can change which modules are enabled.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {MODULE_KEYS.map((key) => (
                <div key={key} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {MODULE_KEYS.map((key) => {
                const meta = MODULE_META[key];
                const enabled = isModuleEnabled(key);
                return (
                  <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 h-9 w-9 rounded-lg bg-surface-2 border border-border-strong flex items-center justify-center shrink-0">
                        <meta.icon className="h-4 w-4 text-neutral-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-foreground">{meta.label}</h4>
                        <p className="text-[13px] text-neutral-400 mt-0.5">{meta.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleToggle(key, checked)}
                      disabled={!canManage || isPending}
                      className="data-checked:bg-brand shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
