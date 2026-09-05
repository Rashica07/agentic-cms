'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, X, Minus, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ContentType = { id: string; apiId: string; name: string };
type Permission = { id: string; contentTypeId: string; role: string; action: string; allowed: boolean };

const ROLES = ['editor', 'author', 'viewer'] as const;
const ACTIONS = ['create', 'read', 'update', 'publish', 'delete'] as const;
type Action = (typeof ACTIONS)[number];

/**
 * Mirrors DEFAULT_PERMISSIONS in the backend's content.service.ts — what each
 * role can do when no explicit override row exists. Admins are never
 * restrictable (the API rejects it with a 400), so they aren't shown.
 */
const DEFAULTS: Record<string, Action[]> = {
  editor: ['create', 'read', 'update', 'publish', 'delete'],
  author: ['create', 'read', 'update', 'delete'], // own content only, enforced server-side
  viewer: ['read'],
};

type CellState = 'default-allow' | 'default-deny' | 'allowed' | 'denied';

export function PermissionMatrix() {
  const [types, setTypes] = useState<ContentType[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/content/types')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ContentType[]) => {
        setTypes(data);
        if (data.length) setSelected((s) => s || data[0].apiId);
      })
      .catch(() => toast.error('Failed to load content types'))
      .finally(() => setLoading(false));
  }, []);

  const loadPerms = useCallback(async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/content/permissions?typeApiId=${encodeURIComponent(selected)}`);
      setPerms(res.ok ? await res.json() : []);
    } catch {
      setPerms([]);
    }
  }, [selected]);

  useEffect(() => {
    loadPerms();
  }, [loadPerms]);

  const stateFor = (role: string, action: Action): CellState => {
    const override = perms.find((p) => p.role === role && p.action === action);
    if (override) return override.allowed ? 'allowed' : 'denied';
    return DEFAULTS[role]?.includes(action) ? 'default-allow' : 'default-deny';
  };

  /** default → allowed → denied → default */
  const cycle = async (role: string, action: Action) => {
    const key = `${role}:${action}`;
    const current = stateFor(role, action);
    setBusy(key);
    try {
      if (current === 'allowed') {
        await set(role, action, false);
      } else if (current === 'denied') {
        const override = perms.find((p) => p.role === role && p.action === action);
        if (override) {
          const res = await fetch(`/api/content/permissions/${override.id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error(await res.text());
        }
      } else {
        await set(role, action, true);
      }
      await loadPerms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update permission');
    } finally {
      setBusy(null);
    }
  };

  const set = async (role: string, action: Action, allowed: boolean) => {
    const res = await fetch(`/api/content/permissions/${encodeURIComponent(selected)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, action, allowed }),
    });
    if (!res.ok) throw new Error(await res.text());
  };

  const overrideCount = perms.length;

  return (
    <Card className="bg-surface border-border shadow-sm">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-4 w-4 text-brand" /> Content permissions
            </CardTitle>
            <CardDescription>
              Override what each role can do, per content type. Admins always have full access.
            </CardDescription>
          </div>

          {types.length > 0 && (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="h-9 shrink-0 rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {types.map((t) => (
                <option key={t.id} value={t.apiId}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : types.length === 0 ? (
          <p className="py-12 text-center text-xs text-neutral-500">
            No content types yet — define one in the Schema Builder first.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/50 bg-surface-2/50 text-xs text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Role</th>
                    {ACTIONS.map((a) => (
                      <th key={a} className="px-2 py-3 text-center font-medium capitalize">{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {ROLES.map((role) => (
                    <tr key={role}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium capitalize text-foreground">{role}</p>
                        {role === 'author' && (
                          <p className="text-[10px] text-neutral-500">own content only</p>
                        )}
                      </td>
                      {ACTIONS.map((action) => {
                        const state = stateFor(role, action);
                        const isBusy = busy === `${role}:${action}`;
                        const isOverride = state === 'allowed' || state === 'denied';
                        const grants = state === 'allowed' || state === 'default-allow';

                        return (
                          <td key={action} className="px-2 py-3 text-center">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => cycle(role, action)}
                              title={
                                isOverride
                                  ? `Explicitly ${grants ? 'allowed' : 'denied'} — click to change`
                                  : `Default: ${grants ? 'allowed' : 'denied'} — click to override`
                              }
                              className={cn(
                                'mx-auto flex h-7 w-7 items-center justify-center rounded-md border transition-all',
                                isOverride && grants && 'border-green-500/40 bg-green-500/15 text-green-400',
                                isOverride && !grants && 'border-red-500/40 bg-red-500/15 text-red-400',
                                !isOverride && grants && 'border-transparent bg-surface-2 text-neutral-600 hover:border-border-strong',
                                !isOverride && !grants && 'border-transparent bg-surface-2/50 text-neutral-700 hover:border-border-strong',
                              )}
                            >
                              {isBusy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : grants ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : isOverride ? (
                                <X className="h-3.5 w-3.5" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/50 px-4 py-3 text-[10px] text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded border border-transparent bg-surface-2 text-neutral-600"><Check className="h-2.5 w-2.5" /></span>
                default allow
              </span>
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded border border-transparent bg-surface-2/50 text-neutral-700"><Minus className="h-2 w-2" /></span>
                default deny
              </span>
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded border border-green-500/40 bg-green-500/15 text-green-400"><Check className="h-2.5 w-2.5" /></span>
                explicitly allowed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded border border-red-500/40 bg-red-500/15 text-red-400"><X className="h-2.5 w-2.5" /></span>
                explicitly denied
              </span>
              <span className="ml-auto">
                Click cycles default → allow → deny.{overrideCount > 0 && ` ${overrideCount} override${overrideCount === 1 ? '' : 's'} on this type.`}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
