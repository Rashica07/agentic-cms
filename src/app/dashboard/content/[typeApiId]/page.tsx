'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit2, Trash2, ArrowLeft, Layers, RefreshCcw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ContentType = {
  id: string;
  apiId: string;
  name: string;
  fields: any[];
};

type ContentEntry = {
  id: string;
  slug: string;
  status: string;
  locale: string;
  data: Record<string, any>;
  publishedAt: string | null;
  updatedAt: string;
  deletedAt: string | null;
};

export default function ContentEntriesPage({ params }: { params: Promise<{ typeApiId: string }> }) {
  const { typeApiId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  
  const [type, setType] = useState<ContentType | null>(null);
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, typeApiId]);

  const fetchData = async () => {
    try {
      const typeRes = await fetch(`/api/content/types/${typeApiId}`);
      if (!typeRes.ok) throw new Error('Content type not found');
      const typeData = await typeRes.json();
      setType(typeData);

      const entriesRes = await fetch(`/api/content/entries/${typeApiId}?includeTrashed=true`);
      if (!entriesRes.ok) throw new Error('Failed to fetch entries');
      const entriesData = await entriesRes.json();
      setEntries(entriesData);
    } catch (err: any) {
      toast.error(err.message);
      router.push('/dashboard/content');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, isTrashView: boolean) => {
    if (!confirm(isTrashView ? 'This is already in trash, permanent delete is not yet implemented. Still remove from view?' : 'Are you sure you want to trash this entry?')) return;
    try {
      const res = await fetch(`/api/content/entries/${typeApiId}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete entry');
      toast.success('Entry moved to trash');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/content/entries/${typeApiId}/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const copy = await res.json();
      toast.success(`Duplicated as “${copy.slug}”`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/content/entries/${typeApiId}/${id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to restore entry');
      toast.success('Entry restored');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBulkAction = async (action: 'publish' | 'archive' | 'trash' | 'restore') => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to ${action} ${selectedIds.size} items?`)) return;
    
    try {
      const res = await fetch(`/api/content/entries/${typeApiId}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action })
      });
      if (!res.ok) throw new Error(`Failed to bulk ${action}`);
      toast.success(`Items successfully updated`);
      setSelectedIds(new Set());
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleSelectAll = (checked: boolean, filtered: ContentEntry[]) => {
    if (checked) {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  let filteredEntries = entries.filter(e => {
    if (filter === 'trash') return e.deletedAt !== null;
    if (e.deletedAt !== null) return false;
    if (filter !== 'all' && e.status !== filter) return false;
    return true;
  });

  filteredEntries = filteredEntries.filter(e => 
    e.slug.toLowerCase().includes(search.toLowerCase()) || 
    (e.data.title && e.data.title.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="p-8">Loading entries...</div>;
  if (!type) return null;

  const displayField = type.fields.find(f => ['title', 'name', 'heading'].includes(f.apiId))?.apiId || type.fields[0]?.apiId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/content')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{type.name}</h1>
          <p className="text-neutral-400 mt-1">Manage entries for {type.name.toLowerCase()}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 max-w-md flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entries..." 
              className="pl-9 bg-surface-2 border-border-strong"
            />
          </div>
          <select 
            value={filter}
            onChange={e => { setFilter(e.target.value); setSelectedIds(new Set()); }}
            className="flex h-9 rounded-md border border-border-strong bg-surface px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none"
          >
            <option value="all">All Active</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="in_review">In Review</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
            <option value="trash">Trash</option>
          </select>
        </div>
        <Link href={`/dashboard/content/${typeApiId}/new`}>
          <Button className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="h-4 w-4" /> Create New
          </Button>
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {selectedIds.size > 0 && (
          <div className="bg-brand/10 border-b border-brand/20 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-brand">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              {filter === 'trash' ? (
                <Button size="sm" variant="outline" className="h-7 text-xs border-brand/20 text-brand" onClick={() => handleBulkAction('restore')}>Restore Selected</Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkAction('publish')}>Publish</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkAction('archive')}>Archive</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => handleBulkAction('trash')}>Trash</Button>
                </>
              )}
            </div>
          </div>
        )}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 bg-surface-2/50 border-b border-border/50">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-neutral-600 bg-neutral-800"
                    checked={filteredEntries.length > 0 && selectedIds.size === filteredEntries.length}
                    onChange={e => toggleSelectAll(e.target.checked, filteredEntries)}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Entry</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Last Modified</th>
                <th className="px-4 py-3 font-medium text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredEntries.map(entry => {
                const isTrash = entry.deletedAt !== null;
                const statusColors: any = {
                  draft: 'bg-neutral-500/10 text-neutral-400',
                  published: 'bg-green-500/10 text-green-400',
                  in_review: 'bg-yellow-500/10 text-yellow-400',
                  scheduled: 'bg-blue-500/10 text-blue-400',
                  archived: 'bg-orange-500/10 text-orange-400',
                };
                return (
                  <tr key={entry.id} className="hover:bg-surface-2/30 transition-colors group">
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-neutral-600 bg-neutral-800"
                        checked={selectedIds.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/content/${typeApiId}/${entry.id}`} className="font-medium text-foreground hover:text-brand transition-colors">
                        {displayField && entry.data[displayField] ? String(entry.data[displayField]) : 'Untitled'}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-neutral-500">{entry.slug}</span>
                        {entry.locale && (
                          <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium uppercase text-neutral-400">
                            {entry.locale}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isTrash ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400">
                          trashed
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[entry.status] || statusColors.draft}`}>
                          {entry.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 hidden md:table-cell">
                      {format(new Date(entry.updatedAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isTrash ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-foreground" onClick={() => handleRestore(entry.id)}>
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <>
                            <Link href={`/dashboard/content/${typeApiId}/${entry.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-foreground" title="Edit">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-foreground" title="Duplicate" onClick={() => handleDuplicate(entry.id)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-red-400 hover:bg-red-400/10" title="Move to trash" onClick={() => handleDelete(entry.id, false)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Layers className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-400 font-medium">No entries found</p>
                    <p className="text-xs text-neutral-500 mt-1">Get started by creating a new entry.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
