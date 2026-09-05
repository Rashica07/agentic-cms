'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Globe, Loader2, Check, Copy, Eye, EyeOff, RadioTower, TriangleAlert, ExternalLink, Zap, Laptop,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

type SiteSource = 'scanned' | 'dev' | 'configured' | 'none';
type SiteInfo = { siteUrl: string | null; source: SiteSource };
type TestResult = { ok: boolean; reason?: string; status?: number; siteUrl?: string | null; source?: string };

/** How the CMS explains which URL won, so the resolution is never a mystery. */
const SOURCE_META: Record<Exclude<SiteSource, 'none'>, { label: string; tone: string; note: string }> = {
  scanned: {
    label: 'dev · auto-detected',
    tone: 'bg-blue-500/10 text-blue-400',
    note: 'Found by scanning your workspace for an app declaring this tenant. Auto-detection wins over everything else while it is running.',
  },
  dev: {
    label: 'dev · configured',
    tone: 'bg-violet-500/10 text-violet-400',
    note: 'Your saved local dev URL. Used because auto-detection found nothing — typical when the app lives outside the scanned workspace.',
  },
  configured: {
    label: 'production',
    tone: 'bg-green-500/10 text-green-400',
    note: 'Your configured production domain.',
  },
};

export default function SiteConnectionPage() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  const role = session?.user?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [domain, setDomain] = useState('');
  const [devUrl, setDevUrl] = useState('');
  const [secretShown, setSecretShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const { data: info, isLoading } = useQuery<SiteInfo>({
    queryKey: ['site-info', activeTenantId],
    queryFn: async () => createPulseClient(session?.accessToken).getMySiteInfo(),
    enabled: !!session?.accessToken,
  });

  const { data: tenant } = useQuery({
    queryKey: ['my-tenant', activeTenantId],
    queryFn: async () => createPulseClient(session?.accessToken).getMyTenant(),
    enabled: !!session?.accessToken,
  });

  const { data: secretData, refetch: loadSecret, isFetching: loadingSecret } = useQuery({
    queryKey: ['revalidate-secret', activeTenantId],
    queryFn: async () => createPulseClient(session?.accessToken).getMyRevalidateSecret(),
    enabled: false, // only on explicit reveal — don't ship secrets we weren't asked for
  });

  // Seed inputs from the STORED values, not the resolved one — the resolved URL
  // may be auto-detected and isn't what these fields edit.
  useEffect(() => {
    if (!tenant) return;
    setDomain((tenant as any).siteUrl ?? '');
    setDevUrl((tenant as any).devUrl ?? '');
  }, [tenant]);

  const save = useMutation({
    mutationFn: async (input: { siteUrl?: string | null; devUrl?: string | null }) =>
      createPulseClient(session?.accessToken).updateMySite(input),
    onSuccess: () => {
      toast.success('Saved');
      queryClient.invalidateQueries({ queryKey: ['site-info', activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ['my-tenant', activeTenantId] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const test = useMutation({
    mutationFn: async () => createPulseClient(session?.accessToken).testMySite(),
    onSuccess: (res) => {
      setTestResult(res);
      if (res.ok) toast.success('Site responded — live updates are working');
      else if (res.reason === 'no-site-url') toast.error('No site URL to test yet');
      else toast.error(`Site did not accept the ping${res.status ? ` (HTTP ${res.status})` : ''}`);
    },
    onError: (err: any) => toast.error(err.message || 'Test failed'),
  });

  const copySecret = () => {
    const s = secretData?.revalidateSecret;
    if (!s) return;
    navigator.clipboard.writeText(s);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const source: SiteSource = info?.source ?? 'none';
  const meta = source !== 'none' ? SOURCE_META[source] : null;
  const isDev = source === 'scanned' || source === 'dev';

  return (
    <div className="space-y-6 pb-10 anim-fade-in">
      {/* Current connection */}
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <RadioTower className="h-4 w-4 text-brand" /> Site Connection
          </CardTitle>
          <CardDescription>
            Where your site lives, and whether the CMS can push changes to it live.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : source === 'none' ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-400">Not connected</p>
                <p className="text-xs text-neutral-400">
                  The CMS doesn&apos;t know where this tenant&apos;s site is, so publishing can&apos;t refresh it and your
                  sitemap has no real domain. Either set a production domain below, or run the site locally with{' '}
                  <span className="font-mono text-neutral-300">npx create-novus-pulse</span> so it declares itself.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2/40 p-4">
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', isDev ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400')}>
                {isDev ? <Laptop className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <a href={info!.siteUrl!} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-sm text-foreground hover:text-brand">
                    {info!.siteUrl}
                  </a>
                  <ExternalLink className="h-3 w-3 shrink-0 text-neutral-600" />
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">{meta?.note}</p>
              </div>
              <span className={cn('shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', meta?.tone)}>
                {meta?.label}
              </span>
            </div>
          )}

          {/* Test */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              disabled={!isAdmin || test.isPending || source === 'none'}
              onClick={() => test.mutate()}
            >
              {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Test connection
            </Button>
            {testResult && (
              <span className={cn('text-xs font-medium', testResult.ok ? 'text-green-400' : 'text-red-400')}>
                {testResult.ok
                  ? 'Site accepted the refresh ping.'
                  : testResult.reason === 'no-site-url'
                    ? 'No site URL configured.'
                    : `Site did not respond correctly${testResult.status ? ` (HTTP ${testResult.status})` : ''} — is /api/revalidate present and the secret matching?`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Production domain */}
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">Production domain</CardTitle>
          <CardDescription>
            Used for your sitemap, canonical URLs, and live refreshes once deployed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="domain">Site URL</Label>
            <div className="flex gap-2">
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="https://example.com"
                disabled={!isAdmin}
                className="bg-surface-2 font-mono text-xs"
              />
              <Button className="shrink-0 gap-2" disabled={!isAdmin || save.isPending} onClick={() => save.mutate({ siteUrl: domain.trim() || null })}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </Button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Only the origin is kept — paths are stripped. Leave blank to disconnect.
              {isDev && ' A local dev URL is currently in use, so this takes effect once that stops resolving.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Local dev URL */}
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Laptop className="h-4 w-4 text-violet-400" /> Local dev URL
          </CardTitle>
          <CardDescription>
            Where this site runs on your machine. Only needed when auto-detection can&apos;t find it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="devUrl">Dev URL</Label>
            <div className="flex gap-2">
              <Input
                id="devUrl"
                value={devUrl}
                onChange={(e) => setDevUrl(e.target.value)}
                placeholder="http://localhost:3005"
                disabled={!isAdmin}
                className="bg-surface-2 font-mono text-xs"
              />
              <Button
                variant="outline"
                className="shrink-0 gap-2"
                disabled={!isAdmin || save.isPending}
                onClick={() => save.mutate({ devUrl: devUrl.trim() || null })}
              >
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </Button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Kept separate from the production domain so a localhost never leaks into sitemaps or canonical URLs.
              Auto-detection only reaches apps inside the workspace — set this if yours lives elsewhere.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Revalidation secret */}
      {isAdmin && (
        <Card className="bg-surface border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-semibold">Revalidation secret</CardTitle>
            <CardDescription>
              Your site&apos;s <span className="font-mono text-xs">/api/revalidate</span> route checks this before accepting a refresh.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {secretShown && secretData?.revalidateSecret ? (
              <div className="flex gap-2">
                <Input readOnly value={secretData.revalidateSecret} className="bg-surface-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button variant="outline" className="shrink-0 gap-1.5" onClick={copySecret}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSecretShown(false)}>
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
                disabled={loadingSecret}
                onClick={async () => { await loadSecret(); setSecretShown(true); }}
              >
                {loadingSecret ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Reveal secret
              </Button>
            )}

            <div className="rounded-lg border border-border bg-surface-2/40 p-3">
              <p className="text-[11px] font-medium text-neutral-300">Wiring an existing site by hand</p>
              <p className="mt-1 text-[11px] text-neutral-500">
                Apps scaffolded with <span className="font-mono">create-novus-pulse</span> already have this. Otherwise add{' '}
                <span className="font-mono text-neutral-400">REVALIDATE_SECRET</span> to your env and expose:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface p-2.5 font-mono text-[10px] text-neutral-400">
{`// src/app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const path = request.nextUrl.searchParams.get('path') || '/';
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ revalidated: false }, { status: 401 });
  }
  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
