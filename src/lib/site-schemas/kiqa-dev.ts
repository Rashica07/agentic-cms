import type { SiteSchema } from './types';

/**
 * kiqa-dev is a real, hand-built Next.js site (not the generic in-app
 * renderer) — its home page (`app/page.tsx` in that repo) reads these exact
 * block types/keys from the tenant's "home" Page.content.blocks, falling
 * back to its own translated copy when a field hasn't been customized.
 * Section types are fixed (they're real animated components, not swappable
 * generics) but fully reorderable, hideable, and content-editable.
 */
export const kiqaDevSchema: SiteSchema = {
  // Bound to the kiqa-dev tenant (framework contract: the kiqa-dev app
  // declares this slug in its package.json). admin-workspace gets the
  // generic block editor like every unlinked tenant.
  tenantSlug: 'kiqa-dev',
  siteName: 'kiqa-dev',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:21113',
  defaultOrder: ['kiqa-hero', 'kiqa-services', 'kiqa-work', 'kiqa-process', 'kiqa-stack', 'kiqa-blog', 'kiqa-funnel'],

  blockTypes: [
    { type: 'kiqa-hero', name: 'Hero', description: 'Headline, subheading, CTAs, and stats bar' },
    { type: 'kiqa-services', name: 'Services', description: 'Service rows with name, tagline, and timeline' },
    { type: 'kiqa-work', name: 'Selected Work', description: 'Project cards with status, year, and stack' },
    { type: 'kiqa-process', name: 'Process Timeline', description: 'Scroll-driven 4-step process' },
    { type: 'kiqa-stack', name: 'Tech Stack Ticker', description: 'Scrolling row of tech logos (visibility/order only)' },
    { type: 'kiqa-blog', name: 'Blog Carousel', description: 'Latest writing preview carousel' },
    { type: 'kiqa-funnel', name: 'Call to Project', description: 'Closing call-to-action banner' },
  ],

  fieldSchema: {
    'kiqa-hero': [
      { key: 'badge', label: 'Badge text', type: 'text' },
      { key: 'h1Line1', label: 'Heading — line 1', type: 'text' },
      { key: 'h1Line2', label: 'Heading — line 2 (gradient)', type: 'text' },
      { key: 'h1Line3', label: 'Heading — line 3', type: 'text' },
      { key: 'h1Line4', label: 'Heading — line 4', type: 'text' },
      { key: 'sub', label: 'Subheading', type: 'textarea' },
      { key: 'cta1', label: 'Primary button label', type: 'text' },
      { key: 'cta2', label: 'Secondary button label', type: 'text' },
      { key: 'available', label: 'Availability note', type: 'text' },
      {
        key: 'stats',
        label: 'Stats',
        type: 'list',
        itemFields: [
          { key: 'value', label: 'Value', type: 'text', placeholder: '150k+' },
          { key: 'label', label: 'Label', type: 'text', placeholder: 'Lines written for live products' },
        ],
      },
    ],
    'kiqa-services': [
      { key: 'label', label: 'Eyebrow label', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'items',
        label: 'Services',
        type: 'list',
        itemFields: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'tagline', label: 'Tagline', type: 'text' },
          { key: 'timeline', label: 'Timeline', type: 'text', placeholder: '6 weeks' },
        ],
      },
    ],
    'kiqa-work': [
      { key: 'label', label: 'Eyebrow label', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'projects',
        label: 'Projects',
        type: 'list',
        itemFields: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'status', label: 'Status', type: 'select', options: ['Live', 'In Development', 'Coming Soon'] },
          { key: 'year', label: 'Year', type: 'text', placeholder: '2026' },
          { key: 'desc', label: 'Description', type: 'textarea' },
          { key: 'stack', label: 'Stack (comma separated)', type: 'text', arrayItem: true, placeholder: 'Next.js, TypeScript' },
        ],
      },
    ],
    'kiqa-process': [
      { key: 'label', label: 'Eyebrow label', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'steps',
        label: 'Steps',
        type: 'list',
        itemFields: [
          { key: 'n', label: 'Number', type: 'text', placeholder: '01' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'desc', label: 'Description', type: 'textarea' },
        ],
      },
    ],
    'kiqa-stack': [],
    'kiqa-blog': [
      { key: 'label', label: 'Eyebrow label', type: 'text' },
      { key: 'latestNotes', label: 'Title', type: 'text' },
      { key: 'viewAllWriting', label: '"View all" link label', type: 'text' },
      {
        key: 'posts',
        label: 'Posts',
        type: 'list',
        itemFields: [
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'date', label: 'Date', type: 'text', placeholder: 'Mar 28, 2026' },
          { key: 'read', label: 'Read time (minutes)', type: 'number' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
          { key: 'slug', label: 'Slug', type: 'text', placeholder: 'my-post-slug' },
        ],
      },
    ],
    'kiqa-funnel': [
      { key: 'label', label: 'Eyebrow label', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'sub', label: 'Subheading', type: 'textarea' },
      { key: 'buttonLabel', label: 'Button label', type: 'text' },
    ],
  },

  // Seeded from the site's current live English copy, so opening the editor
  // for the first time shows real content instead of an empty page.
  defaultProps: {
    'kiqa-hero': {
      badge: 'Available for new projects · Kosovo / Italy',
      h1Line1: 'I build digital products',
      h1Line2: 'your customers',
      h1Line3: 'actually use —',
      h1Line4: 'and come back to.',
      sub: 'I take ideas from a conversation to a live product. Apps, websites, and online platforms — built to perform, delivered on time, no surprises.',
      cta1: 'Tell me about your project',
      cta2: 'See my work',
      available: 'Taking on new projects from August 2026',
      stats: [
        { value: '150k+', label: 'Lines written for live products' },
        { value: '3+', label: 'Years building professionally' },
        { value: '4', label: 'Languages spoken' },
        { value: '6wk', label: 'From idea to App Store' },
      ],
    },
    'kiqa-services': {
      label: 'Services',
      title: 'Clear price. Clear scope. Done.',
      items: [
        { name: 'Mobile App', tagline: 'Your idea, live on the App Store and Google Play in 6 weeks.', timeline: '6 weeks' },
        { name: 'Landing Page', tagline: 'A website that makes people stop and pay attention — in 7 days.', timeline: '7 days' },
        { name: 'Web Platform', tagline: 'A full product on the web — accounts, payments, dashboards — in 3 weeks.', timeline: '3 weeks' },
        { name: 'Custom Backend', tagline: 'The foundation your product needs — built in 2 weeks.', timeline: '2 weeks' },
      ],
    },
    'kiqa-work': {
      label: 'Selected Work',
      title: 'Real projects. Real results.',
      projects: [
        {
          name: 'Torre Group',
          status: 'Live',
          year: '2024',
          desc: 'A corporate web platform for Torre Group, comprising MAGFA GROUP, SWISSTECH, TORRE DI UMBRIA, and TORRE HOME. Premium design reflecting high-quality construction and real estate.',
          stack: ['Next.js', 'TypeScript', 'Tailwind CSS'],
        },
        {
          name: 'Spindare',
          status: 'In Development',
          year: '2025–2026',
          desc: "A social app where users earn rewards for their daily habits. I led the entire product — from the first screen to launch preparation. Shipping on iOS this September.",
          stack: ['React Native', 'TypeScript', 'Supabase', 'Clerk', 'Expo'],
        },
        {
          name: 'TravelMe',
          status: 'Coming Soon',
          year: '2026',
          desc: "An app that plans your entire trip from a single message. Tell it where you want to go and what you're into, and it handles everything else.",
          stack: ['React Native', 'OpenAI API', 'Node.js', 'MongoDB'],
        },
        {
          name: 'KIQA DEV',
          status: 'Live',
          year: '2026',
          desc: 'This site — built in four languages, with smooth animations and a 3D background. Designed to get clients to reach out.',
          stack: ['Next.js', 'TypeScript', 'Three.js', 'Framer Motion'],
        },
      ],
    },
    'kiqa-process': {
      label: 'How it works',
      title: 'Simple from start to finish',
      steps: [
        { n: '01', title: 'We talk', desc: 'A 30-minute call to understand what you need, when you need it, and what a good result looks like. No commitment.' },
        { n: '02', title: 'You get a proposal', desc: "A written breakdown — what I'll build, what it costs, and when it'll be done. In your inbox within 24 hours." },
        { n: '03', title: 'I build it', desc: "Regular updates, early previews, and a direct line to me throughout. You're never left wondering." },
        { n: '04', title: 'You go live', desc: 'Your product launches. I hand over everything — code, accounts, documentation — plus 30 days of support.' },
      ],
    },
    'kiqa-stack': {},
    'kiqa-blog': {
      label: 'Writing',
      latestNotes: 'Latest Notes.',
      viewAllWriting: 'View all writing',
      posts: [
        {
          slug: 'flatlist-memory-leak',
          category: 'React Native',
          title: "How I fixed a memory leak that was crashing Spindare's social feed",
          excerpt: "The feed was slowing to a halt after a few minutes of use. Here's how I tracked down the problem and fixed it.",
          date: 'Mar 28, 2026',
          read: 7,
        },
        {
          slug: 'auth-flow-48-hours',
          category: 'Architecture',
          title: "Why I rebuilt Spindare's login system in 48 hours — and don't regret it",
          excerpt: 'The old setup worked fine until it did not. An honest account of the decision, the rebuild, and what I would do differently.',
          date: 'Mar 14, 2026',
          read: 9,
        },
        {
          slug: 'supabase-vs-firebase',
          category: 'Backend',
          title: 'Supabase vs Firebase for a social feed: what I found after testing both properly',
          excerpt: 'I needed live updates for a large number of users at the same time. Both tools promised it. Only one delivered.',
          date: 'Feb 22, 2026',
          read: 11,
        },
        {
          slug: 'react-native-design-system',
          category: 'Design',
          title: 'How we built a design system for a mobile app with hundreds of screens',
          excerpt: "When your app has hundreds of components and a small team, having a shared set of rules isn't optional. This is how we did it.",
          date: 'Feb 8, 2026',
          read: 8,
        },
        {
          slug: 'travelme-ai-weekend',
          category: 'AI',
          title: "How I built TravelMe's AI trip planner in a weekend",
          excerpt: 'One message, a full itinerary. I had a weekend and an OpenAI API key. This is what I built, what surprised me, and what did not work.',
          date: 'Jun 12, 2026',
          read: 6,
        },
        {
          slug: 'travelme-openai-vs-gemini',
          category: 'AI',
          title: "Why I chose OpenAI over Gemini for TravelMe's recommendations engine",
          excerpt: "I tested both models properly for two weeks. The answer wasn't about price — it was about what happens when you tell the AI someone has a dietary restriction.",
          date: 'Jun 20, 2026',
          read: 8,
        },
        {
          slug: 'travelme-when-ai-is-wrong',
          category: 'AI',
          title: 'The hardest part of building an AI travel app: when the AI is confident and wrong',
          excerpt: "A restaurant that closed two years ago. Visa requirements that are out of date. The AI says it with full confidence. Here's how I'm handling it.",
          date: 'Jun 25, 2026',
          read: 7,
        },
      ],
    },
    'kiqa-funnel': {
      label: 'Start a Project',
      title: 'Tell me about your project',
      sub: "Fill in the form below and I'll come back to you with a clear plan within 24 hours.",
      buttonLabel: 'Tell me about your project',
    },
  },
};
