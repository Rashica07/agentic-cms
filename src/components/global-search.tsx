'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Search, CornerDownLeft, Loader2, FileText } from 'lucide-react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

type SearchHit = {
  id: string;
  slug: string;
  status: string;
  locale: string;
  typeApiId: string;
  updatedAt: string;
  snippet: string;
};

const STATUS_TONE: Record<string, string> = {
  published: 'bg-green-500/10 text-green-400',
  draft: 'bg-amber-500/10 text-amber-400',
  in_review: 'bg-blue-500/10 text-blue-400',
  scheduled: 'bg-purple-500/10 text-purple-400',
  archived: 'bg-neutral-500/10 text-neutral-400',
};

/**
 * ⌘K command palette over cross-content search (GET /content/search).
 * Rendered once by the dashboard layout; the header's search box opens it.
 */
export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K toggles, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Reset + focus each time it opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setDebounced('');
      setCursor(0);
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  // 300ms debounce so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery<{ items: SearchHit[]; total: number }>({
    queryKey: ['global-search', activeTenantId, debounced],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.searchContent(debounced, { limit: 20 });
    },
    enabled: open && !!session?.accessToken && debounced.length > 0,
    staleTime: 10_000,
  });

  const hits = useMemo(() => data?.items ?? [], [data]);

  // Group hits by content type, preserving the API's relevance/recency order.
  const groups = useMemo(() => {
    const byType = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      const list = byType.get(hit.typeApiId) ?? [];
      list.push(hit);
      byType.set(hit.typeApiId, list);
    }
    return Array.from(byType.entries());
  }, [hits]);

  // Flat order must match render order for arrow-key navigation to line up.
  const flat = useMemo(() => groups.flatMap(([, items]) => items), [groups]);

  useEffect(() => {
    if (cursor > flat.length - 1) setCursor(0);
  }, [flat.length, cursor]);

  const go = (hit: SearchHit) => {
    onOpenChange(false);
    router.push(`/dashboard/content/${hit.typeApiId}/${hit.id}`);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && flat[cursor]) {
      e.preventDefault();
      go(flat[cursor]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      <div className="relative w-full max-w-xl rounded-xl border border-border-strong bg-surface shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4">
          {isFetching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-neutral-500" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search all content…"
            className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-neutral-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[52vh] overflow-y-auto custom-scrollbar">
          {!debounced ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">
              Search across every content type by title, slug, or field content.
            </p>
          ) : flat.length === 0 && !isFetching ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">
              No results for “{debounced}”.
            </p>
          ) : (
            groups.map(([typeApiId, items]) => (
              <div key={typeApiId} className="py-1.5">
                <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {typeApiId}
                </p>
                {items.map((hit) => {
                  const index = flat.indexOf(hit);
                  const active = index === cursor;
                  return (
                    <button
                      key={hit.id}
                      type="button"
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => go(hit)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors',
                        active ? 'bg-brand/10' : 'hover:bg-surface-2',
                      )}
                    >
                      <FileText className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-brand' : 'text-neutral-500')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{hit.slug}</span>
                          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', STATUS_TONE[hit.status] ?? STATUS_TONE.archived)}>
                            {hit.status.replace('_', ' ')}
                          </span>
                          <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium uppercase text-neutral-400">
                            {hit.locale}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">{hit.snippet}</p>
                      </div>
                      {active && <CornerDownLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-surface-2/50 px-4 py-2 text-[10px] text-neutral-500">
          <span>{data?.total ? `${data.total} result${data.total === 1 ? '' : 's'}` : 'Content search'}</span>
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-border-strong bg-surface px-1">↑↓</kbd> navigate
            <kbd className="rounded border border-border-strong bg-surface px-1">↵</kbd> open
          </span>
        </div>
      </div>
    </div>
  );
}
