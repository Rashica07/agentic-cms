'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings, useUpdateSettings, type PrivacySettings } from '@/hooks/useSettings';

const DEFAULTS: Required<PrivacySettings> = {
  searchIndexing: true,
  analyticsTracking: true,
  cookieBanner: true,
  twoFactorRequired: false,
  dataRetentionDays: 365,
};

const TOGGLES: { key: keyof PrivacySettings; label: string; desc: string }[] = [
  { key: 'searchIndexing', label: 'Search engine indexing', desc: 'Allow search engines to index your public site.' },
  { key: 'analyticsTracking', label: 'Analytics tracking', desc: 'Collect anonymous traffic and event analytics.' },
  { key: 'cookieBanner', label: 'Cookie consent banner', desc: 'Show a consent banner to visitors in the EU/UK.' },
  { key: 'twoFactorRequired', label: 'Require two-factor auth', desc: 'Require all workspace members to enable 2FA at login.' },
];

export default function PrivacySecuritySettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canManage = role === 'admin' || role === 'super_admin';

  const { settings, isLoading } = useSettings();
  const { mutate: save, isPending } = useUpdateSettings();

  const [form, setForm] = useState<PrivacySettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isLoading || dirty) return;
    setForm({ ...DEFAULTS, ...(settings.privacy ?? {}) });
  }, [settings.privacy, isLoading, dirty]);

  const submit = () => {
    save(
      { privacy: form },
      {
        onSuccess: () => { setDirty(false); toast.success('Privacy & security settings saved'); },
        onError: (e: any) => toast.error(e?.message || 'Could not save'),
      },
    );
  };

  return (
    <div className="space-y-6 pb-10 anim-fade-in">
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="bg-brand/10 w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-brand-fg" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Privacy & Security</CardTitle>
              <CardDescription className="mt-0.5">
                Control how visitor data is handled and how members sign in to this workspace.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {!canManage && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-neutral-400">
              <Lock className="h-3.5 w-3.5 shrink-0" /> Only admins can change privacy & security settings.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {TOGGLES.map((r) => <div key={r.key} className="h-14 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/50">
                {TOGGLES.map((r) => (
                  <div key={r.key} className="flex items-center justify-between gap-4 py-4 first:pt-0">
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-foreground">{r.label}</h4>
                      <p className="text-[13px] text-neutral-400 mt-0.5">{r.desc}</p>
                    </div>
                    <Switch
                      checked={!!form[r.key]}
                      onCheckedChange={(checked) => { setForm({ ...form, [r.key]: checked }); setDirty(true); }}
                      disabled={!canManage || isPending}
                      className="data-checked:bg-brand shrink-0"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-border/50 pt-5">
                <div className="min-w-0">
                  <Label htmlFor="retention" className="text-sm font-medium text-foreground">Data retention (days)</Label>
                  <p className="text-[13px] text-neutral-400 mt-0.5">How long to keep analytics and activity records before pruning.</p>
                </div>
                <Input
                  id="retention"
                  type="number"
                  min={30}
                  max={3650}
                  value={form.dataRetentionDays ?? 365}
                  disabled={!canManage || isPending}
                  onChange={(e) => { setForm({ ...form, dataRetentionDays: Number(e.target.value) }); setDirty(true); }}
                  className="w-28 bg-surface-2 shrink-0"
                />
              </div>
            </>
          )}

          {canManage && (
            <div className="flex justify-end pt-6">
              <Button onClick={submit} disabled={!dirty || isPending} className="gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
