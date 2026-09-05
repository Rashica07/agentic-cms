'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {
  MessageCircle,
  Zap,
  ShieldCheck,
  History,
  Braces,
  ArrowRight,
  ArrowDown,
  Check,
  Smartphone,
  Eye,
} from 'lucide-react';

/**
 * Marketing homepage — chat-first pitch.
 *
 * Design language: editorial dark ink (deliberately dark-only — marketing
 * commits to one look), noise grain, hairline rules instead of floating
 * cards, pointer-reactive borders, and ONE bespoke centerpiece: a real
 * interactive WhatsApp→CMS sync simulator instead of a passive demo loop.
 *
 * Performance rules: every animation is transform/opacity only (GPU-safe),
 * pointer effects write CSS vars (paint-only), reveals respect
 * prefers-reduced-motion, DOM stays shallow — no virtualization needed.
 */

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Edit by texting',
    desc: '"Change the coffee price to €3.50." That\'s it. No dashboards, no fields, no tutorials — describe the change like you\'d tell an employee.',
  },
  {
    icon: Eye,
    title: 'Preview before live',
    desc: 'Every request becomes a clear before → after card. Nothing touches your website until you tap Confirm. No surprises, ever.',
  },
  {
    icon: Zap,
    title: 'Live in seconds',
    desc: 'Confirmed changes appear on your site in about a second — no rebuilds, no deploys, no waiting for a developer.',
  },
  {
    icon: Smartphone,
    title: 'Or just WhatsApp us',
    desc: 'Don\'t even want to open a browser? Send the change to your dedicated WhatsApp number and reply "yes" to the preview. Done.',
  },
  {
    icon: History,
    title: 'A full paper trail',
    desc: 'Every change is logged: what changed, when, before and after. Roll your eyes at "who changed this?" forever.',
  },
  {
    icon: Braces,
    title: 'Headless API for IT teams',
    desc: 'Agency tier keeps the full developer surface: REST + realtime API, custom content types, raw data access. Chat for owners, API for engineers.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'for 3 months',
    tagline: 'Try it with your first project',
    features: ['1 website', 'Chat-based editing', 'Preview before live', 'Change history'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Studio',
    price: '€100',
    period: '/year',
    tagline: 'For growing businesses',
    features: [
      'Everything in Starter',
      'WhatsApp editing channel',
      '3 websites',
      'Staff accounts & roles',
      'Priority support',
    ],
    cta: 'Get Studio',
    highlight: true,
  },
  {
    name: 'Agency',
    price: '€230',
    period: '/month',
    tagline: 'For teams & IT companies',
    features: [
      'Everything in Studio',
      'Unlimited websites',
      'Full headless API access',
      'Custom content types & e-commerce',
      'White-label panel',
    ],
    cta: 'Get Agency',
    highlight: false,
  },
];

/* ── Interactive sync simulator ─────────────────────────────────────────── */

type SiteState = { price: string; hours: string; section: string };

const SITE_DEFAULTS: SiteState = { price: '€3.00', hours: '09:00 – 21:00', section: 'Specials' };

const SCENARIOS: {
  id: keyof SiteState;
  chip: string;
  msg: string;
  field: string;
  page: string;
  before: string;
  after: string;
}[] = [
  {
    id: 'price',
    chip: '“Coffee is €3.50 now”',
    msg: 'Change the coffee price to €3.50',
    field: 'Cappuccino',
    page: 'Menu page',
    before: '€3.00',
    after: '€3.50',
  },
  {
    id: 'hours',
    chip: '“Sunday we open at 10”',
    msg: 'Change Sunday hours to 10:00 – 22:00',
    field: 'Opening hours · Sunday',
    page: 'Contact page',
    before: '09:00 – 21:00',
    after: '10:00 – 22:00',
  },
  {
    id: 'section',
    chip: '“Rename Specials”',
    msg: 'Rename the Specials section to “Chef’s Picks”',
    field: 'Section title',
    page: 'Menu page',
    before: 'Specials',
    after: 'Chef’s Picks',
  },
];

type Phase = 'idle' | 'sent' | 'typing' | 'preview' | 'confirmed';

/**
 * The centerpiece: a working model of the WhatsApp→CMS loop. Click a
 * suggested edit (or let it auto-play), watch the preview card arrive,
 * press Confirm yourself, and see the mini website update through the
 * sync pulse. State machine + CSS transitions — transform/opacity only.
 */
function SyncSimulator() {
  const [scenario, setScenario] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [site, setSite] = useState<SiteState>(SITE_DEFAULTS);
  const [flash, setFlash] = useState<keyof SiteState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const auto = useRef(true);
  const s = SCENARIOS[scenario];

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  /** Play a scenario up to the preview card, then wait for Confirm. */
  const run = useCallback((idx: number) => {
    clearTimers();
    setScenario(idx);
    setPhase('sent');
    later(() => setPhase('typing'), 650);
    later(() => setPhase('preview'), 1750);
    // Auto mode presses Confirm for you; a human gets to press it.
    if (auto.current) later(() => confirm(idx), 3600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = useCallback((idx: number) => {
    const sc = SCENARIOS[idx];
    setPhase('confirmed');
    later(() => {
      setSite((prev) => ({ ...prev, [sc.id]: sc.after }));
      setFlash(sc.id);
    }, 550);
    later(() => setFlash(null), 2400);
    later(() => {
      setPhase('idle');
      if (auto.current) {
        const next = (idx + 1) % SCENARIOS.length;
        // A full lap resets the mini site so the loop reads fresh each time.
        if (next === 0) setSite(SITE_DEFAULTS);
        later(() => run(next), 900);
      }
    }, 2600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Any human interaction ends autopilot — the demo is theirs now. */
  const takeOver = (idx: number) => {
    auto.current = false;
    run(idx);
  };

  useEffect(() => {
    later(() => {
      if (auto.current) run(0);
    }, 1100);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = phase !== 'idle';

  return (
    <div className="sim relative">
      {/* Suggested edits — the interactive entry point */}
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Try an edit">
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.id}
            onClick={() => takeOver(i)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
              scenario === i && busy
                ? 'border-brand/60 bg-brand/10 text-brand'
                : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/25 hover:text-neutral-200'
            }`}
          >
            {sc.chip}
          </button>
        ))}
      </div>

      <div className="grid items-stretch gap-0 lg:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)]">
        {/* Phone — WhatsApp side */}
        <div className="rounded-[1.6rem] border border-white/10 bg-[#101014] p-3 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]">
          <div className="mb-3 flex items-center gap-2 border-b border-white/5 px-1 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25d366]/15 text-[#25d366]">
              <Smartphone className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-neutral-100">Novus Pulse</p>
              <p className="text-[9px] text-neutral-500">WhatsApp · your dedicated number</p>
            </div>
            <span className="ml-auto flex items-center gap-1 text-[9px] text-[#25d366]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#25d366]" /> online
            </span>
          </div>

          <div className="min-h-[290px] space-y-3 px-1 pb-1">
            {/* user message */}
            <div
              className={`flex justify-end transition-all duration-300 ease-out ${
                phase === 'idle' ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
              }`}
            >
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#005c4b] px-3.5 py-2 text-xs text-neutral-100">
                {s.msg}
              </div>
            </div>

            {/* typing dots */}
            <div
              className={`flex justify-start transition-opacity duration-200 ${
                phase === 'typing' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1 w-1 animate-bounce rounded-full bg-neutral-500"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* preview card — the product's core promise */}
            <div
              className={`space-y-2 rounded-2xl border border-brand/40 bg-brand/[0.06] p-3.5 transition-all duration-300 ease-out ${
                phase === 'preview' || phase === 'confirmed'
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-2 opacity-0'
              }`}
            >
              <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-brand">
                Preview — not live yet
              </p>
              <p className="text-[10px] text-neutral-400">
                {s.field} · {s.page}
              </p>
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 line-through">
                {s.before}
              </div>
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1.5 text-xs text-green-300">
                {s.after}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    auto.current = false;
                    clearTimers();
                    confirm(scenario);
                  }}
                  disabled={phase !== 'preview'}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand py-1.5 text-[10px] font-bold text-black transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                >
                  <Check className="h-3 w-3" /> Confirm
                </button>
                <button
                  onClick={() => {
                    auto.current = false;
                    clearTimers();
                    setPhase('idle');
                  }}
                  disabled={phase !== 'preview'}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-[10px] text-neutral-400 transition-colors hover:text-neutral-200 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* confirmation */}
            <div
              className={`flex justify-start transition-all duration-300 ease-out ${
                phase === 'confirmed' ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2 text-xs text-neutral-200">
                <Zap className="h-3 w-3 text-brand" /> Live on your site ✓
              </div>
            </div>
          </div>
        </div>

        {/* Sync track (desktop) */}
        <div className="relative hidden items-center justify-center lg:flex" aria-hidden>
          <div className="relative h-px w-full max-w-[8.5rem] bg-white/10">
            <span
              className={`absolute -top-[3px] left-0 h-[7px] w-[7px] rounded-full bg-brand shadow-[0_0_12px_2px_rgba(255,140,0,0.5)] ${
                phase === 'confirmed' ? 'sim-dot-travel' : 'opacity-0'
              }`}
            />
          </div>
          <span className="absolute top-[calc(50%+10px)] text-[9px] uppercase tracking-[0.22em] text-neutral-600">
            realtime sync
          </span>
        </div>
        <div className="flex items-center justify-center py-3 lg:hidden" aria-hidden>
          <ArrowDown className={`h-4 w-4 ${phase === 'confirmed' ? 'text-brand' : 'text-neutral-700'} transition-colors`} />
        </div>

        {/* Mini website */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d10] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-red-500/50" />
            <span className="h-2 w-2 rounded-full bg-amber-500/50" />
            <span className="h-2 w-2 rounded-full bg-green-500/50" />
            <span className="ml-2 rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] text-neutral-500">
              torre-cafe.com
            </span>
            <span
              className={`ml-auto flex items-center gap-1 text-[9px] text-brand transition-opacity duration-300 ${
                flash ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Zap className="h-2.5 w-2.5" /> updated just now
            </span>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">Torre Café</p>
              <p
                className={`mt-1 text-lg font-bold tracking-tight text-neutral-100 transition-colors duration-500 ${
                  flash === 'section' ? 'text-brand' : ''
                }`}
              >
                {site.section}
              </p>
            </div>

            <div
              className={`flex items-baseline justify-between rounded-xl border px-3.5 py-2.5 transition-colors duration-500 ${
                flash === 'price' ? 'border-brand/50 bg-brand/[0.07]' : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-neutral-200">Cappuccino</p>
                <p className="text-[10px] text-neutral-500">double shot · oat milk +€0.40</p>
              </div>
              <p className={`font-mono text-sm transition-colors duration-500 ${flash === 'price' ? 'text-brand' : 'text-neutral-300'}`}>
                {site.price}
              </p>
            </div>

            <div
              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors duration-500 ${
                flash === 'hours' ? 'border-brand/50 bg-brand/[0.07]' : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              <p className="text-sm text-neutral-200">Sunday</p>
              <p className={`font-mono text-xs transition-colors duration-500 ${flash === 'hours' ? 'text-brand' : 'text-neutral-400'}`}>
                {site.hours}
              </p>
            </div>

            <p className="pt-1 text-[10px] leading-relaxed text-neutral-600">
              This is a live model of your actual site — every confirmed change lands here through
              the same realtime sync your visitors see.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

/** Pointer-reactive border: writes CSS vars only — paint-level work, no layout. */
function spotlightMove(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reduced motion: skip every entrance/scroll animation — content just shows.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Hero entrance — GSAP timeline, above the fold only.
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.hero-line', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 })
        .fromTo('.hero-sub', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.5')
        .fromTo('.hero-cta', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.08 }, '-=0.4')
        .fromTo('.hero-sim', { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, '-=0.45');
    }, root);

    // Scroll reveals — IntersectionObserver + a CSS class, not ScrollTrigger.
    // Elements are VISIBLE by default; only ones still below the viewport get
    // hidden, so content can never be stranded invisible if JS misbehaves.
    const els = Array.from(root.current?.querySelectorAll<HTMLElement>('.reveal') ?? []);
    const below = els.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);
    below.forEach((el) => el.classList.add('pre'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            (en.target as HTMLElement).classList.remove('pre');
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    below.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={root} className="min-h-screen overflow-x-hidden bg-[#0a0a0b] text-neutral-100">
      {/* Film grain — one fixed layer, zero JS */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Single restrained tint — no glowing orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[42rem]"
        style={{
          background:
            'radial-gradient(60rem 28rem at 70% -10%, rgba(255,140,0,0.07), transparent 60%), radial-gradient(40rem 20rem at 15% 0%, rgba(255,255,255,0.03), transparent 55%)',
        }}
      />

      {/* ── Nav ── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-[15px] font-bold tracking-[-0.02em]">
            Novus <span className="text-brand">Pulse</span>
          </span>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-2 text-sm text-neutral-400 transition-colors hover:text-white">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative z-10 px-6 pb-20 pt-36 md:pt-44">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="hero-line mb-6 font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Headless CMS <span className="text-neutral-700">/</span> WhatsApp admin panel
            </p>
            <h1 className="text-[clamp(2.9rem,7.5vw,5.4rem)] font-bold leading-[0.98] tracking-[-0.04em]">
              <span className="hero-line block">Tell your website</span>
              <span className="hero-line block text-brand">what to change.</span>
            </h1>
            <p className="hero-sub mt-8 max-w-xl text-lg leading-relaxed text-neutral-400">
              <strong className="font-semibold text-neutral-200">Owners</strong> text a WhatsApp number and
              confirm a preview — done. <strong className="font-semibold text-neutral-200">Agencies</strong> get
              the full headless CMS underneath: API, realtime, AI copilot.
            </p>
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="hero-cta group inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 font-semibold text-black transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
              >
                Try it free for 3 months
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="hero-cta inline-flex items-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 font-semibold text-neutral-200 transition-colors hover:border-white/25"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* The centerpiece */}
          <div className="hero-sim mt-16 md:mt-20">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
              Live model — click a suggestion, press confirm
            </p>
            <SyncSimulator />
          </div>
        </div>
      </header>

      {/* ── Features — editorial rule grid, no floating cards ── */}
      <section className="relative z-10 border-t border-white/[0.06] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mb-14 max-w-2xl">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-brand">How you&apos;ll use it</p>
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.03em]">
              Running a website shouldn&apos;t feel like work.
            </h2>
          </div>

          <div className="grid border-l border-t border-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                onMouseMove={spotlightMove}
                className="spot reveal relative border-b border-r border-white/[0.06] p-7"
              >
                <p className="mb-5 font-mono text-[10px] text-neutral-600">{String(i + 1).padStart(2, '0')}</p>
                <f.icon className="mb-4 h-5 w-5 text-brand" strokeWidth={1.75} />
                <h3 className="mb-2 text-[15px] font-semibold tracking-[-0.01em]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WhatsApp callout — asymmetric split ── */}
      <section className="relative z-10 border-t border-white/[0.06] px-6 py-24">
        <div className="reveal mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-[#25d366]">The shortcut</p>
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.03em]">
              Skip the website entirely —<br />
              <span className="text-[#25d366]">text us on WhatsApp.</span>
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-neutral-400">
              Send &quot;change our Sunday hours to 10–22&quot; to your dedicated number. The same before →
              after preview comes back as a message. Reply <em>yes</em> and it&apos;s live. That&apos;s the
              entire workflow.
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-600">
              Studio &amp; Agency plans
            </p>
          </div>
          <div className="space-y-2.5">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#005c4b] px-4 py-2.5 text-sm text-neutral-100">
              change our sunday hours to 10–22
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.05] px-4 py-2.5 text-sm text-neutral-300">
              Here&apos;s the preview: <span className="text-red-300 line-through">09–21</span>{' '}
              <span className="text-green-300">10–22</span>. Reply <strong>yes</strong> to publish.
            </div>
            <div className="ml-auto max-w-[40%] rounded-2xl rounded-br-md bg-[#005c4b] px-4 py-2.5 text-sm text-neutral-100">
              yes
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.05] px-4 py-2.5 text-sm text-neutral-300">
              ✓ Live. Logged at 18:42 — you can roll it back anytime.
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works — editorial numerals ── */}
      <section className="relative z-10 border-t border-white/[0.06] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="reveal mb-14">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-brand">How it works</p>
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.03em]">
              Three steps. Zero learning curve.
            </h2>
          </div>
          <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {[
              ['01', 'Say it', 'Type (or WhatsApp) what you want changed, in plain language. Any language.'],
              ['02', 'See it', 'You get an exact before → after preview. Nothing happens without your explicit confirmation.'],
              ['03', "It's live", 'One tap and the change is on your website in seconds — no rebuild, no deploy, no developer.'],
            ].map(([n, t, d]) => (
              <div key={n} className="reveal grid items-baseline gap-4 py-8 sm:grid-cols-[7rem_14rem_1fr]">
                <span className="text-[clamp(2.4rem,5vw,3.6rem)] font-bold leading-none tracking-[-0.04em] text-white/[0.13]">
                  {n}
                </span>
                <h3 className="text-xl font-semibold tracking-[-0.02em]">{t}</h3>
                <p className="leading-relaxed text-neutral-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="relative z-10 border-t border-white/[0.06] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="reveal mb-14 max-w-2xl">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-brand">Pricing</p>
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.03em]">
              Simple, honest plans.
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              Card payments via Stripe — launching soon. Start with a free 3-month trial today.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                onMouseMove={spotlightMove}
                className={`spot reveal relative flex flex-col p-8 ${
                  p.highlight ? 'bg-[#121014]' : 'bg-[#0c0c0e]'
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-[-0.01em]">{p.name}</h3>
                  {p.highlight && (
                    <span className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-brand">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500">{p.tagline}</p>
                <div className="mb-7 mt-6 flex items-baseline gap-1">
                  <span className="text-[2.6rem] font-bold leading-none tracking-[-0.03em]">{p.price}</span>
                  <span className="text-sm text-neutral-500">{p.period}</span>
                </div>
                <ul className="mb-8 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-neutral-300">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2.5} /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block rounded-xl px-5 py-3 text-center text-sm font-semibold transition-colors ${
                    p.highlight
                      ? 'bg-brand text-black hover:bg-brand-hover'
                      : 'border border-white/10 text-neutral-200 hover:border-white/25'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 border-t border-white/[0.06] px-6 py-32">
        <div className="reveal mx-auto max-w-4xl">
          <ShieldCheck className="mb-8 h-9 w-9 text-brand" strokeWidth={1.5} />
          <h2 className="text-[clamp(2.2rem,6vw,4.2rem)] font-bold leading-[1.02] tracking-[-0.04em]">
            Nothing goes live
            <br />
            <span className="text-brand">without your yes.</span>
          </h2>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-neutral-400">
            Every change is previewed, confirmed by you, and logged. Your website stays exactly as
            safe as it is effortless.
          </p>
          <Link
            href="/register"
            className="group mt-10 inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-4 font-semibold text-black transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            Create your free workspace
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-neutral-500 sm:flex-row">
          <span className="font-semibold tracking-[-0.01em] text-neutral-300">
            Novus <span className="text-brand">Pulse</span>
          </span>
          <span>© {new Date().getFullYear()} KIQA DEV. All rights reserved.</span>
        </div>
      </footer>

      {/* Page-scoped effect styles: spotlight borders + sync dot. Transform/opacity only. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .spot::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
          background: radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), rgba(255,140,0,0.08), transparent 65%);
        }
        .spot:hover::after { opacity: 1; }
        .reveal { transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.25, 1, 0.5, 1); }
        .reveal.pre { opacity: 0; transform: translateY(44px); }
        @keyframes sim-travel {
          0% { transform: translateX(0); opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translateX(8rem); opacity: 0; }
        }
        .sim-dot-travel { animation: sim-travel 0.9s ease-in-out both; }
        @media (prefers-reduced-motion: reduce) {
          .sim-dot-travel { animation: none; opacity: 1; transform: translateX(8rem); }
          .spot::after { transition: none; }
        }
      `,
        }}
      />
    </div>
  );
}
