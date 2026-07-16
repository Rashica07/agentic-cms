'use client';

import { useRef } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Upload, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUploadMedia } from '@/hooks/useMedia';
import { toast } from 'sonner';
import type { FieldDef } from '@/lib/blocks';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/** Strict raster-only accept list — mirrors the backend upload filter (svg/ico excluded as an XSS vector). */
const IMAGE_ACCEPT = '.webp,.jpg,.jpeg,.jpe,.png';
const IMAGE_EXT_RE = /\.(webp|jpe?g|jpe|png)$/i;

function resolveMediaUrl(url: string): string {
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

/**
 * Renders one form control per FieldDef, including nested repeating groups
 * (type 'list') — used by both the generic block editor and any linked
 * site's schema, so the two systems share one editing surface.
 */
export function FieldEditor({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (value: unknown) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia();

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_EXT_RE.test(file.name)) {
      toast.error('Please choose a webp, jpg, jpe, or png image.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await uploadMedia(formData);
      onChange(resolveMediaUrl(uploaded.url));
      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    }
  };

  if (field.type === 'list') {
    const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    const itemFields = field.itemFields ?? [];

    const updateItem = (idx: number, next: Record<string, unknown>) => {
      const copy = [...items];
      copy[idx] = next;
      onChange(copy);
    };
    const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
    const moveItem = (idx: number, dir: -1 | 1) => {
      const target = idx + dir;
      if (target < 0 || target >= items.length) return;
      const copy = [...items];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      onChange(copy);
    };
    const addItem = () => {
      const blank: Record<string, unknown> = {};
      for (const f of itemFields) blank[f.key] = '';
      onChange([...items, blank]);
    };

    return (
      <div className="space-y-2">
        <Label className="text-xs text-neutral-400">{field.label}</Label>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-md border border-neutral-800 bg-neutral-900/60 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-neutral-500">Item {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1 rounded text-neutral-500 hover:text-white disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="p-1 rounded text-neutral-500 hover:text-white disabled:opacity-30">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded text-neutral-500 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {itemFields.map((sub) => (
                <FieldEditor key={sub.key} field={sub} value={item[sub.key]} onChange={(v) => updateItem(idx, { ...item, [sub.key]: v })} />
              ))}
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" className="w-full border-dashed border-neutral-700 text-neutral-300 hover:bg-neutral-900 gap-2 h-8 text-xs" onClick={addItem}>
          <Plus className="h-3.5 w-3.5" /> Add {field.label.replace(/s$/, '')}
        </Button>
      </div>
    );
  }

  if (field.arrayItem) {
    const csv = Array.isArray(value) ? (value as unknown[]).join(', ') : '';
    return (
      <div className="space-y-1">
        <Label className="text-xs text-neutral-400">{field.label}</Label>
        <Input
          value={csv}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder={field.placeholder}
          className="h-9 bg-neutral-900 border-neutral-800 text-white text-sm"
        />
      </div>
    );
  }

  const scalar = value === undefined || value === null ? '' : value;

  if (field.type === 'url') {
    const hasValue = !!String(scalar);
    return (
      <div className="space-y-1">
        <Label className="text-xs text-neutral-400">{field.label}</Label>
        <div className="flex items-center gap-2">
          {hasValue && (
            <div
              className="h-9 w-9 shrink-0 rounded-md border border-neutral-800 bg-neutral-900 bg-cover bg-center"
              style={{ backgroundImage: `url(${String(scalar)})` }}
            />
          )}
          <Input
            value={String(scalar)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="h-9 bg-neutral-900 border-neutral-800 text-white text-sm"
          />
          <input ref={fileInputRef} type="file" accept={IMAGE_ACCEPT} onChange={handlePickImage} className="hidden" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 border-neutral-800 text-neutral-300 hover:bg-neutral-900"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload image"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-neutral-400">{field.label}</Label>
      {field.type === 'textarea' ? (
        <textarea
          value={String(scalar)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-md text-sm px-3 py-2 text-white resize-none"
        />
      ) : field.type === 'select' ? (
        <select
          value={String(scalar || field.options?.[0] || '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-md h-9 text-sm px-3 text-white"
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <Input
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(scalar)}
          onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={field.placeholder}
          className="h-9 bg-neutral-900 border-neutral-800 text-white text-sm"
        />
      )}
    </div>
  );
}
