import type { SiteSchema } from './types';

/**
 * Torre Group (tenant slug `gazi-torre`, tenant name "torre-ks") is a real,
 * hand-built Next.js site at /Users/user/Documents/GitHub/torre-ks — NOT the
 * nested `torre-ks/torre-ks` create-next-app scaffold, which is dead boilerplate.
 *
 * Its home page (`src/app/page.tsx` in that repo) reads these exact block
 * types/keys from the tenant's "home" Page.content.blocks, falling back to its
 * own hardcoded copy whenever a field is absent — so an empty or unreachable
 * CMS renders precisely the page that exists today.
 *
 * The section types are fixed (real framer-motion components, not swappable
 * generics) but reorderable, hideable, and content-editable.
 */
export const torreGroupSchema: SiteSchema = {
  tenantSlug: 'gazi-torre',
  siteName: 'Torre Group',
  // 3005 is where the site actually runs. Its package.json dev script claims
  // 5000, but nothing listens there — trust the observed port.
  siteUrl: process.env.NEXT_PUBLIC_TORRE_SITE_URL || 'http://localhost:3005',
  defaultOrder: ['torre-hero', 'torre-brands', 'torre-footer'],

  blockTypes: [
    { type: 'torre-hero', name: 'Hero', description: 'Eyebrow, two-line headline, and intro line' },
    { type: 'torre-brands', name: 'Company Cards', description: 'The four group companies, with accent colour and link' },
    { type: 'torre-footer', name: 'Footer', description: 'Copyright line under the cards' },
  ],

  fieldSchema: {
    'torre-hero': [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text', placeholder: 'Torre Group' },
      { key: 'titleLine1', label: 'Headline — line 1', type: 'text', placeholder: 'Një Grup.' },
      { key: 'titleLine2', label: 'Headline — line 2 (muted)', type: 'text', placeholder: 'Katër Kompani.' },
      { key: 'subtitle', label: 'Intro line', type: 'textarea' },
    ],
    'torre-brands': [
      {
        key: 'items',
        label: 'Companies',
        type: 'list',
        itemFields: [
          { key: 'category', label: 'Category', type: 'text', placeholder: 'Ndërtim Rezidencial' },
          { key: 'name', label: 'Name', type: 'text', placeholder: 'MAGFA GROUP' },
          { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Ndërtim Shtëpish me Cilësi' },
          { key: 'ctaLabel', label: 'Link label', type: 'text', placeholder: 'Eksploro' },
          { key: 'href', label: 'Link URL', type: 'text', placeholder: 'https://magfa.torre-ks.com' },
          { key: 'accentHsl', label: 'Accent colour (HSL)', type: 'text', placeholder: '200 100% 45%' },
        ],
      },
    ],
    'torre-footer': [
      { key: 'text', label: 'Copyright text', type: 'text', placeholder: 'Torre Group — torre-ks.com' },
    ],
  },

  // Verbatim from the live page today, so connecting the CMS changes nothing
  // visible until someone deliberately edits a field.
  defaultProps: {
    'torre-hero': {
      eyebrow: 'Torre Group',
      titleLine1: 'Një Grup.',
      titleLine2: 'Katër Kompani.',
      subtitle: 'Zgjidhni një kompani për të eksploruar shërbimet, portofolin dhe ekspertizën e tyre.',
    },
    'torre-brands': {
      items: [
        {
          category: 'Ndërtim Rezidencial',
          name: 'MAGFA GROUP',
          tagline: 'Ndërtim Shtëpish me Cilësi',
          ctaLabel: 'Eksploro',
          href: 'https://magfa.torre-ks.com',
          accentHsl: '200 100% 45%',
        },
        {
          category: 'Dritare & Fasada',
          name: 'SWISSTECH',
          tagline: 'Fabrikë Dritaresh & Montim Professional',
          ctaLabel: 'Eksploro',
          href: 'https://swisstech.torre-ks.com',
          accentHsl: '160 84% 39%',
        },
        {
          category: 'Zhvillim Rezidencial',
          name: 'TORRE DI UMBRIA',
          tagline: 'Zhvillim i Ndërtesave Rezidenciale',
          ctaLabel: 'Eksploro',
          href: 'https://umbria.torre-ks.com',
          accentHsl: '142 71% 45%',
        },
        {
          category: 'Apartamente në Kosovë',
          name: 'TORRE HOME',
          tagline: 'Apartamente Premium në Kosovë',
          ctaLabel: 'Eksploro',
          href: 'https://home.torre-ks.com',
          accentHsl: '24 95% 53%',
        },
      ],
    },
    'torre-footer': {
      text: 'Torre Group — torre-ks.com',
    },
  },
};
