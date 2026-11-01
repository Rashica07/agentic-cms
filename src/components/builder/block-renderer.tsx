'use client';

import type { Block } from '@/lib/blocks';

export interface RenderTheme {
  colors: { primary: string; background: string; surface: string; accent: string };
  fonts: { body: string; heading: string };
  borderRadius: string;
}

export interface PreviewProduct {
  id: string;
  title: string;
  price?: number;
  imageUrl?: string;
}

function splitList(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function str(value: unknown, fallback = ''): string {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

/**
 * Renders a page's section blocks as an actual styled page, driven by the
 * live theme — this is the in-app "storefront" preview used by the visual
 * editor. It has no dependency on any external site, so edits show up
 * instantly regardless of what (if anything) the deployed storefront does
 * with these blocks.
 */
export function BlockRenderer({
  blocks,
  theme,
  products = [],
  selectedBlockId,
  onSelectBlock,
}: {
  blocks: Block[];
  theme: RenderTheme;
  products?: PreviewProduct[];
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
}) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        fontFamily: theme.fonts.body,
        color: readableText(theme.colors.background),
      }}
      className="min-h-full w-full"
    >
      {blocks.length === 0 && (
        <div className="flex h-full min-h-[400px] items-center justify-center p-12 text-center opacity-60">
          <p>No sections yet — add one from the left panel to start building this page.</p>
        </div>
      )}
      {blocks.map((block) => (
        <div
          key={block.id}
          onClick={() => onSelectBlock?.(block.id)}
          className="relative cursor-pointer transition-shadow"
          style={{
            outline: selectedBlockId === block.id ? `2px solid ${theme.colors.accent}` : 'none',
            outlineOffset: '-2px',
          }}
        >
          <BlockView block={block} theme={theme} products={products} />
        </div>
      ))}
    </div>
  );
}

function readableText(bgHex: string): string {
  const hex = bgHex.replace('#', '');
  if (hex.length !== 6) return '#111111';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#111111' : '#f5f5f5';
}

function BlockView({ block, theme, products }: { block: Block; theme: RenderTheme; products: PreviewProduct[] }) {
  const p = block.props;
  const heading: React.CSSProperties = { fontFamily: theme.fonts.heading };

  switch (block.type) {
    case 'header':
      return (
        <div
          className="flex items-center justify-between px-8 py-4"
          style={{ backgroundColor: theme.colors.surface, borderBottom: `1px solid ${theme.colors.accent}22` }}
        >
          <span className="text-lg font-bold" style={{ ...heading, color: theme.colors.primary }}>
            {str(p.logoText, 'Your Brand')}
          </span>
          <nav className="flex gap-6 text-sm opacity-80">
            {splitList(p.navLinks).map((link) => (
              <span key={link}>{link}</span>
            ))}
          </nav>
        </div>
      );

    case 'hero':
      return (
        <div
          className="relative flex flex-col justify-center gap-4 px-8 py-24 bg-cover bg-center"
          style={{
            textAlign: p.align === 'left' ? 'left' : 'center',
            alignItems: p.align === 'left' ? 'flex-start' : 'center',
            backgroundImage: p.imageUrl ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${str(p.imageUrl)})` : undefined,
            backgroundColor: p.imageUrl ? undefined : theme.colors.surface,
            color: p.imageUrl ? '#fff' : undefined,
          }}
        >
          <h1 className="text-[19px] font-semibold max-w-2xl" style={heading}>
            {str(p.heading, 'Welcome')}
          </h1>
          {!!p.subheading && <p className="max-w-xl opacity-90">{str(p.subheading)}</p>}
          {!!p.ctaLabel && (
            <span
              className="mt-2 inline-block rounded px-6 py-3 font-semibold"
              style={{ backgroundColor: theme.colors.primary, color: '#fff', borderRadius: theme.borderRadius }}
            >
              {str(p.ctaLabel)}
            </span>
          )}
        </div>
      );

    case 'richtext':
      return (
        <div className="px-8 py-16 max-w-3xl mx-auto text-center">
          {!!p.heading && (
            <h2 className="text-2xl font-bold mb-4" style={heading}>
              {str(p.heading)}
            </h2>
          )}
          <p className="opacity-80 whitespace-pre-wrap">{str(p.body)}</p>
        </div>
      );

    case 'image-with-text':
      return (
        <div
          className="grid md:grid-cols-2 gap-8 px-8 py-16 items-center max-w-5xl mx-auto"
          style={{ direction: p.imagePosition === 'right' ? 'rtl' : 'ltr' }}
        >
          <div
            className="aspect-video bg-cover bg-center"
            style={{
              backgroundColor: theme.colors.surface,
              backgroundImage: p.imageUrl ? `url(${str(p.imageUrl)})` : undefined,
              borderRadius: theme.borderRadius,
              direction: 'ltr',
            }}
          />
          <div style={{ direction: 'ltr' }}>
            {!!p.heading && (
              <h3 className="text-xl font-bold mb-3" style={heading}>
                {str(p.heading)}
              </h3>
            )}
            <p className="opacity-80 whitespace-pre-wrap">{str(p.body)}</p>
          </div>
        </div>
      );

    case 'featured-products': {
      const count = Math.max(1, Number(p.count) || 4);
      const items = products.slice(0, count);
      return (
        <div className="px-8 py-16 max-w-5xl mx-auto">
          <h3 className="text-xl font-bold mb-6 text-center" style={heading}>
            {str(p.heading, 'Featured products')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {(items.length ? items : Array.from({ length: count }).map((_, i) => ({ id: String(i), title: 'Product', price: undefined, imageUrl: undefined }))).map(
              (item, i) => (
                <div key={item.id ?? i}>
                  <div
                    className="aspect-square mb-2 bg-cover bg-center"
                    style={{
                      backgroundColor: theme.colors.surface,
                      backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
                      borderRadius: theme.borderRadius,
                    }}
                  />
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {typeof item.price === 'number' && <p className="text-sm opacity-70">${item.price.toFixed(2)}</p>}
                </div>
              ),
            )}
          </div>
        </div>
      );
    }

    case 'button-cta':
      return (
        <div className="px-8 py-16 text-center" style={{ backgroundColor: theme.colors.surface }}>
          {!!p.heading && (
            <h3 className="text-2xl font-bold mb-2" style={heading}>
              {str(p.heading)}
            </h3>
          )}
          {!!p.subheading && <p className="opacity-80 mb-6">{str(p.subheading)}</p>}
          {!!p.buttonLabel && (
            <span
              className="inline-block rounded px-8 py-3 font-semibold"
              style={{ backgroundColor: theme.colors.accent, color: '#fff', borderRadius: theme.borderRadius }}
            >
              {str(p.buttonLabel)}
            </span>
          )}
        </div>
      );

    case 'gallery':
      return (
        <div className="px-8 py-16 max-w-5xl mx-auto">
          {!!p.heading && (
            <h3 className="text-xl font-bold mb-6 text-center" style={heading}>
              {str(p.heading)}
            </h3>
          )}
          <div className="grid grid-cols-3 gap-4">
            {splitList(p.imageUrls).length
              ? splitList(p.imageUrls).map((url, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-cover bg-center"
                    style={{ backgroundImage: `url(${url})`, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius }}
                  />
                ))
              : Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="aspect-square" style={{ backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius }} />
                ))}
          </div>
        </div>
      );

    case 'footer':
      return (
        <div className="px-8 py-10 text-center text-sm opacity-70" style={{ backgroundColor: theme.colors.surface }}>
          <p className="whitespace-pre-wrap">{str(p.text)}</p>
          <div className="flex justify-center gap-4 mt-2">
            {splitList(p.links).map((link) => (
              <span key={link}>{link}</span>
            ))}
          </div>
        </div>
      );

    case 'custom-html':
      return <div className="px-8 py-8" dangerouslySetInnerHTML={{ __html: str(p.html) }} />;

    default:
      return null;
  }
}
