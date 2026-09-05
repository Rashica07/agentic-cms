'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Sparkles, Send, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ReferencePicker } from '@/components/content/reference-picker';
import { MediaPicker } from '@/components/content/media-picker';
import { SeoPanel, type SeoData } from '@/components/content/seo-panel';

/** Locales offered in the editor. Entry `locale` is free-form on the backend. */
const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'sq', label: 'Shqip' },
  { value: 'it', label: 'Italiano' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
];

type ContentField = {
  apiId: string;
  label: string;
  type: string;
  required: boolean;
  config: Record<string, any>;
};

type ContentType = {
  id: string;
  apiId: string;
  name: string;
  fields: ContentField[];
};

export default function EntryEditorPage({ params }: { params: Promise<{ typeApiId: string; id: string }> }) {
  const { typeApiId, id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  
  const isNew = id === 'new';
  
  const [type, setType] = useState<ContentType | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('draft');
  const [scheduledAt, setScheduledAt] = useState('');
  const [locale, setLocale] = useState('en');
  const [seo, setSeo] = useState<SeoData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, typeApiId, id]);

  const fetchData = async () => {
    try {
      // 1. Fetch content type schema
      const typeRes = await fetch(`/api/content/types/${typeApiId}`);
      if (!typeRes.ok) throw new Error('Content type not found');
      const typeData = await typeRes.json();
      setType(typeData);

      // 2. If editing, fetch the entry
      if (!isNew) {
        const entryRes = await fetch(`/api/content/entries/${typeApiId}/${id}`);
        if (!entryRes.ok) throw new Error('Entry not found');
        const entryData = await entryRes.json();
        setFormData(entryData.data || {});
        setSlug(entryData.slug);
        setStatus(entryData.status);
        setLocale(entryData.locale || 'en');
        setSeo(entryData.seo || {});
        if (entryData.scheduledAt) {
          // Format for datetime-local input (YYYY-MM-DDThh:mm)
          const date = new Date(entryData.scheduledAt);
          setScheduledAt(date.toISOString().slice(0, 16));
        }
      } else {
        // Init default form data
        const initData: Record<string, any> = {};
        typeData.fields.forEach((f: ContentField) => {
          if (f.type === 'boolean') initData[f.apiId] = false;
          else if (f.type === 'number') initData[f.apiId] = 0;
          else initData[f.apiId] = '';
        });
        setFormData(initData);
      }
    } catch (err: any) {
      toast.error(err.message);
      router.push(`/dashboard/content/${typeApiId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (apiId: string, value: any) => {
    setFormData(prev => ({ ...prev, [apiId]: value }));
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/content/entries/${typeApiId}/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const copy = await res.json();
      toast.success(`Duplicated as “${copy.slug}”`);
      router.push(`/dashboard/content/${typeApiId}/${copy.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDuplicating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) {
      toast.error('Slug is required');
      return;
    }

    if (status === 'scheduled' && !scheduledAt) {
      toast.error('Scheduled Date is required when status is Scheduled');
      return;
    }

    setSaving(true);

    const payload = {
      slug,
      status,
      locale,
      seo,
      data: formData,
      scheduledAt: status === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
    };

    try {
      const url = isNew 
        ? `/api/content/entries/${typeApiId}` 
        : `/api/content/entries/${typeApiId}/${id}`;
      
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const savedEntry = await res.json();
      
        toast.success('Saved successfully');
      
      if (isNew) {
        router.push(`/dashboard/content/${typeApiId}/${savedEntry.id}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading editor...</div>;
  if (!type) return null;

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)] w-full">
      {/* LEFT: Editor Form */}
      <form className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2" onSubmit={e => handleSave(e)}>
        <div className="flex items-center justify-between sticky top-0 bg-background z-10 pb-4 pt-2">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" size="icon" onClick={() => router.push(`/dashboard/content/${typeApiId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {isNew ? `Create ${type.name}` : `Edit ${type.name}`}
                </h1>
                {!isNew && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {status}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && (
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleDuplicate} disabled={duplicating}>
                {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Duplicate
              </Button>
            )}
            <Button type="submit" variant="secondary" disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Entry
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl border border-border bg-surface-2/30 space-y-6">
              {type.fields.map(field => {
                return (
                  <div key={field.apiId} className="space-y-2 group">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.apiId} className="text-sm font-medium text-neutral-200">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1 opacity-0 group-hover:opacity-100 text-brand">
                        <Sparkles className="h-3 w-3" /> Auto-fill
                      </Button>
                    </div>
                    
                    {field.type === 'boolean' ? (
                      <div className="flex items-center space-x-2 pt-1">
                        <Checkbox 
                          id={field.apiId} 
                          checked={formData[field.apiId] || false}
                          onCheckedChange={c => handleFieldChange(field.apiId, c)}
                        />
                        <Label htmlFor={field.apiId} className="text-sm text-neutral-400">Yes</Label>
                      </div>
                    ) : field.type === 'number' ? (
                      <Input 
                        id={field.apiId} 
                        type="number"
                        required={field.required}
                        value={formData[field.apiId] || ''}
                        onChange={e => handleFieldChange(field.apiId, parseFloat(e.target.value))}
                        className="bg-surface border-border-strong max-w-sm"
                      />
                    ) : field.type === 'richtext' ? (
                      <textarea 
                        id={field.apiId} 
                        required={field.required}
                        value={formData[field.apiId] || ''}
                        onChange={e => handleFieldChange(field.apiId, e.target.value)}
                        className="w-full min-h-[200px] rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    ) : field.type === 'json' ? (
                      <textarea
                        id={field.apiId}
                        required={field.required}
                        value={typeof formData[field.apiId] === 'object' ? JSON.stringify(formData[field.apiId], null, 2) : (formData[field.apiId] || '')}
                        onChange={e => handleFieldChange(field.apiId, e.target.value)}
                        className="w-full min-h-[150px] font-mono rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    ) : field.type === 'reference' ? (
                      <ReferencePicker
                        value={formData[field.apiId]}
                        onChange={v => handleFieldChange(field.apiId, v)}
                        config={field.config}
                        multiple={field.config?.multiple}
                        excludeId={isNew ? undefined : id}
                      />
                    ) : field.type === 'media' ? (
                      <MediaPicker
                        value={formData[field.apiId]}
                        onChange={v => handleFieldChange(field.apiId, v)}
                        multiple={field.config?.multiple}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        id={field.apiId}
                        required={field.required}
                        value={formData[field.apiId] || ''}
                        onChange={e => handleFieldChange(field.apiId, e.target.value)}
                        className="flex h-9 w-full max-w-sm rounded-md border border-border-strong bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select...</option>
                        {(field.config?.options ?? []).map((opt: any) => {
                          // Options may be plain strings or { value, label } objects.
                          const value = typeof opt === 'string' ? opt : opt.value;
                          const label = typeof opt === 'string' ? opt : (opt.label ?? opt.value);
                          return <option key={value} value={value}>{label}</option>;
                        })}
                      </select>
                    ) : field.type === 'date' || field.type === 'datetime' ? (
                      <Input
                        id={field.apiId}
                        type={field.type === 'date' ? 'date' : 'datetime-local'}
                        required={field.required}
                        // Stored as ISO; both inputs need a trimmed local-ish value.
                        value={(formData[field.apiId] || '').slice(0, field.type === 'date' ? 10 : 16)}
                        onChange={e => handleFieldChange(field.apiId, e.target.value)}
                        className="bg-surface border-border-strong max-w-xs"
                      />
                    ) : field.type === 'slug' ? (
                      <Input
                        id={field.apiId}
                        required={field.required}
                        value={formData[field.apiId] || ''}
                        onChange={e => handleFieldChange(field.apiId, e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                        className="bg-surface border-border-strong font-mono text-sm max-w-sm"
                      />
                    ) : (
                      <Input 
                        id={field.apiId} 
                        type="text"
                        required={field.required}
                        value={formData[field.apiId] || ''}
                        onChange={e => handleFieldChange(field.apiId, e.target.value)}
                        className="bg-surface border-border-strong"
                      />
                    )}
                    
                    <p className="text-xs text-neutral-500 font-mono">api_id: {field.apiId}</p>
                  </div>
                );
              })}
              
              {type.fields.length === 0 && (
                <div className="text-center p-8 text-neutral-500">
                  This content type has no fields. Go to the Schema Builder to add some.
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-border bg-surface-2/30 space-y-4">
              <h3 className="font-semibold text-foreground">Entry Metadata</h3>
              
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-neutral-200">Status</Label>
                <select 
                  id="status" 
                  value={status} 
                  onChange={e => setStatus(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border-strong bg-surface px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {status === 'scheduled' && (
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt" className="text-sm font-medium text-neutral-200">Schedule Date</Label>
                  <Input 
                    id="scheduledAt" 
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="bg-surface border-border-strong text-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="locale" className="text-sm font-medium text-neutral-200">Language</Label>
                <select
                  id="locale"
                  value={locale}
                  onChange={e => setLocale(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border-strong bg-surface px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {LOCALES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500">The same slug can exist once per language.</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label htmlFor="slug" className="text-sm font-medium text-neutral-200">Slug *</Label>
                <Input
                  id="slug"
                  required
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                  placeholder="e.g. my-entry"
                  className="bg-surface border-border-strong font-mono text-sm"
                />
                <p className="text-xs text-neutral-500">The URL-friendly identifier for this entry.</p>
              </div>
            </div>

            <SeoPanel value={seo} onChange={setSeo} slug={slug} />
          </div>
        </div>
      </form>

      {/* RIGHT: AI Copilot Panel */}
      <div className="w-80 shrink-0 flex flex-col rounded-xl border border-brand/30 bg-brand/5 overflow-hidden shadow-lg shadow-brand/5">
        <div className="p-3 border-b border-brand/20 bg-brand/10 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <h2 className="font-semibold text-sm text-brand">AI Copilot</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-sm">
          <div className="bg-surface-2 border border-border rounded-lg p-3 text-neutral-300">
            Hi! I'm your Copilot. I can help you:
            <ul className="list-disc pl-5 mt-2 text-xs text-neutral-400 space-y-1">
              <li>Draft content from a brief</li>
              <li>Fix grammar and tone</li>
              <li>Generate SEO titles & descriptions</li>
              <li>Translate fields to other languages</li>
            </ul>
          </div>
        </div>

        <div className="p-3 bg-surface border-t border-border">
          <div className="relative">
            <Input 
              placeholder="Ask Copilot to help..." 
              className="w-full pr-10 bg-surface-2 border-border-strong text-xs h-9"
            />
            <Button size="icon" className="absolute right-1 top-1 h-7 w-7 bg-brand text-brand-foreground rounded-md hover:bg-brand/90">
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
