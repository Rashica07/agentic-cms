'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollText, Loader2, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings, useUpdateSettings, type PolicySettings } from '@/hooks/useSettings';

const FIELDS: { key: keyof PolicySettings; label: string; placeholder: string }[] = [
  { key: 'refund', label: 'Refund policy', placeholder: 'Describe your refund and returns policy…' },
  { key: 'privacy', label: 'Privacy policy', placeholder: 'How you collect, use, and protect customer data…' },
  { key: 'terms', label: 'Terms of service', placeholder: 'The terms customers agree to when using your site…' },
];

export default function PoliciesSettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canManage = role === 'admin' || role === 'super_admin';

  const { settings, isLoading } = useSettings();
  const { mutate: save, isPending } = useUpdateSettings();

  const [form, setForm] = useState<PolicySettings>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isLoading || dirty) return;
    setForm(settings.policies ?? {});
  }, [settings.policies, isLoading, dirty]);

  const submit = () => {
    save(
      { policies: form },
      {
        onSuccess: () => { setDirty(false); toast.success('Policies saved'); },
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
              <ScrollText className="h-5 w-5 text-brand" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Policies</CardTitle>
              <CardDescription className="mt-0.5">
                Publish your refund, privacy, and terms copy so it can be linked from your site footer.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-5">
          {!canManage && (
            <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-neutral-400">
              <Lock className="h-3.5 w-3.5 shrink-0" /> Only admins can edit policies.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {FIELDS.map((f) => <div key={f.key} className="h-32 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : (
            FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                <textarea
                  id={f.key}
                  value={form[f.key] ?? ''}
                  disabled={!canManage || isPending}
                  onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setDirty(true); }}
                  placeholder={f.placeholder}
                  className="min-h-[140px] w-full resize-y rounded-lg border border-border bg-surface-2 p-3 text-sm text-neutral-200 outline-none focus:border-brand/50 disabled:opacity-60"
                />
              </div>
            ))
          )}

          {canManage && (
            <div className="flex justify-end pt-1">
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
