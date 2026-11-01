'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users2, Plus, Loader2, X, Search, Building2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useContacts, useContactMutations, LIFECYCLE_STAGES, STAGE_TONE,
  type ContactLifecycleStage,
} from '@/hooks/useCrm';

const timeAgo = (iso: string | null) => {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function CrmPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [stage, setStage] = useState<ContactLifecycleStage | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // 300ms debounce so search doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useContacts({ q: debouncedQ || undefined, stage: stage === 'all' ? undefined : stage });
  const contacts = data?.items ?? [];

  return (
    <div className="max-w-6xl space-y-6 pb-10 anim-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.01em] text-foreground">
            <Users2 className="h-6 w-6 text-brand-fg" /> CRM
          </h1>
          <p className="mt-1 text-sm text-neutral-400">Contacts, notes, and pipeline — {data?.total ?? 0} total.</p>
        </div>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New contact
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, company…" className="bg-surface-2 pl-8 text-sm" />
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
          {(['all', ...LIFECYCLE_STAGES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                stage === s ? 'bg-brand text-foreground' : 'text-neutral-400 hover:text-neutral-200',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-surface border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !contacts.length ? (
            <div className="py-16 text-center">
              <Users2 className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
              <p className="text-sm font-medium text-neutral-400">No contacts yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
                Add one manually, or they'll appear automatically from form submissions and reservations.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {contacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/crm/${c.id}`}
                  className="group flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-2/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-neutral-300">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', STAGE_TONE[c.lifecycleStage])}>
                        {c.lifecycleStage}
                      </span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 truncate text-[11px] text-neutral-500">
                      {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
                      {c.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {c.company}</span>}
                    </p>
                  </div>

                  <div className="shrink-0 text-right text-[11px] text-neutral-500">
                    <p>Last contact</p>
                    <p className="text-neutral-400">{timeAgo(c.lastContactedAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && <NewContactModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function NewContactModal({ onClose }: { onClose: () => void }) {
  const { create } = useContactMutations();
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    try {
      await create.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
      });
      toast.success('Contact created');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Could not create contact');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-lg space-y-4 rounded-xl border border-border-strong bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">New contact</h3>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-surface-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-surface-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-surface-2" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="bg-surface-2" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </Button>
        </div>
      </form>
    </div>
  );
}
