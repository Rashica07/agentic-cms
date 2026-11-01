'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FolderTree, Plus, Trash2, Check, X, ChevronRight, ChevronDown, Tag as TagIcon, Loader2, CornerDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type TaxEntry = {
  id: string;
  slug: string;
  status: string;
  data: Record<string, any>;
};

/** Reference values are ids, or hydrated objects when read with resolve=true. */
const refId = (v: any): string | null => (typeof v === 'string' ? v : v?.id ?? null);
const nameOf = (e: TaxEntry) => e.data?.name || e.slug;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');

export default function TaxonomyPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<'categories' | 'tags'>('categories');
  const [categories, setCategories] = useState<TaxEntry[]>([]);
  const [tags, setTags] = useState<TaxEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch('/api/content/entries/category'),
        fetch('/api/content/entries/tag'),
      ]);
      setCategories(catRes.ok ? await catRes.json() : []);
      setTags(tagRes.ok ? await tagRes.json() : []);
    } catch {
      toast.error('Failed to load taxonomy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  return (
    <div className="space-y-6 max-w-5xl pb-10 anim-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.01em] text-foreground"> Taxonomy
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Built-in <span className="font-mono text-xs">category</span> and <span className="font-mono text-xs">tag</span> content types — reference them from any other type.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['categories', 'tags'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative px-4 py-2 text-sm font-medium capitalize transition-colors',
              tab === t ? 'text-brand-fg' : 'text-neutral-400 hover:text-neutral-200',
            )}
          >
            {t}
            <span className="ml-1.5 text-xs text-neutral-600">{t === 'categories' ? categories.length : tags.length}</span>
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : tab === 'categories' ? (
        <CategoryTree entries={categories} reload={load} />
      ) : (
        <TagGrid entries={tags} reload={load} />
      )}
    </div>
  );
}

// ─── CATEGORIES (hierarchical) ─────────────────────────────────────────────────

function CategoryTree({ entries, reload }: { entries: TaxEntry[]; reload: () => Promise<void> }) {
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [addingUnder, setAddingUnder] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // parentId → children. Roots keyed under ''.
  const byParent = useMemo(() => {
    const map = new Map<string, TaxEntry[]>();
    for (const e of entries) {
      const key = refId(e.data?.parent) ?? '';
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    for (const list of map.values()) list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    return map;
  }, [entries]);

  const create = async (name: string, parentId?: string) => {
    const clean = name.trim();
    if (!clean) return toast.error('Name is required');
    setBusy(true);
    try {
      const res = await fetch('/api/content/entries/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slugify(clean),
          status: 'published',
          data: { name: clean, ...(parentId ? { parent: parentId } : {}) },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Added “${clean}”`);
      setNewName('');
      setChildName('');
      setAddingUnder(null);
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const rename = async (entry: TaxEntry) => {
    const clean = editName.trim();
    if (!clean) return;
    try {
      const res = await fetch(`/api/content/entries/category/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { ...entry.data, name: clean } }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditingId(null);
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const remove = async (entry: TaxEntry) => {
    const kids = byParent.get(entry.id)?.length ?? 0;
    const msg = kids
      ? `“${nameOf(entry)}” has ${kids} sub-categor${kids === 1 ? 'y' : 'ies'}. They'll be left without a parent. Continue?`
      : `Delete “${nameOf(entry)}”?`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/content/entries/category/${entry.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Category deleted');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const renderNode = (entry: TaxEntry, depth: number): React.ReactNode => {
    const children = byParent.get(entry.id) ?? [];
    const isOpen = !collapsed.has(entry.id);
    return (
      <div key={entry.id}>
        <div
          className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/50"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {children.length > 0 ? (
            <button
              type="button"
              onClick={() => setCollapsed((p) => { const n = new Set(p); n.has(entry.id) ? n.delete(entry.id) : n.add(entry.id); return n; })}
              className="shrink-0 text-neutral-500 hover:text-foreground"
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {editingId === entry.id ? (
            <div className="flex flex-1 items-center gap-1.5">
              <Input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') rename(entry); if (e.key === 'Escape') setEditingId(null); }}
                className="h-7 max-w-xs bg-surface-2 text-sm"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400" onClick={() => rename(entry)}><Check className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-neutral-500" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setEditingId(entry.id); setEditName(nameOf(entry)); }}
                className="flex-1 truncate text-left text-sm font-medium text-foreground hover:text-brand-fg"
              >
                {nameOf(entry)}
              </button>
              <span className="hidden shrink-0 font-mono text-[10px] text-neutral-600 sm:inline">{entry.slug}</span>
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-neutral-400 hover:text-foreground" title="Add sub-category" onClick={() => { setAddingUnder(entry.id); setChildName(''); }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-neutral-400 hover:bg-red-500/10 hover:text-red-400" title="Delete" onClick={() => remove(entry)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>

        {addingUnder === entry.id && (
          <div className="flex items-center gap-1.5 py-1.5" style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}>
            <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
            <Input
              autoFocus
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') create(childName, entry.id); if (e.key === 'Escape') setAddingUnder(null); }}
              placeholder={`Sub-category of ${nameOf(entry)}…`}
              className="h-7 max-w-xs bg-surface-2 text-sm"
            />
            <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={() => create(childName, entry.id)}>Add</Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-neutral-500" onClick={() => setAddingUnder(null)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        )}

        {isOpen && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  const roots = byParent.get('') ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') create(newName); }}
          placeholder="New top-level category…"
          className="max-w-sm bg-surface-2 border-border-strong text-sm"
        />
        <Button disabled={busy} onClick={() => create(newName)} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-2">
        {roots.length === 0 ? (
          <div className="py-12 text-center">
            <FolderTree className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
            <p className="text-sm font-medium text-neutral-400">No categories yet</p>
            <p className="mt-1 text-xs text-neutral-500">Add one above, then nest sub-categories under it.</p>
          </div>
        ) : (
          roots.map((r) => renderNode(r, 0))
        )}
      </div>
    </div>
  );
}

// ─── TAGS (flat) ───────────────────────────────────────────────────────────────

function TagGrid({ entries, reload }: { entries: TaxEntry[]; reload: () => Promise<void> }) {
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const clean = newName.trim();
    if (!clean) return toast.error('Name is required');
    setBusy(true);
    try {
      const res = await fetch('/api/content/entries/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slugify(clean), status: 'published', data: { name: clean } }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Added “${clean}”`);
      setNewName('');
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: TaxEntry) => {
    if (!confirm(`Delete tag “${nameOf(entry)}”?`)) return;
    try {
      const res = await fetch(`/api/content/entries/tag/${entry.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      await reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const visible = entries.filter((e) => nameOf(e).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
          placeholder="New tag…"
          className="max-w-xs bg-surface-2 border-border-strong text-sm"
        />
        <Button disabled={busy} onClick={create} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </Button>
        {entries.length > 6 && (
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tags…"
            className="ml-auto max-w-[180px] bg-surface-2 border-border-strong text-sm"
          />
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        {visible.length === 0 ? (
          <div className="py-12 text-center">
            <TagIcon className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
            <p className="text-sm font-medium text-neutral-400">
              {entries.length === 0 ? 'No tags yet' : 'No tags match your filter'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {visible.map((tag) => (
              <span key={tag.id} className="group inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 py-1.5 pl-3 pr-1.5 text-sm text-foreground">
                <TagIcon className="h-3 w-3 shrink-0 text-brand-fg" />
                {nameOf(tag)}
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  className="rounded p-0.5 text-neutral-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
