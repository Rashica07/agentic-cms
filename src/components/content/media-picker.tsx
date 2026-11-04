'use client';

import { useState } from 'react';
import { X, Plus, Loader2, ImageIcon, AlertTriangle, Folder, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMedia, useMediaFolders } from '@/hooks/useMedia';
import { cn } from '@/lib/utils';

type MediaAsset = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  altText?: string;
};

type MediaFolder = { id: string; name: string };

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
/** Locally-stored uploads come back as root-relative paths. */
const assetSrc = (url: string) => (url.startsWith('/') ? `${API_ORIGIN}${url}` : url);

/**
 * Picker for `media` content fields. Stores the asset URL (string) — or a
 * string[] when the field is configured multiple — so the delivery API can
 * serve it straight to a frontend with no extra lookup.
 */
export function MediaPicker({
  value,
  onChange,
  multiple,
}: {
  value: any;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // The API lists root assets unless given a folderId, so the picker needs to
  // browse folders or media filed away in them would be unreachable.
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const { data, isLoading, isError } = useMedia(folderId || undefined);
  const { data: folderData } = useMediaFolders(folderId || undefined);

  const assets: MediaAsset[] = Array.isArray(data) ? data : (data?.items ?? []);
  const folders: MediaFolder[] = Array.isArray(folderData) ? folderData : (folderData?.items ?? []);
  const selected: string[] = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

  const pick = (url: string) => {
    if (multiple) {
      onChange(selected.includes(url) ? selected.filter((u) => u !== url) : [...selected, url]);
    } else {
      onChange(selected[0] === url ? null : url);
      setOpen(false);
    }
  };

  const remove = (url: string) => {
    if (multiple) onChange(selected.filter((u) => u !== url));
    else onChange(null);
  };

  return (
    <div className="space-y-2">
      {/* Selected previews */}
      <div className="flex flex-wrap items-center gap-2">
        {selected.map((url) => (
          <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border-strong bg-surface-2">
            {/* Media URLs are arbitrary/remote — <img> avoids next/image host config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetSrc(url)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-neutral-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {(multiple || selected.length === 0) && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong bg-surface-2/50 text-neutral-500 transition-colors hover:border-brand/50 hover:text-brand-fg"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[10px]">Select</span>
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {folderId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title="Back to all media"
                    onClick={() => { setFolderId(null); setFolderName(null); }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">{folderName ?? 'Media Library'}</h3>
                  <p className="text-[11px] text-neutral-500">{multiple ? 'Select one or more assets' : 'Select an asset'}</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <p className="text-xs text-neutral-400">Couldn&apos;t load the media library.</p>
                </div>
              ) : assets.length === 0 && folders.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <ImageIcon className="h-6 w-6 text-neutral-600" />
                  <p className="text-xs text-neutral-500">
                    {folderId ? 'This folder is empty.' : 'No media uploaded yet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {folders.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {folders.map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => { setFolderId(folder.id); setFolderName(folder.name); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5 text-xs text-neutral-300 transition-colors hover:border-brand/40 hover:text-foreground"
                        >
                          <Folder className="h-3.5 w-3.5 shrink-0 text-brand-fg" />
                          {folder.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {assets.map((asset) => {
                      const active = selected.includes(asset.url);
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => pick(asset.url)}
                          className={cn(
                            'group relative aspect-square overflow-hidden rounded-lg border-2 bg-surface-2 transition-all',
                            active ? 'border-brand' : 'border-transparent hover:border-border-strong',
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={assetSrc(asset.url)} alt={asset.altText ?? ''} className="h-full w-full object-cover" />
                          {!asset.altText && (
                            <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1 text-[8px] font-bold text-black" title="Missing alt text">
                              ALT
                            </span>
                          )}
                          <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-[9px] text-neutral-300">
                            {asset.filename}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {multiple && (
              <div className="border-t border-border p-3">
                <Button type="button" size="sm" className="w-full" onClick={() => setOpen(false)}>
                  Done ({selected.length} selected)
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
