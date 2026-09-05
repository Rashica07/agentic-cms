'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Mail, Phone, Building2, Trash2, Send, StickyNote, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useContact, useContactMutations, LIFECYCLE_STAGES, STAGE_TONE, type ContactLifecycleStage } from '@/hooks/useCrm';

const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: contact, isLoading } = useContact(id);
  const { update, remove, addNote } = useContactMutations();
  const [noteBody, setNoteBody] = useState('');

  const setStage = async (lifecycleStage: ContactLifecycleStage) => {
    if (!contact) return;
    try {
      await update.mutateAsync({ id: contact.id, data: { lifecycleStage } });
      toast.success(`Moved to ${lifecycleStage}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not update stage');
    }
  };

  const del = async () => {
    if (!contact) return;
    if (!confirm(`Delete ${contact.name}?`)) return;
    try {
      await remove.mutateAsync(contact.id);
      toast.success('Contact deleted');
      router.push('/dashboard/crm');
    } catch (err: any) {
      toast.error(err.message || 'Could not delete contact');
    }
  };

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !noteBody.trim()) return;
    try {
      await addNote.mutateAsync({ id: contact.id, body: noteBody.trim() });
      setNoteBody('');
    } catch (err: any) {
      toast.error(err.message || 'Could not add note');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-24 text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!contact) return null;

  return (
    <div className="max-w-4xl space-y-6 pb-10 anim-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-neutral-400" onClick={() => router.push('/dashboard/crm')}>
          <ArrowLeft className="h-4 w-4" /> Contacts
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:bg-red-500/10 hover:text-red-400" onClick={del}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xl font-semibold text-neutral-300">
            {contact.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{contact.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-neutral-400">
              {contact.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {contact.email}</span>}
              {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {contact.phone}</span>}
              {contact.company && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {contact.company}</span>}
            </p>
          </div>
        </div>

        {/* Stage pipeline control */}
        <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
          {LIFECYCLE_STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              disabled={update.isPending}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                contact.lifecycleStage === s ? cn(STAGE_TONE[s], 'font-bold') : 'text-neutral-400 hover:text-neutral-200',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="bg-surface border-border shadow-sm lg:col-span-1">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-semibold">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-5 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Source</span><span className="text-neutral-300">{contact.source ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Last contact</span><span className="text-neutral-300">{contact.lastContactedAt ? timeAgo(contact.lastContactedAt) : 'never'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Created</span><span className="text-neutral-300">{timeAgo(contact.createdAt)}</span></div>
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {contact.tags.map((t) => (
                  <span key={t} className="rounded bg-surface-2 px-2 py-0.5 text-[10px] text-neutral-400">{t}</span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related reservations (linked via reservation.contactId) */}
        {contact.reservations.length > 0 && (
          <Card className="bg-surface border-border shadow-sm lg:col-span-3">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CalendarCheck className="h-4 w-4 text-brand" /> Reservations
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/50 p-0">
              {contact.reservations.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-neutral-300">{new Date(r.startsAt).toLocaleString()}</span>
                  <span className="text-neutral-500">{r.partySize} people</span>
                  <span className="text-[11px] font-medium capitalize text-neutral-400">{r.status.replace('_', ' ')}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notes timeline */}
        <Card className="bg-surface border-border shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <StickyNote className="h-4 w-4 text-brand" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <form onSubmit={submitNote} className="flex gap-2">
              <Input value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a note…" className="bg-surface-2 text-sm" />
              <Button type="submit" size="icon" disabled={addNote.isPending || !noteBody.trim()} className="shrink-0">
                {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>

            {contact.notes.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {contact.notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-border/50 bg-surface-2/50 p-3">
                    <p className="text-sm text-neutral-200">{n.body}</p>
                    <p className="mt-1.5 text-[10px] text-neutral-500">{timeAgo(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
