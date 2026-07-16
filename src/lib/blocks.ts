/**
 * Section/block schema for the visual page editor.
 *
 * A page's `content.blocks` is an ordered array of these. Each block has a
 * `type` (which section component to render) and freeform `props` matching
 * that type's field schema below. New section types only need an entry in
 * BLOCK_TYPES + FIELD_SCHEMA — no migration, since Page.content stays JSONB.
 */

/**
 * `type` is a plain string (not a literal union) so this same shape covers
 * both the generic BlockType registry below and a linked site's own fixed
 * section types (see `src/lib/site-schemas/`) — a page's blocks only need
 * to match whichever schema is currently in effect for its tenant.
 */
export interface Block {
  id: string;
  type: string;
  props: Record<string, unknown>;
  /** Omitted/false = visible. Lets a section stay in the list but not render. */
  hidden?: boolean;
}

export type BlockType =
  | 'header'
  | 'hero'
  | 'richtext'
  | 'image-with-text'
  | 'featured-products'
  | 'button-cta'
  | 'gallery'
  | 'footer'
  | 'custom-html';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'number' | 'select' | 'list';
  options?: string[];
  placeholder?: string;
  /** For type 'text': stored as string[], edited as a comma-separated string. */
  arrayItem?: boolean;
  /** For type 'list': the fields each item in the array carries. */
  itemFields?: FieldDef[];
}

export const BLOCK_TYPES: { type: BlockType; name: string; description: string }[] = [
  { type: 'header', name: 'Header', description: 'Logo and navigation links' },
  { type: 'hero', name: 'Hero Banner', description: 'Large heading with image and call-to-action' },
  { type: 'richtext', name: 'Text', description: 'Heading and body copy' },
  { type: 'image-with-text', name: 'Image with Text', description: 'Side-by-side image and copy' },
  { type: 'featured-products', name: 'Featured Products', description: 'Grid pulled from your catalog' },
  { type: 'button-cta', name: 'Call to Action', description: 'Banner with a single button' },
  { type: 'gallery', name: 'Gallery', description: 'Row of images' },
  { type: 'footer', name: 'Footer', description: 'Closing text and links' },
  { type: 'custom-html', name: 'Custom HTML', description: 'Drop in your own markup' },
];

export const FIELD_SCHEMA: Record<BlockType, FieldDef[]> = {
  header: [
    { key: 'logoText', label: 'Logo text', type: 'text', placeholder: 'Your Brand' },
    { key: 'navLinks', label: 'Nav links (comma separated)', type: 'text', placeholder: 'Home, Shop, About, Contact' },
  ],
  hero: [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Welcome to the store' },
    { key: 'subheading', label: 'Subheading', type: 'textarea', placeholder: 'A short line about your brand' },
    { key: 'imageUrl', label: 'Background image URL', type: 'url', placeholder: 'https://...' },
    { key: 'ctaLabel', label: 'Button label', type: 'text', placeholder: 'Shop now' },
    { key: 'ctaHref', label: 'Button link', type: 'text', placeholder: '/shop' },
    { key: 'align', label: 'Alignment', type: 'select', options: ['left', 'center'] },
  ],
  richtext: [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'About us' },
    { key: 'body', label: 'Body', type: 'textarea', placeholder: 'Tell your story...' },
  ],
  'image-with-text': [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'imageUrl', label: 'Image URL', type: 'url' },
    { key: 'imagePosition', label: 'Image position', type: 'select', options: ['left', 'right'] },
  ],
  'featured-products': [
    { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Featured products' },
    { key: 'count', label: 'Number of products', type: 'number', placeholder: '4' },
  ],
  'button-cta': [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'subheading', label: 'Subheading', type: 'text' },
    { key: 'buttonLabel', label: 'Button label', type: 'text' },
    { key: 'buttonHref', label: 'Button link', type: 'text' },
  ],
  gallery: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'imageUrls', label: 'Image URLs (comma separated)', type: 'textarea', placeholder: 'https://..., https://...' },
  ],
  footer: [
    { key: 'text', label: 'Footer text', type: 'textarea', placeholder: `© ${new Date().getFullYear()} Your Brand` },
    { key: 'links', label: 'Links (comma separated)', type: 'text', placeholder: 'Privacy, Terms' },
  ],
  'custom-html': [{ key: 'html', label: 'HTML', type: 'textarea', placeholder: '<div>...</div>' }],
};

export const DEFAULT_PROPS: Record<BlockType, Record<string, unknown>> = {
  header: { logoText: 'Your Brand', navLinks: 'Home, Shop, About, Contact' },
  hero: {
    heading: 'Welcome to the store',
    subheading: 'A short line about your brand',
    imageUrl: '',
    ctaLabel: 'Shop now',
    ctaHref: '/shop',
    align: 'center',
  },
  richtext: { heading: 'About us', body: 'Tell your story here.' },
  'image-with-text': { heading: 'Made with care', body: 'Describe what makes your product special.', imageUrl: '', imagePosition: 'left' },
  'featured-products': { heading: 'Featured products', count: 4 },
  'button-cta': { heading: 'Ready to get started?', subheading: '', buttonLabel: 'Shop now', buttonHref: '/shop' },
  gallery: { heading: 'Gallery', imageUrls: '' },
  footer: { text: `© ${new Date().getFullYear()} Your Brand. All rights reserved.`, links: 'Privacy, Terms' },
  'custom-html': { html: '<p>Custom section</p>' },
};

export function makeBlockId(): string {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlock(type: BlockType): Block {
  return {
    id: makeBlockId(),
    type,
    props: { ...DEFAULT_PROPS[type] },
  };
}

export function blockName(type: BlockType): string {
  return BLOCK_TYPES.find((b) => b.type === type)?.name ?? type;
}
