'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { usePages, useUpdatePage } from '@/hooks/usePages';
import { useHistory } from '@/lib/use-history';
import { PlanGate } from '@/components/plan-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Monitor,
  Smartphone,
  LayoutTemplate,
  Palette,
  Plus,
  Eye,
  ArrowLeft,
  UploadCloud,
  GripVertical,
  Link2,
  Undo2,
  Redo2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BLOCK_TYPES, FIELD_SCHEMA, createBlock, type Block, type BlockType, type FieldDef } from '@/lib/blocks';
import { BlockRenderer } from '@/components/builder/block-renderer';
import { SortableBlockRow } from '@/components/builder/sortable-block-row';
import { getSiteSchemaForTenant, createSiteBlock, siteBlockName, type SiteSchema } from '@/lib/site-schemas';

const DEFAULT_THEME = {
  colors: { primary: '#ff8c00', background: '#0a0a0a', surface: '#121212', accent: '#ff6b00' },
  fonts: { body: 'Inter', heading: 'Outfit' },
  borderRadius: '12px',
};

const FONT_OPTIONS = ['Inter', 'Outfit', 'Roboto', 'Playfair Display', 'Space Grotesk'];
import { useSiteInfo } from '@/hooks/useSiteInfo';

function mergeWithDefaults(defaults: unknown, saved: unknown): unknown {
  if (saved === undefined || saved === null) return defaults;
  if (Array.isArray(saved)) return saved;
  if (typeof saved === 'object' && typeof defaults === 'object' && !Array.isArray(defaults)) {
    const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
    const defaultsObj = defaults as Record<string, unknown>;
    const savedObj = saved as Record<string, unknown>;
    for (const key of Object.keys(savedObj)) out[key] = mergeWithDefaults(defaultsObj?.[key], savedObj[key]);
    return out;
  }
  return saved;
}

export default function VisualEditorPage() {
  return (
    <Suspense fallback={null}>
      <VisualEditor />
    </Suspense>
  );
}

function VisualEditor() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: pages, isLoading: pagesLoading } = usePages();
  const { mutateAsync: updatePage } = useUpdatePage();

  const [activePageId, setActivePageId] = useState<string | null>(searchParams.get('page'));
  const [theme, setTheme] = useState(DEFAULT_THEME);

  // Resolved selection: whatever the user explicitly picked, else the
  // tenant's "home" page, else the first page — derived during render
  // instead of an effect+setState, so there's no extra render pass.
  const activePage = useMemo(() => {
    if (!pages || pages.length === 0) return null;
    if (activePageId) {
      const chosen = pages.find((p) => p.id === activePageId);
      if (chosen) return chosen;
    }
    return pages.find((p) => p.slug === 'home' && p.type === 'page') ?? pages[0];
  }, [pages, activePageId]);

  // Load the tenant's theme.
  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const pulse = createPulseClient(session.accessToken);
        const tenant = await pulse.getMyTenant();
        const saved = (tenant as { theme?: typeof DEFAULT_THEME }).theme;
        if (!cancelled && saved) setTheme(mergeWithDefaults(DEFAULT_THEME, saved) as typeof DEFAULT_THEME);
      } catch {
        // Fallback to default theme
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'preview'],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      const list = (await pulse.getProducts()) as Record<string, unknown>[];
      return list.map((p) => ({
        id: p.id as string,
        title: (p.title as string) ?? (p.name as string) ?? 'Product',
        price: p.price as number | undefined,
        imageUrl: (p.imageUrl as string) ?? (p.images as string[] | undefined)?.[0],
      }));
    },
    enabled: !!session?.accessToken,
  });

  const selectPage = (id: string) => {
    setActivePageId(id);
    router.replace(`/dashboard/builder/editor?page=${id}`);
  };

  const siteSchema = getSiteSchemaForTenant(session?.user?.tenantSlug);

  return (
    <PlanGate feature="themes">
      <div className="flex h-[calc(100vh-4rem)] -mx-6 -my-6 bg-neutral-950 overflow-hidden">
        {activePage ? (
          <PageWorkspace
            key={activePage.id}
            page={activePage}
            pages={pages ?? []}
            pagesLoading={pagesLoading}
            onSelectPage={selectPage}
            theme={theme}
            setTheme={setTheme}
            products={products}
            updatePage={updatePage}
            session={session}
            siteSchema={siteSchema}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
            {pagesLoading ? 'Loading pages…' : 'No pages yet — create one first.'}
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .dot-pattern { background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px); background-size: 20px 20px; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `,
        }}
      />
    </PlanGate>
  );
}

function PageWorkspace({
  page,
  pages,
  pagesLoading,
  onSelectPage,
  theme,
  setTheme,
  products,
  updatePage,
  session,
  siteSchema,
}: {
  page: NonNullable<ReturnType<typeof usePages>['data']>[number];
  pages: NonNullable<ReturnType<typeof usePages>['data']>;
  pagesLoading: boolean;
  onSelectPage: (id: string) => void;
  theme: typeof DEFAULT_THEME;
  setTheme: React.Dispatch<React.SetStateAction<typeof DEFAULT_THEME>>;
  products: { id: string; title: string; price?: number; imageUrl?: string }[];
  updatePage: ReturnType<typeof useUpdatePage>['mutateAsync'];
  session: ReturnType<typeof useSession>['data'];
  siteSchema: SiteSchema | null;
}) {
  const [activeTab, setActiveTab] = useState<'sections' | 'theme'>('sections');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const { siteUrl } = useSiteInfo();
  const {
    state: blocks,
    set: setBlocks,
    setDebounced: setBlocksDebounced,
    flush: flushBlockHistory,
    undo: undoBlocks,
    redo: redoBlocks,
    canUndo,
    canRedo,
  } = useHistory<Block[]>(() => {
    const content = page.content as { blocks?: Block[] } | undefined;
    if (Array.isArray(content?.blocks) && content.blocks.length) return content.blocks;
    // Linked-site home page with nothing saved yet: pre-populate the editor
    // with the site's real sections (seeded copy) so they're "already sitting
    // in there" ready to edit/reorder — not saved until Publish.
    if (siteSchema && page.slug === 'home') {
      return siteSchema.defaultOrder.map((type) => createSiteBlock(type, siteSchema));
    }
    return [];
  }, 50);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const blockTypeOptions = siteSchema?.blockTypes ?? BLOCK_TYPES;
  const fieldSchema = (siteSchema?.fieldSchema ?? FIELD_SCHEMA) as Record<string, FieldDef[]>;
  const blockLabel = (type: string) => (siteSchema ? siteBlockName(type, siteSchema) : (BLOCK_TYPES.find((t) => t.type === type)?.name ?? type));

  const addBlock = (type: string) => {
    const block = siteSchema ? createSiteBlock(type, siteSchema) : createBlock(type as BlockType);
    setBlocks((prev) => [...prev, block]);
    setSelectedBlockId(block.id);
    setAddMenuOpen(false);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const toggleBlockHidden = (id: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b)));
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // Text/select/list field edits go through the debounced setter so a burst
  // of keystrokes collapses into a single undo step instead of one per
  // character (see src/lib/use-history.ts).
  const updateBlockProp = (id: string, key: string, value: unknown) => {
    setBlocksDebounced((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)));
  };

  // dnd-kit sensors: pointer with a small activation distance so a plain
  // click on the grip handle doesn't register as a drag, plus keyboard
  // support (Tab to the grip, Space to lift, arrows to move, Space to drop).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(String(event.active.id));
  const handleDragOver = (event: DragOverEvent) => setOverId(event.over ? String(event.over.id) : null);
  const handleDragCancel = () => {
    setActiveDragId(null);
    setOverId(null);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // Cmd/Ctrl+Z to undo, Cmd/Ctrl+Shift+Z to redo — global to the editor.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redoBlocks();
      else undoBlocks();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoBlocks, redoBlocks]);

  const handleSave = async (publish?: boolean) => {
    flushBlockHistory();
    setSaving(true);
    try {
      const pulse = createPulseClient(session?.accessToken);
      await Promise.all([
        updatePage({
          id: page.id,
          data: {
            content: { ...(page.content ?? {}), blocks },
            ...(publish !== undefined ? { published: publish } : {}),
          },
        }),
        pulse.updateMyTheme(theme),
      ]);
      toast.success(publish ? 'Page published to your live site!' : 'Draft saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateThemeColor = (key: keyof typeof theme.colors, value: string) => {
    setTheme((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  return (
    <>
      {/* LEFT SIDEBAR */}
      <div className="w-96 shrink-0 border-r border-neutral-800 bg-neutral-900/80 flex flex-col z-10 backdrop-blur-xl shadow-2xl">
        {/* Top bar: back + page picker + undo/redo */}
        <div className="p-3 border-b border-neutral-800 flex items-center gap-2 bg-neutral-950">
          <Link href="/dashboard/builder">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <select
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-md h-9 text-sm px-2 text-white min-w-0"
            value={page.id}
            onChange={(e) => onSelectPage(e.target.value)}
            disabled={pagesLoading || !pages.length}
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.published ? '' : '(draft)'}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-400 hover:text-white disabled:opacity-30"
              onClick={() => undoBlocks()}
              disabled={!canUndo}
              title="Undo (Cmd/Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-400 hover:text-white disabled:opacity-30"
              onClick={() => redoBlocks()}
              disabled={!canRedo}
              title="Redo (Cmd/Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
          <div className="flex p-2 gap-1 bg-neutral-950 border-b border-neutral-800">
            <button
              onClick={() => setActiveTab('sections')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-colors',
                activeTab === 'sections' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200',
              )}
            >
              <LayoutTemplate className="h-3.5 w-3.5" /> Sections
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-colors',
                activeTab === 'theme' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200',
              )}
            >
              <Palette className="h-3.5 w-3.5" /> Theme Settings
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'sections' && (
              <div className="space-y-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {blocks.map((block, i) => (
                        <SortableBlockRow
                          key={block.id}
                          block={block}
                          index={i}
                          isLast={i === blocks.length - 1}
                          isSelected={selectedBlockId === block.id}
                          isDropTarget={activeDragId !== null && overId === block.id && activeDragId !== block.id}
                          label={blockLabel(block.type)}
                          fields={fieldSchema[block.type] ?? []}
                          onSelect={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
                          onToggleHidden={() => toggleBlockHidden(block.id)}
                          onMoveUp={() => moveBlock(block.id, -1)}
                          onMoveDown={() => moveBlock(block.id, 1)}
                          onRemove={() => removeBlock(block.id)}
                          onFieldChange={(key, value) => updateBlockProp(block.id, key, value)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeDragId ? (
                      <div className="rounded-md border border-brand bg-neutral-900 shadow-2xl px-3 py-3 flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-neutral-500 shrink-0" />
                        <span className="text-sm font-medium text-white truncate">{blockLabel(blocks.find((b) => b.id === activeDragId)?.type ?? '')}</span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>

                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-neutral-700 text-neutral-300 hover:bg-neutral-900 gap-2"
                    onClick={() => setAddMenuOpen((o) => !o)}
                  >
                    <Plus className="h-4 w-4" /> Add Section
                  </Button>
                  {addMenuOpen && (
                    <div className="absolute left-0 right-0 mt-2 rounded-md border border-neutral-800 bg-neutral-900 shadow-2xl z-20 max-h-80 overflow-y-auto">
                      {blockTypeOptions.map((bt) => (
                        <button
                          key={bt.type}
                          onClick={() => addBlock(bt.type)}
                          className="w-full text-left px-3 py-2.5 hover:bg-neutral-800 transition-colors border-b border-neutral-800/60 last:border-0"
                        >
                          <p className="text-sm font-medium text-white">{bt.name}</p>
                          <p className="text-xs text-neutral-500">{bt.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Colors</h3>
                  <div className="space-y-3">
                    <ColorPicker label="Primary Brand" value={theme.colors.primary} onChange={(v) => updateThemeColor('primary', v)} />
                    <ColorPicker label="Background" value={theme.colors.background} onChange={(v) => updateThemeColor('background', v)} />
                    <ColorPicker label="Surface (Cards)" value={theme.colors.surface} onChange={(v) => updateThemeColor('surface', v)} />
                    <ColorPicker label="Accent" value={theme.colors.accent} onChange={(v) => updateThemeColor('accent', v)} />
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Typography</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-neutral-400">Headings Font</Label>
                      <select
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-md h-9 text-sm px-3 text-white"
                        value={theme.fonts.heading}
                        onChange={(e) => setTheme((t) => ({ ...t, fonts: { ...t.fonts, heading: e.target.value } }))}
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-neutral-400">Body Font</Label>
                      <select
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-md h-9 text-sm px-3 text-white"
                        value={theme.fonts.body}
                        onChange={(e) => setTheme((t) => ({ ...t, fonts: { ...t.fonts, body: e.target.value } }))}
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="p-4 bg-neutral-950 border-t border-neutral-800 shadow-[0_-10px_20px_rgba(0,0,0,0.2)] flex gap-2">
            <Button variant="outline" className="flex-1 border-neutral-800 text-white hover:bg-neutral-900" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button className="flex-1 gap-2 bg-brand text-black hover:bg-brand/90 font-bold" onClick={() => handleSave(true)} disabled={saving}>
              <UploadCloud className="h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>

        {/* MAIN AREA: preview */}
        <div className="flex-1 relative flex flex-col bg-[#050505] dot-pattern">
          <div className="h-14 shrink-0 border-b border-white/5 flex items-center justify-center gap-2 px-4">
            <div className="flex bg-neutral-900 rounded-lg p-1 border border-white/5">
              <button
                onClick={() => setViewMode('desktop')}
                className={cn('p-2 rounded-md transition-all', viewMode === 'desktop' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white')}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={cn('p-2 rounded-md transition-all', viewMode === 'mobile' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white')}
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            {siteSchema && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-500" title="Public visitors only see published content — draft edits here aren't live on the real site yet.">
                <Link2 className="h-3 w-3" /> Linked to {siteSchema.siteName} · live after Publish
              </span>
            )}
            <a href={siteSchema?.siteUrl ?? siteUrl} target="_blank" rel="noreferrer" className={cn('text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors', !siteSchema && 'ml-auto')}>
              Live Site <Eye className="h-3 w-3" />
            </a>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-8">
            <div
              className={cn(
                'bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top ring-1 ring-white/10 rounded-b-xl rounded-t-sm overflow-hidden flex flex-col',
                viewMode === 'mobile' ? 'w-[375px] h-[812px]' : 'w-full max-w-5xl h-full min-h-[600px]',
              )}
            >
              <div className="h-6 bg-neutral-900 w-full flex items-center gap-1.5 px-3 border-b border-neutral-800 shrink-0">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
              <div className="flex-1 overflow-y-auto">
                {siteSchema ? (
                  <iframe key={page.slug} src={siteSchema.siteUrl} title={siteSchema.siteName} className="w-full h-full border-none bg-white" />
                ) : (
                  <BlockRenderer blocks={blocks} theme={theme} products={products} selectedBlockId={selectedBlockId} onSelectBlock={setSelectedBlockId} />
                )}
              </div>
            </div>
          </div>
        </div>
    </>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <div className="flex items-center justify-between group">
      <Label className="text-sm text-neutral-300 font-medium">{label}</Label>
      <div className="flex items-center gap-2 bg-neutral-950 p-1 rounded-md border border-neutral-800 ring-1 ring-transparent focus-within:ring-brand/50 transition-all">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="p-0 border-0 w-6 h-6 rounded cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-sm"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-20 border-0 bg-transparent text-xs uppercase font-mono p-0 focus-visible:ring-0 text-neutral-400" />
      </div>
    </div>
  );
}
