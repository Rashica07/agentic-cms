'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Loader2, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings, useUpdateSettings, type NotificationSettings } from '@/hooks/useSettings';

const DEFAULTS: Required<NotificationSettings> = {
  emailEnabled: true,
  smsEnabled: false,
  orderUpdates: true,
  systemAlerts: true,
  weeklyDigest: false,
};

const ROWS: { key: keyof NotificationSettings; label: string; desc: string }[] = [
  { key: 'emailEnabled', label: 'Email notifications', desc: 'Receive notifications by email.' },
  { key: 'smsEnabled', label: 'SMS notifications', desc: 'Receive urgent alerts by text message.' },
  { key: 'orderUpdates', label: 'Order & booking updates', desc: 'New reservations, form submissions, and order events.' },
  { key: 'systemAlerts', label: 'System alerts', desc: 'Failed sends, integration errors, and security notices.' },
  { key: 'weeklyDigest', label: 'Weekly digest', desc: 'A Monday summary of activity across your workspace.' },
];

export default function NotificationsSettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canManage = role === 'admin' || role === 'super_admin';

  const { settings, isLoading } = useSettings();
  const { mutate: save, isPending } = useUpdateSettings();

  const [form, setForm] = useState<NotificationSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isLoading || dirty) return;
    setForm({ ...DEFAULTS, ...(settings.notifications ?? {}) });
  }, [settings.notifications, isLoading, dirty]);

  const submit = () => {
    save(
      { notifications: form },
      {
        onSuccess: () => { setDirty(false); toast.success('Notification preferences saved'); },
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
              <Bell className="h-5 w-5 text-brand" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
              <CardDescription className="mt-0.5">
                Choose how this workspace is notified about orders, activity, and system events.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {!canManage && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-neutral-400">
              <Lock className="h-3.5 w-3.5 shrink-0" /> Only admins can change notification settings.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {ROWS.map((r) => <div key={r.key} className="h-14 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {ROWS.map((r) => (
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
