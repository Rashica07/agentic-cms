'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Globe, Paintbrush, Building2, ExternalLink, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePlan } from '@/hooks/usePlan';
import { PLAN_LABEL } from '@/lib/plan';
import { useUIStore } from '@/store/useStore';
import { useSiteInfo } from '@/hooks/useSiteInfo';

const NEW_INSTALL_WINDOW_MS = 24 * 60 * 60 * 1000;

interface TenantSite {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
}

function isRecentInstall(createdAt?: string): boolean {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < NEW_INSTALL_WINDOW_MS;
}

export default function TenantWebsitesPage() {
  const { data: session } = useSession();
  const { plan, can, requiredPlan, isSuperAdmin } = usePlan();
  const { setActiveTenant, activeTenantId } = useUIStore();
  // Only resolves the ACTIVE tenant's site — the backend has no bulk lookup —
  // so other cards link to Site Connection instead of guessing a URL.
  const { siteUrl: activeSiteUrl } = useSiteInfo();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [planSelection, setPlanSelection] = useState<'starter' | 'studio' | 'agency'>('starter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async (): Promise<TenantSite[]> => {
      const pulse = createPulseClient(session?.accessToken);
      if (isSuperAdmin) {
        // Super admin sees every tenant on the platform — including any
        // just auto-registered by `npx create-novus-pulse`.
        return pulse.getTenants();
      }
      // Tenant owners see their own workspace card
      return [
        {
          id: session?.user?.tenantId ?? 'own',
          name: session?.user?.name ? `${session.user.name}'s Workspace` : 'Your Workspace',
          slug: 'admin-workspace',
        },
      ];
    },
    enabled: !!session?.accessToken,
    // Poll for newly-registered installations — "the second it installs,
    // the dashboard shows it" without requiring a manual page refresh.
    refetchInterval: isSuperAdmin ? 15_000 : false,
  });

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;
    setIsSubmitting(true);
    try {
      const pulse = createPulseClient(session?.accessToken);
      await pulse.createTenant({ name, slug, plan: planSelection });
      toast.success('Website connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsModalOpen(false);
      setName('');
      setSlug('');
      setPlanSelection('starter');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to connect website');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] flex items-center gap-2">
          <Building2 className="h-7 w-7 text-brand-fg" /> Tenant Websites
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Every website connected to this workspace — open it live or jump straight into editing.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-neutral-900" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(tenants ?? []).map((t) => (
            <Card key={t.id} className="group hover:border-brand/40 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand-fg">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isRecentInstall(t.createdAt) && (
                      <span className="flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-fg">
                        <Sparkles className="h-2.5 w-2.5" /> New
                      </span>
                    )}
                    <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-400">
                      Live
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg leading-tight">{t.name}</h3>
                  <p className="text-xs font-mono text-neutral-500 mt-1">/{t.slug}</p>
                </div>

                <div className="flex gap-2 pt-1">
                  {/* Only the active tenant's URL is resolvable here, and it was
                      previously a hardcoded port pointing at another project. */}
                  {t.id === activeTenantId && activeSiteUrl ? (
                    <a href={activeSiteUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </Button>
                    </a>
                  ) : (
                    <Link
                      href="/dashboard/settings/site"
                      onClick={() => setActiveTenant({ id: t.id, slug: t.slug, name: t.name })}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full gap-1.5 text-neutral-400" title="Resolve or set this tenant's site URL">
                        <ExternalLink className="h-3.5 w-3.5" /> Connect
                      </Button>
                    </Link>
                  )}
                  <Link
                    href="/dashboard/builder"
                    onClick={() => setActiveTenant({ id: t.id, slug: t.slug, name: t.name })}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full gap-1.5">
                      <Paintbrush className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add site teaser */}
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex h-full min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-neutral-500 hover:border-brand/40 hover:text-brand-fg transition-colors"
            >
              <Globe className="h-6 w-6" />
              <span className="text-sm font-medium">Connect another website</span>
              <span className="text-[10px] text-brand-fg uppercase tracking-wider font-semibold">Admin Tool</span>
            </button>
          ) : (
            <button
              type="button"
              className="flex h-full min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-neutral-500 hover:border-brand/40 hover:text-brand-fg transition-colors cursor-not-allowed"
              title={can('multisite') ? "Multi-site support is on the roadmap" : `Requires ${PLAN_LABEL[requiredPlan('multisite')]} plan`}
            >
              {can('multisite') ? (
                <>
                  <Globe className="h-6 w-6" />
                  <span className="text-sm font-medium">Connect another website</span>
                  <span className="text-[10px] uppercase tracking-wider">Coming soon</span>
                </>
              ) : (
                <>
                  <Lock className="h-6 w-6 text-neutral-600 mb-1" />
                  <span className="text-sm font-medium text-neutral-400">Connect another website</span>
                  <span className="rounded-full bg-neutral-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    {PLAN_LABEL[requiredPlan('multisite')]}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Connection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">Connect a New Website</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Register a new tenant website on this CMS network.
              </p>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name" className="text-xs font-semibold text-muted-foreground">
                  Website Name
                </Label>
                <Input
                  id="tenant-name"
                  type="text"
                  placeholder="e.g. Travel Me"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug || slug === e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant-slug" className="text-xs font-semibold text-muted-foreground">
                  Website URL Slug
                </Label>
                <Input
                  id="tenant-slug"
                  type="text"
                  placeholder="e.g. travel-me"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  title="Lowercase letters, numbers, and hyphens only (e.g., travel-me)"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Select Plan Tier
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['starter', 'studio', 'agency'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setPlanSelection(tier)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border capitalize transition-colors ${
                        planSelection === tier
                          ? 'bg-brand/20 border-brand text-brand-fg'
                          : 'bg-background border-border text-muted-foreground hover:border-neutral-500'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="bg-transparent border-border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
                >
                  {isSubmitting ? 'Creating...' : 'Connect Website'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
