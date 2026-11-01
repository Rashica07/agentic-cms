'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Plus, X, Loader2, Copy, Check, TriangleAlert, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useApiKeys, useApiKeyMutations, type ApiKey } from '@/hooks/useApiKeys';

export default function ApiKeysSettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const { data: keys, isLoading } = useApiKeys();
  const { create, revoke } = useApiKeyMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  /** Held in memory only — the backend hashes the key and can never show it again. */
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    try {
      const created = await create.mutateAsync(name.trim());
      setFreshKey(created.rawKey);
      setName('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create key');
    }
  };

  const copy = () => {
    if (!freshKey) return;
    navigator.clipboard.writeText(freshKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFreshKey(null);
    setCopied(false);
    setName('');
  };

  const doRevoke = async (key: ApiKey) => {
    if (!confirm(`Revoke “${key.name}”? Any integration using it will immediately stop working.`)) return;
    try {
      await revoke.mutateAsync(key.id);
      toast.success('API key revoked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke key');
    }
  };

  if (!isAdmin) {
    return (
      <Card className="bg-surface border-border">
        <CardHeader className="py-10 text-center">
          <CardTitle className="text-lg">Admins only</CardTitle>
          <CardDescription className="mt-1">API keys are restricted to workspace admins.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-10 anim-fade-in">
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="h-4 w-4 text-brand-fg" /> API Keys
            </CardTitle>
            <CardDescription>
              Authenticate the public delivery API and unlock draft preview.
            </CardDescription>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Create key
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-14 text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !keys?.length ? (
            <div className="py-14 text-center">
              <KeyRound className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
              <p className="text-sm font-medium text-neutral-400">No API keys yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
                Create one so an external site can read your published content — or preview drafts before they go live.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {keys.map((key) => {
                const revoked = !!key.revokedAt;
                return (
                  <div key={key.id} className={cn('group flex items-center gap-4 p-4 transition-colors hover:bg-surface-2/30', revoked && 'opacity-50')}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{key.name}</p>
                        {revoked && (
                          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-400">Revoked</span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-neutral-500">{key.prefix}…</p>
                      <p className="mt-1 text-[10px] text-neutral-600">
                        Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                        {' · '}
                        {key.lastUsedAt
                          ? `last used ${formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}`
                          : 'never used'}
                      </p>
                    </div>
                    {!revoked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 gap-1.5 text-xs text-neutral-400 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                        onClick={() => doRevoke(key)}
                      >
                        <Ban className="h-3.5 w-3.5" /> Revoke
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface-2/30 border-border/50">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-neutral-300">Using a key</p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Send it as an <span className="font-mono text-neutral-400">X-API-Key</span> header. Add{' '}
            <span className="font-mono text-neutral-400">?preview=true</span> to a public content request to include drafts:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface p-2.5 font-mono text-[10px] text-neutral-400">
{`curl -H "X-API-Key: nvs_…" \\
  "${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/public/<tenant-slug>/content/<type>?preview=true"`}
          </pre>
        </CardContent>
      </Card>

      {/* Create modal — also the ONLY place the raw key is ever shown */}
      {modalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={freshKey ? undefined : closeModal} />
          <div className="relative w-full max-w-lg rounded-xl border border-border-strong bg-surface p-6 shadow-2xl">
            {freshKey ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Copy this key now</p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      It is stored hashed — this is the only time it can be shown. If you lose it, revoke the key and create another.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input readOnly value={freshKey} className="bg-surface-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <Button type="button" onClick={copy} className="shrink-0 gap-1.5">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    I&apos;ve saved it
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">New API key</h3>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={closeModal}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="key-name">Name</Label>
                  <Input id="key-name" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Storefront (production)" className="bg-surface-2" />
                  <p className="text-[11px] text-neutral-500">Name it after where it will be used, so you know what breaks if you revoke it.</p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" disabled={create.isPending} className="gap-2">
                    {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create key
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
