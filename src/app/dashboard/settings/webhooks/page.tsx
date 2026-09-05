'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Webhook as WebhookIcon, Plus, Trash2, Edit2, X, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useWebhooks, useWebhookMutations, WEBHOOK_EVENTS, type Webhook } from '@/hooks/useWebhooks';

const EMPTY = { name: '', url: '', events: [] as string[], secret: '' };

export default function WebhooksSettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const { data: webhooks, isLoading } = useWebhooks();
  const { create, update, remove } = useWebhookMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [form, setForm] = useState(EMPTY);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (hook: Webhook) => {
    setEditing(hook);
    setForm({ name: hook.name, url: hook.url, events: hook.events ?? [], secret: hook.secret ?? '' });
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url.startsWith('http')) return toast.error('URL must start with http:// or https://');
    if (form.events.length === 0) return toast.error('Pick at least one event');

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: { ...form, secret: form.secret || null } });
        toast.success('Webhook updated');
      } else {
        await create.mutateAsync({ ...form, secret: form.secret || undefined });
        toast.success('Webhook created');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save webhook');
    }
  };

  const toggleActive = async (hook: Webhook) => {
    try {
      await update.mutateAsync({ id: hook.id, data: { active: !hook.active } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update webhook');
    }
  };

  const del = async (hook: Webhook) => {
    if (!confirm(`Delete webhook “${hook.name}”? Events will stop being delivered to it.`)) return;
    try {
      await remove.mutateAsync(hook.id);
      toast.success('Webhook deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete webhook');
    }
  };

  if (!isAdmin) {
    return (
      <Card className="bg-surface border-border">
        <CardHeader className="py-10 text-center">
          <CardTitle className="text-lg">Admins only</CardTitle>
          <CardDescription className="mt-1">Webhook settings are restricted to workspace admins.</CardDescription>
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
              <WebhookIcon className="h-4 w-4 text-brand" /> Webhooks
            </CardTitle>
            <CardDescription>
              POST a signed payload to your systems whenever content changes.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Add webhook
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-14 text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !webhooks?.length ? (
            <div className="py-14 text-center">
              <WebhookIcon className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
              <p className="text-sm font-medium text-neutral-400">No webhooks yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
                Add one to notify an external service — a static-site rebuild, a Slack alert, a cache purge — the moment content publishes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {webhooks.map((hook) => (
                <div key={hook.id} className="group flex items-start gap-4 p-4 transition-colors hover:bg-surface-2/30">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{hook.name}</p>
                      {hook.secret ? (
                        <span title="Payloads are HMAC-signed" className="inline-flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-400">
                          <ShieldCheck className="h-2.5 w-2.5" /> Signed
                        </span>
                      ) : (
                        <span title="No signing secret set" className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                          <ShieldAlert className="h-2.5 w-2.5" /> Unsigned
                        </span>
                      )}
                    </div>
                    <p className="truncate font-mono text-[11px] text-neutral-500">{hook.url}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      {(hook.events ?? []).map((ev) => (
                        <span key={ev} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] text-neutral-400">
                          {ev}
                        </span>
                      ))}
                    </div>
                    {hook.lastTriggeredAt && (
                      <p className="text-[10px] text-neutral-600">
                        Last fired {formatDistanceToNow(new Date(hook.lastTriggeredAt), { addSuffix: true })}
                        {hook.lastStatus && (
                          <span className={cn('ml-1.5 font-medium', hook.lastStatus.startsWith('2') ? 'text-green-400' : 'text-red-400')}>
                            → {hook.lastStatus}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Switch checked={hook.active} onCheckedChange={() => toggleActive(hook)} title={hook.active ? 'Active' : 'Paused'} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100" onClick={() => openEdit(hook)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100" onClick={() => del(hook)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <form onSubmit={submit} className="relative w-full max-w-lg space-y-4 rounded-xl border border-border-strong bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{editing ? 'Edit webhook' : 'New webhook'}</h3>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wh-name">Name</Label>
              <Input id="wh-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rebuild storefront" className="bg-surface-2" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wh-url">Endpoint URL</Label>
              <Input id="wh-url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com/hooks/novus" className="bg-surface-2 font-mono text-xs" />
            </div>

            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-2">
                    <Checkbox
                      checked={form.events.includes(ev.value)}
                      onCheckedChange={(c) =>
                        setForm({
                          ...form,
                          events: c ? [...form.events, ev.value] : form.events.filter((x) => x !== ev.value),
                        })
                      }
                    />
                    <span className="text-xs text-neutral-300">{ev.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wh-secret">Signing secret <span className="text-neutral-500">(optional)</span></Label>
              <Input id="wh-secret" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="Leave blank to send unsigned" className="bg-surface-2 font-mono text-xs" />
              <p className="text-[11px] text-neutral-500">
                If set, each request carries an <span className="font-mono">X-Novus-Signature</span> HMAC-SHA256 header you can verify.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending} className="gap-2">
                {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create webhook'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
