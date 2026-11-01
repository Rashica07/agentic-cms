'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X, Plus, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type RefEntry = {
  id: string;
  slug: string;
  status: string;
  data: Record<string, any>;
};

/**
 * Resolves the referenced content type's apiId from a field's config.
 * The Schema Builder writes `targetApiId`; older/seeded fields may carry
 * `referenceTypeApiId`, and the build plan spec'd `referenceTypeId`.
 * Accept all three so no existing field silently breaks.
 */
export function referenceTarget(config: Record<string, any> | undefined): string | null {
  return config?.targetApiId ?? config?.referenceTypeApiId ?? config?.referenceTypeId ?? null;
}

/** Best-effort human label for an entry — falls back to the slug. */
function entryLabel(entry: RefEntry): string {
  for (const key of ['title', 'name', 'heading', 'label']) {
    const v = entry.data?.[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return entry.slug;
}

export function ReferencePicker({
  value,
  onChange,
  config,
  multiple,
  /** Prevents an entry referencing itself (e.g. a category being its own parent). */
  excludeId,
}: {
  value: any;
  onChange: (value: string | string[] | null) => void;
  config: Record<string, any> | undefined;
  multiple?: boolean;
  excludeId?: string;
}) {
  const targetApiId = referenceTarget(config);
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<RefEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // The backend stores ids; `resolve=true` reads hydrate them into objects.
  // Normalise both shapes to a plain id list.
  const selectedIds: string[] = useMemo(() => {
    const toId = (v: any) => (typeof v === 'string' ? v : v?.id);
    if (Array.isArray(value)) return value.map(toId).filter(Boolean);
    const single = toId(value);
    return single ? [single] : [];
  }, [value]);

  useEffect(() => {
    if (!open || !targetApiId || entries.length > 0) return;
    setLoading(true);
    fetch(`/api/content/entries/${targetApiId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [open, targetApiId, entries.length]);

  // Selected chips need labels even before the modal has ever been opened.
  useEffect(() => {
    if (!targetApiId || selectedIds.length === 0 || entries.length > 0) return;
    fetch(`/api/content/entries/${targetApiId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [targetApiId, selectedIds.length, entries.length]);

  if (!targetApiId) {
    return (
      <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
        This reference field has no target content type set. Fix it in the Schema Builder.
      </p>
    );
  }

  const byId = new Map(entries.map((e) => [e.id, e]));
  const available = entries.filter(
    (e) => e.id !== excludeId && entryLabel(e).toLowerCase().includes(search.toLowerCase()),
  );

  const select = (id: string) => {
    if (multiple) {
      onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    } else {
      onChange(selectedIds[0] === id ? null : id);
      setOpen(false);
    }
  };

  const remove = (id: string) => {
    if (multiple) onChange(selectedIds.filter((x) => x !== id));
    else onChange(null);
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.map((id) => {
          const entry = byId.get(id);
          return (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-2 py-1 pl-2 pr-1 text-xs text-foreground">
              <Link2 className="h-3 w-3 shrink-0 text-brand-fg" />
              {entry ? entryLabel(entry) : <span className="font-mono text-neutral-500">{id.slice(0, 8)}…</span>}
              <button type="button" onClick={() => remove(id)} className="rounded p-0.5 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}

        {(multiple || selectedIds.length === 0) && (
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setOpen(true)}>
            <Plus className="h-3 w-3" />
            {selectedIds.length === 0 ? `Select ${targetApiId}` : 'Add another'}
          </Button>
        )}
      </div>

      {/* Picker modal */}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Select {targetApiId}</h3>
                <p className="text-[11px] text-neutral-500">{multiple ? 'Choose one or more entries' : 'Choose one entry'}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries..." className="h-8 bg-surface-2 pl-9 text-xs" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : available.length === 0 ? (
                <p className="py-10 text-center text-xs text-neutral-500">
                  No {targetApiId} entries {search ? 'match your search' : 'exist yet'}.
                </p>
              ) : (
                available.map((entry) => {
                  const active = selectedIds.includes(entry.id);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => select(entry.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        active ? 'bg-brand/10' : 'hover:bg-surface-2',
                      )}
                    >
                      <div className="min-w-0">
                        <p className={cn('truncate text-sm font-medium', active ? 'text-brand-fg' : 'text-foreground')}>{entryLabel(entry)}</p>
                        <p className="truncate font-mono text-[10px] text-neutral-500">{entry.slug}</p>
                      </div>
                      <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-bold uppercase text-neutral-400">
                        {entry.status}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {multiple && (
              <div className="border-t border-border p-3">
                <Button type="button" size="sm" className="w-full" onClick={() => setOpen(false)}>
                  Done ({selectedIds.length} selected)
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
