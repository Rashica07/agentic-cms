'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Plus, Loader2, X, Send, CalendarClock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCampaigns, useCampaignMutations, CAMPAIGN_STATUS_TONE, type Campaign, type CampaignStatus } from '@/hooks/useEmail';

const STATUS_FILTERS = ['all', 'draft', 'scheduled', 'sending', 'sent', 'failed'] as const;

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : null);

export default function EmailPage() {
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useCampaigns();
  const filtered = status === 'all' ? campaigns : campaigns.filter((c) => c.status === status);

  return (
    <div className="max-w-6xl space-y-6 pb-10 anim-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Mail className="h-6 w-6 text-brand" /> Email campaigns
          </h1>
          <p className="mt-1 text-sm text-neutral-400">Newsletters and announcements to your CRM contacts.</p>
        </div>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1 w-fit">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
              status === s ? 'bg-brand text-foreground' : 'text-neutral-400 hover:text-neutral-200',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <Card className="bg-surface border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !filtered.length ? (
            <div className="py-16 text-center">
              <Mail className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
              <p className="text-sm font-medium text-neutral-400">
                {status === 'all' ? 'No campaigns yet' : `No ${status} campaigns`}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
                Create one to email your contacts — audiences come straight from your CRM stages and tags.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((c) => (
                <CampaignRow key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && <NewCampaignModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function CampaignRow({ campaign: c }: { campaign: Campaign }) {
  const sub = subtitle(c);
  return (
    <Link
      href={`/dashboard/email/${c.id}`}
      className="group flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-2/30"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-neutral-300">
        {c.status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', CAMPAIGN_STATUS_TONE[c.status])}>
            {c.status}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-neutral-500">{c.subject}</p>
      </div>

      <div className="shrink-0 text-right text-[11px] text-neutral-500">
        {sub.icon}
        <p className="text-neutral-400">{sub.text}</p>
      </div>
    </Link>
  );
}

function subtitle(c: Campaign): { icon: React.ReactNode; text: string } {
  if (c.status === 'sent') {
    const { sent = 0, failed = 0 } = c.stats ?? {};
    return {
      icon: <p className="flex items-center justify-end gap-1"><Send className="h-3 w-3" /> Sent {formatDate(c.sentAt) ?? ''}</p>,
      text: failed ? `${sent} delivered · ${failed} failed` : `${sent} delivered`,
    };
  }
  if (c.status === 'failed') {
    return {
      icon: <p className="flex items-center justify-end gap-1 text-red-400"><AlertTriangle className="h-3 w-3" /> Failed</p>,
      text: c.lastError ?? 'Send failed',
    };
  }
  if (c.status === 'scheduled') {
    return {
      icon: <p className="flex items-center justify-end gap-1"><CalendarClock className="h-3 w-3" /> Scheduled</p>,
      text: formatDate(c.scheduledAt) ?? '',
    };
  }
  if (c.status === 'sending') {
    return { icon: <p>Sending…</p>, text: `${c.stats?.sent ?? 0}/${c.stats?.total ?? '?'}` };
  }
  return { icon: <p>Draft</p>, text: `Edited ${formatDate(c.updatedAt) ?? ''}` };
}

function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { create } = useCampaignMutations();
  const [form, setForm] = useState({ name: '', subject: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    if (!form.subject.trim()) return toast.error('Subject is required');
    try {
      const created = await create.mutateAsync({ name: form.name.trim(), subject: form.subject.trim() });
      toast.success('Campaign created');
      router.push(`/dashboard/email/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not create campaign');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-lg space-y-4 rounded-xl border border-border-strong bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">New campaign</h3>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Internal name</Label>
            <Input id="name" autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="July newsletter" className="bg-surface-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Email subject</Label>
            <Input id="subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What's new this month ✨" className="bg-surface-2" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create & compose
          </Button>
        </div>
      </form>
    </div>
  );
}
