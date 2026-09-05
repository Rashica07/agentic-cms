'use client';

import { useState } from 'react';
import { ChevronDown, SearchCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type SeoData = {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonical?: string;
  robots?: string;
};

/** Google truncates around these lengths — warn rather than block. */
const LIMITS = { metaTitle: 60, metaDescription: 160 };

function Counter({ value, limit }: { value: string; limit: number }) {
  const len = value.length;
  const over = len > limit;
  return (
    <span className={cn('text-[10px] tabular-nums', over ? 'text-amber-400' : 'text-neutral-500')}>
      {len}/{limit}
    </span>
  );
}

/**
 * Collapsible SEO editor writing to the entry's first-class `seo` jsonb column
 * (not `data`), which the sitemap generator and delivery API read.
 */
export function SeoPanel({
  value,
  onChange,
  slug,
}: {
  value: SeoData;
  onChange: (seo: SeoData) => void;
  slug?: string;
}) {
  const [open, setOpen] = useState(false);
  const set = (key: keyof SeoData, v: string) => onChange({ ...value, [key]: v });

  const filled = Object.values(value ?? {}).filter((v) => typeof v === 'string' && v.trim()).length;

  return (
    <div className="rounded-xl border border-border bg-surface-2/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <SearchCheck className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-foreground">SEO</h3>
          {filled > 0 && (
            <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-cyan-400">
              {filled} set
            </span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-neutral-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border/50 px-6 pb-6 pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaTitle" className="text-sm font-medium text-neutral-200">Meta title</Label>
              <Counter value={value?.metaTitle ?? ''} limit={LIMITS.metaTitle} />
            </div>
            <Input
              id="metaTitle"
              value={value?.metaTitle ?? ''}
              onChange={(e) => set('metaTitle', e.target.value)}
              placeholder="Falls back to the entry title"
              className="bg-surface border-border-strong text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaDescription" className="text-sm font-medium text-neutral-200">Meta description</Label>
              <Counter value={value?.metaDescription ?? ''} limit={LIMITS.metaDescription} />
            </div>
            <textarea
              id="metaDescription"
              value={value?.metaDescription ?? ''}
              onChange={(e) => set('metaDescription', e.target.value)}
              placeholder="A one-sentence summary for search results"
              className="min-h-[70px] w-full rounded-md border border-input bg-surface px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ogImage" className="text-sm font-medium text-neutral-200">Social share image</Label>
            <Input
              id="ogImage"
              value={value?.ogImage ?? ''}
              onChange={(e) => set('ogImage', e.target.value)}
              placeholder="https://…/og-image.jpg"
              className="bg-surface border-border-strong text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="canonical" className="text-sm font-medium text-neutral-200">Canonical URL</Label>
            <Input
              id="canonical"
              value={value?.canonical ?? ''}
              onChange={(e) => set('canonical', e.target.value)}
              placeholder={slug ? `Defaults to /${slug}` : 'Defaults to this entry’s URL'}
              className="bg-surface border-border-strong font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="robots" className="text-sm font-medium text-neutral-200">Search engines</Label>
            <select
              id="robots"
              value={value?.robots ?? 'index'}
              onChange={(e) => set('robots', e.target.value)}
              className="flex h-9 w-full rounded-md border border-border-strong bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
            >
              <option value="index">Index — show in search results</option>
              <option value="noindex">No index — hide from search results</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
