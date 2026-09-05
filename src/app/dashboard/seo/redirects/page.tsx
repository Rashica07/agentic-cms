'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowRightLeft, Plus, Trash2, Edit2, X, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRedirects, useRedirectMutations, type Redirect } from '@/hooks/useRedirects';

const EMPTY = { fromPath: '', toPath: '', statusCode: 301 };

export default function RedirectsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const { data: redirects, isLoading } = useRedirects();
  const { create, update, remove } = useRedirectMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Redirect | null>(null);
  const [form, setForm] = useState(EMPTY);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (r: Redirect) => {
    setEditing(r);
    setForm({ fromPath: r.fromPath, toPath: r.toPath, statusCode: r.statusCode });
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mirror the server's rules so users get the error before the round-trip.
    if (!form.fromPath.startsWith('/') || !form.toPath.startsWith('/')) {
      return toast.error('Both paths must start with /');
    }
    if (form.fromPath === form.toPath) {
      return toast.error('A path cannot redirect to itself');
    }

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: form });
        toast.success('Redirect updated');
      } else {
        await create.mutateAsync(form);
        toast.success('Redirect created');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save redirect');
    }
  };

  const toggleActive = async (r: Redirect) => {
    try {
      await update.mutateAsync({ id: r.id, data: { active: !r.active } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update redirect');
    }
  };

  const del = async (r: Redirect) => {
    if (!confirm(`Delete the redirect from ${r.fromPath}?`)) return;
    try {
      await remove.mutateAsync(r.id);
      toast.success('Redirect deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete redirect');
    }
  };

  return (
    <div className="max-w-5xl space-y-6 pb-10 anim-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/seo">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <ArrowRightLeft className="h-6 w-6 text-brand" /> Redirects
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Send old URLs to new ones so links and search rankings survive a restructure.
          </p>
        </div>
      </div>

      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Rules</CardTitle>
            <CardDescription>
              {redirects?.length ? `${redirects.length} rule${redirects.length === 1 ? '' : 's'}` : 'No rules yet'}
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={openCreate} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add redirect
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-14 text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !redirects?.length ? (
            <div className="py-14 text-center">
              <ArrowRightLeft className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
              <p className="text-sm font-medium text-neutral-400">No redirects yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
                Renamed a page? Add a rule from the old path to the new one so existing links don&apos;t 404.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/50 bg-surface-2/50 text-xs text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">From → To</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Hits</th>
                    <th className="px-4 py-3 font-medium">Active</th>
                    <th className="w-20 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {redirects.map((r) => (
                    <tr key={r.id} className={cn('group transition-colors hover:bg-surface-2/30', !r.active && 'opacity-50')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-neutral-300">{r.fromPath}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-neutral-600" />
                          <span className="text-brand">{r.toPath}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold',
                          r.statusCode === 301 ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400',
                        )}>
                          {r.statusCode}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-neutral-500 sm:table-cell tabular-nums">{r.hits ?? 0}</td>
                      <td className="px-4 py-3">
                        <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} disabled={!isAdmin} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-foreground" onClick={() => openEdit(r)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:bg-red-500/10 hover:text-red-400" onClick={() => del(r)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <form onSubmit={submit} className="relative w-full max-w-lg space-y-4 rounded-xl border border-border-strong bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{editing ? 'Edit redirect' : 'New redirect'}</h3>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="from">From path</Label>
              <Input id="from" required autoFocus value={form.fromPath} onChange={(e) => setForm({ ...form, fromPath: e.target.value })} placeholder="/old-page" className="bg-surface-2 font-mono text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="to">To path</Label>
              <Input id="to" required value={form.toPath} onChange={(e) => setForm({ ...form, toPath: e.target.value })} placeholder="/new-page" className="bg-surface-2 font-mono text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code">Type</Label>
              <select
                id="code"
                value={form.statusCode}
                onChange={(e) => setForm({ ...form, statusCode: Number(e.target.value) })}
                className="flex h-9 w-full rounded-md border border-border-strong bg-surface-2 px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
              >
                <option value={301}>301 — Permanent (passes SEO ranking)</option>
                <option value={302}>302 — Temporary</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending} className="gap-2">
                {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create redirect'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
