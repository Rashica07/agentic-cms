'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Loader2, Send, CalendarClock, Trash2, Users2, Save,
  AlertTriangle, CheckCircle2, XCircle, Eye, Code2, FileText, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useCampaign, useCampaignMutations, useAudiencePreview, useEmailTemplates,
  CAMPAIGN_STATUS_TONE, type CampaignAudience,
} from '@/hooks/useEmail';
import { LIFECYCLE_STAGES, type ContactLifecycleStage } from '@/hooks/useCrm';

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaign(id);
  const { update, remove, send, schedule } = useCampaignMutations();

  const [form, setForm] = useState({ name: '', subject: '', fromName: '', fromEmail: '', html: '' });
  const [audience, setAudience] = useState<CampaignAudience>({});
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Hydrate the form once the campaign loads (and re-sync after saves).
  useEffect(() => {
    if (!campaign || dirty) return;
    setForm({
      name: campaign.name,
      subject: campaign.subject,
      fromName: campaign.fromName ?? '',
      fromEmail: campaign.fromEmail ?? '',
      html: campaign.html,
    });
    setAudience(campaign.audience ?? {});
  }, [campaign, dirty]);

  const audiencePreview = useAudiencePreview(audience);
  const editable = campaign?.status === 'draft' || campaign?.status === 'scheduled' || campaign?.status === 'failed';

  if (isLoading || !campaign) {
    return <div className="flex items-center justify-center py-24 text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const save = async () => {
    try {
      await update.mutateAsync({
        id: campaign.id,
        data: {
          name: form.name.trim(),
          subject: form.subject.trim(),
          fromName: form.fromName.trim() || null,
          fromEmail: form.fromEmail.trim() || null,
          html: form.html,
          audience,
        },
      });
      setDirty(false);
      toast.success('Saved');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Could not save');
      return false;
    }
  };

  const sendNow = async () => {
    const total = audiencePreview.data?.total ?? 0;
    if (!window.confirm(`Send "${form.subject}" to ${total} contact${total === 1 ? '' : 's'} now? This cannot be undone.`)) return;
    if (dirty && !(await save())) return;
    try {
      await send.mutateAsync(campaign.id);
      toast.success('Campaign is sending');
    } catch (err: any) {
      toast.error(err.message || 'Send failed');
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete campaign "${campaign.name}"?`)) return;
    try {
      await remove.mutateAsync(campaign.id);
      toast.success('Campaign deleted');
      router.push('/dashboard/email');
    } catch (err: any) {
      toast.error(err.message || 'Could not delete');
    }
  };

  return (
    <div className="max-w-6xl space-y-6 pb-10 anim-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/email" className="text-neutral-400 hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
              <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', CAMPAIGN_STATUS_TONE[campaign.status])}>
                {campaign.status}
              </span>
            </div>
            {campaign.status === 'scheduled' && campaign.scheduledAt && (
              <p className="mt-0.5 text-xs text-neutral-400">Scheduled for {new Date(campaign.scheduledAt).toLocaleString()}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editable && (
            <>
              <Button variant="outline" className="gap-2" onClick={save} disabled={update.isPending || !dirty}>
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setScheduleOpen(true)}>
                <CalendarClock className="h-4 w-4" /> Schedule
              </Button>
              <Button className="gap-2" onClick={sendNow} disabled={send.isPending || !form.html.trim()}>
                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send now
              </Button>
            </>
          )}
          {campaign.status !== 'sending' && (
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-red-400" onClick={del}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {campaign.status === 'failed' && campaign.lastError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Last send failed</p>
            <p className="mt-0.5 text-xs text-red-300/80">{campaign.lastError}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        {/* ── Composer ─────────────────────────────────────── */}
        <div className="space-y-4">
          <Card className="bg-surface border-border">
            <CardContent className="space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Internal name</Label>
                  <Input id="name" value={form.name} disabled={!editable}
                    onChange={(e) => { setForm({ ...form, name: e.target.value }); setDirty(true); }} className="bg-surface-2" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={form.subject} disabled={!editable}
                    onChange={(e) => { setForm({ ...form, subject: e.target.value }); setDirty(true); }} className="bg-surface-2" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fromName">From name</Label>
                  <Input id="fromName" value={form.fromName} disabled={!editable} placeholder="Your business"
                    onChange={(e) => { setForm({ ...form, fromName: e.target.value }); setDirty(true); }} className="bg-surface-2" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fromEmail">From email</Label>
                  <Input id="fromEmail" type="email" value={form.fromEmail} disabled={!editable} placeholder="Uses system default if empty"
                    onChange={(e) => { setForm({ ...form, fromEmail: e.target.value }); setDirty(true); }} className="bg-surface-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-0">
              <CardTitle className="text-sm text-neutral-300">Content (HTML)</CardTitle>
              <div className="flex items-center gap-1">
                {editable && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setTemplatesOpen(true)}>
                    <FileText className="h-3.5 w-3.5" /> Templates
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setPreview(!preview)}>
                  {preview ? <Code2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {preview ? 'Edit' : 'Preview'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {preview ? (
                <div className="min-h-[380px] rounded-lg border border-border bg-white">
                  <iframe title="Email preview" srcDoc={form.html} sandbox="" className="h-[380px] w-full rounded-lg" />
                </div>
              ) : (
                <textarea
                  value={form.html}
                  disabled={!editable}
                  onChange={(e) => { setForm({ ...form, html: e.target.value }); setDirty(true); }}
                  placeholder="<h1>Hello!</h1>\n<p>Write your email HTML here…</p>"
                  spellCheck={false}
                  className="min-h-[380px] w-full resize-y rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs text-neutral-200 outline-none focus:border-brand/50 disabled:opacity-60"
                />
              )}
              <p className="mt-2 text-[11px] text-neutral-500">
                An unsubscribe footer is appended automatically — required for marketing email.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar: audience + results ──────────────────── */}
        <div className="space-y-4">
          <Card className="bg-surface border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-neutral-300">
                <Users2 className="h-4 w-4 text-brand" /> Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="space-y-1.5">
                <Label className="text-xs">Lifecycle stage</Label>
                <div className="flex flex-wrap gap-1">
                  {(['all', ...LIFECYCLE_STAGES] as const).map((s) => (
                    <button
                      key={s}
                      disabled={!editable}
                      onClick={() => {
                        setAudience({ ...audience, stage: s === 'all' ? undefined : (s as ContactLifecycleStage) });
                        setDirty(true);
                      }}
                      className={cn(
                        'rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors disabled:opacity-60',
                        (audience.stage ?? 'all') === s ? 'bg-brand text-foreground' : 'bg-surface-2 text-neutral-400 hover:text-neutral-200',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tag" className="text-xs">Tag (optional)</Label>
                <Input id="tag" value={audience.tag ?? ''} disabled={!editable} placeholder="e.g. vip"
                  onChange={(e) => { setAudience({ ...audience, tag: e.target.value || undefined }); setDirty(true); }}
                  className="bg-surface-2 text-sm" />
              </div>

              <div className="rounded-lg border border-border bg-surface-2/50 p-3 text-center">
                {audiencePreview.isLoading ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-neutral-500" />
                ) : (
                  <>
                    <p className="text-xl font-bold text-foreground">{audiencePreview.data?.total ?? 0}</p>
                    <p className="text-[11px] text-neutral-500">subscribed contacts will receive this</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {(campaign.status === 'sent' || campaign.status === 'sending' || campaign.status === 'failed') && (
            <Card className="bg-surface border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-neutral-300">Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Total" value={campaign.stats?.total ?? 0} />
                  <Stat label="Sent" value={campaign.stats?.sent ?? 0} tone="text-green-400" />
                  <Stat label="Failed" value={campaign.stats?.failed ?? 0} tone={campaign.stats?.failed ? 'text-red-400' : undefined} />
                </div>

                {campaign.recipients?.length > 0 && (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {campaign.recipients.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 rounded px-2 py-1 text-[11px]">
                        {r.status === 'sent' ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-green-400" />
                        ) : r.status === 'failed' ? (
                          <XCircle className="h-3 w-3 shrink-0 text-red-400" />
                        ) : (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-neutral-500" />
                        )}
                        <span className="truncate text-neutral-400">{r.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {scheduleOpen && (
        <ScheduleModal
          onClose={() => setScheduleOpen(false)}
          onSchedule={async (when) => {
            if (dirty && !(await save())) return;
            try {
              await schedule.mutateAsync({ id: campaign.id, scheduledAt: when });
              toast.success('Campaign scheduled');
              setScheduleOpen(false);
            } catch (err: any) {
              toast.error(err.message || 'Could not schedule');
            }
          }}
          pending={schedule.isPending}
        />
      )}

      {templatesOpen && (
        <TemplatePickerModal
          onClose={() => setTemplatesOpen(false)}
          onPick={(t) => {
            setForm({ ...form, html: t.html, subject: form.subject || t.subject });
            setDirty(true);
            setTemplatesOpen(false);
            toast.success(`Template "${t.name}" applied`);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-2">
      <p className={cn('text-lg font-bold text-foreground', tone)}>{value}</p>
      <p className="text-[10px] text-neutral-500">{label}</p>
    </div>
  );
}

function ScheduleModal({ onClose, onSchedule, pending }: {
  onClose: () => void;
  onSchedule: (isoWhen: string) => void;
  pending: boolean;
}) {
  const [when, setWhen] = useState('');

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm space-y-4 rounded-xl border border-border-strong bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Schedule send</h3>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="when">Send at</Label>
          <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="bg-surface-2" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!when || pending}
            className="gap-2"
            onClick={() => onSchedule(new Date(when).toISOString())}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}

function TemplatePickerModal({ onClose, onPick }: {
  onClose: () => void;
  onPick: (t: { name: string; subject: string; html: string }) => void;
}) {
  const { data: templates = [], isLoading } = useEmailTemplates();

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md space-y-4 rounded-xl border border-border-strong bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Apply a template</h3>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-neutral-500" /></div>
        ) : !templates.length ? (
          <p className="py-6 text-center text-sm text-neutral-500">No templates yet.</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t)}
                className="w-full rounded-lg border border-border bg-surface-2/50 p-3 text-left transition-colors hover:border-brand/40"
              >
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                {t.subject && <p className="mt-0.5 truncate text-[11px] text-neutral-500">{t.subject}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
