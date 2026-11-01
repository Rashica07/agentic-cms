'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { PlanGate } from '@/components/plan-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Paintbrush, Save, LayoutTemplate, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { useSiteInfo } from '@/hooks/useSiteInfo';
import { THEME_PREVIEW_HTML } from '@/demo/theme-preview';

const DEFAULT_THEME = {
  colors: {
    primary: '#ff8c00',
    background: '#0a0a0a',
    surface: '#121212',
    accent: '#ff6b00',
  },
  fonts: {
    body: 'Inter',
    heading: 'Outfit',
  },
  borderRadius: '12px',
};

const FONT_OPTIONS = ['Inter', 'Outfit', 'Roboto', 'Playfair Display', 'Space Grotesk'];

const THEME_LIBRARY = [
  {
    id: 'dawn',
    name: 'Dawn',
    author: 'Novus Pulse',
    description: 'A chic and minimalist theme that lets product images take center stage.',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200&h=600',
    colors: { primary: '#000000', background: '#ffffff', surface: '#f4f4f4', accent: '#ff8c00' },
  },
  {
    id: 'refresh',
    name: 'Refresh',
    author: 'Novus Pulse',
    description: 'Bold theme that elevates product quality and brand storytelling.',
    image: 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=1200&h=600',
    colors: { primary: '#ffffff', background: '#0f172a', surface: '#1e293b', accent: '#3b82f6' },
  },
];

export default function ThemesPage() {
  const { data: session } = useSession();
  const { siteUrl } = useSiteInfo();
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState(THEME_LIBRARY[0]);

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const pulse = createPulseClient(session.accessToken);
        const tenant = await pulse.getMyTenant();
        const saved = (tenant as { theme?: typeof DEFAULT_THEME }).theme;
        if (!cancelled && saved) {
          setTheme({
            colors: { ...DEFAULT_THEME.colors, ...(saved.colors ?? {}) },
            fonts: { ...DEFAULT_THEME.fonts, ...(saved.fonts ?? {}) },
            borderRadius: saved.borderRadius ?? DEFAULT_THEME.borderRadius,
          });
        }
      } catch {
        // Fallback to default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const broadcastTheme = (nextTheme: typeof theme) => {
    const iframe = document.getElementById('site-preview-iframe') as HTMLIFrameElement | null;
    iframe?.contentWindow?.postMessage({ type: 'NOVUS_THEME_UPDATE', theme: nextTheme }, '*');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const pulse = createPulseClient(session?.accessToken);
      await pulse.updateMyTheme(theme);
      broadcastTheme(theme);
      toast.success('Theme settings saved to live site!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save theme settings');
    } finally {
      setSaving(false);
    }
  };

  const applyLibraryTheme = (libTheme: typeof THEME_LIBRARY[0]) => {
    setActiveTheme(libTheme);
    const nextTheme = { ...theme, colors: libTheme.colors };
    setTheme(nextTheme);
    broadcastTheme(nextTheme);
    toast.success(`Applied ${libTheme.name} color palette. Click save to publish.`);
  };

  const updateThemeColor = (key: keyof typeof theme.colors, value: string) => {
    const nextTheme = { ...theme, colors: { ...theme.colors, [key]: value } };
    setTheme(nextTheme);
    broadcastTheme(nextTheme);
  };

  return (
    <PlanGate feature="themes">
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <LayoutTemplate className="h-7 w-7 text-brand" /> Themes & Customization
          </h1>
          <p className="text-neutral-400 mt-2">
            Manage your store's look and feel, customize themes, and tweak your brand settings.
          </p>
        </div>

        {/* Top Section: Active Theme Banner (Shopify Style) */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 overflow-hidden flex flex-col shadow-2xl">
          {/* Live Site Preview with Overlay */}
          <div className="relative h-[400px] w-full group overflow-hidden bg-white">
            <div className="absolute inset-0 origin-top-left pointer-events-none" style={{ width: '250%', height: '250%', transform: 'scale(0.4)' }}>
              {/* siteUrl is null until the tenant's site is discovered or a
                  domain is set — an empty iframe beats loading a wrong host. */}
              {process.env.NEXT_PUBLIC_DEMO_MODE !== 'false' ? (
                <iframe
                  id="site-preview-iframe"
                  srcDoc={THEME_PREVIEW_HTML}
                  sandbox="allow-scripts"
                  title="Live site preview"
                  className="w-full h-full border-none transition-transform duration-700 group-hover:scale-105"
                />
              ) : siteUrl ? (
                <iframe
                  id="site-preview-iframe"
                  src={siteUrl}
                  title="Live site preview"
                  className="w-full h-full border-none transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-center">
                  <div className="max-w-sm space-y-2 p-8">
                    <p className="text-sm font-medium text-neutral-300">No site connected</p>
                    <p className="text-xs text-neutral-500">
                      Set this tenant&apos;s domain in Settings → Site Connection, or run its app locally so the CMS can find it.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-8 left-8 flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                <Paintbrush className="h-8 w-8 text-white drop-shadow-md" />
              </div>
              <div>
                <span className="text-sm font-bold uppercase tracking-widest text-brand drop-shadow-sm">Current Theme</span>
                <h2 className="text-4xl font-extrabold text-white drop-shadow-lg tracking-tight mt-1">{activeTheme.name}</h2>
              </div>
            </div>
            {/* Live Indicator */}
            <div className="absolute top-6 right-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400 border border-green-500/30 shadow-lg backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Published
              </span>
            </div>
          </div>

          {/* Info and Edit Button */}
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-neutral-950">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Customize your store</h3>
              <p className="text-neutral-400 mt-2 text-sm leading-relaxed max-w-2xl">
                Use the visual builder to modify your layout, sections, and add new blocks. 
                Your changes are saved as drafts until you explicitly publish them.
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs text-neutral-500 font-medium">
                <span>Version 2.0</span>
                <span>•</span>
                <span>Last saved: Just now</span>
              </div>
            </div>
            <Link href="/dashboard/builder/editor">
              <Button className="h-12 px-8 rounded-xl bg-brand text-black hover:bg-brand/90 font-bold shadow-[0_0_20px_rgba(255,140,0,0.3)] transition-all hover:scale-105 gap-2 text-md">
                <Settings2 className="h-5 w-5" /> Customize
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom Section: Theme Library and Manual Colors */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left: Manual Color/Theme Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div id="theme-settings-panel" className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 sticky top-6 scroll-mt-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Paintbrush className="h-5 w-5 text-brand" /> Theme Settings
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">Brand Colors</h4>
                  <div className="space-y-4">
                    <ColorPicker label="Primary Brand" value={theme.colors.primary} onChange={(v) => updateThemeColor('primary', v)} />
                    <ColorPicker label="Background" value={theme.colors.background} onChange={(v) => updateThemeColor('background', v)} />
                    <ColorPicker label="Surface Cards" value={theme.colors.surface} onChange={(v) => updateThemeColor('surface', v)} />
                    <ColorPicker label="Accent/Action" value={theme.colors.accent} onChange={(v) => updateThemeColor('accent', v)} />
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">Typography</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-400 text-xs">Headings Font</Label>
                      <select 
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg h-10 px-3 text-sm text-white"
                        value={theme.fonts.heading}
                        onChange={(e) => setTheme({ ...theme, fonts: { ...theme.fonts, heading: e.target.value } })}
                      >
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-400 text-xs">Body Font</Label>
                      <select 
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg h-10 px-3 text-sm text-white"
                        value={theme.fonts.body}
                        onChange={(e) => setTheme({ ...theme, fonts: { ...theme.fonts, body: e.target.value } })}
                      >
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="w-full bg-white text-black hover:bg-neutral-200 font-bold"
                  >
                    {saving ? 'Saving...' : 'Save Theme Settings'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Theme Library */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Theme Library
            </h3>
            <div className="grid sm:grid-cols-2 gap-6">
              {THEME_LIBRARY.map((libTheme) => (
                <div key={libTheme.id} className="group rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden hover:border-brand/40 transition-all duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={libTheme.image} 
                      alt={libTheme.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Button 
                        variant="outline"
                        className="bg-white text-black font-semibold hover:bg-brand hover:text-white hover:border-brand transition-colors"
                        onClick={() => applyLibraryTheme(libTheme)}
                      >
                        Apply Theme
                      </Button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="text-lg font-bold text-white">{libTheme.name}</h4>
                    <p className="text-xs text-neutral-500 mt-1">By {libTheme.author}</p>
                    <p className="text-sm text-neutral-400 mt-3 line-clamp-2">{libTheme.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </PlanGate>
  );
}

function ColorPicker({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="flex items-center justify-between group">
      <Label className="text-sm text-neutral-300 font-medium cursor-pointer">{label}</Label>
      <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800 ring-1 ring-transparent focus-within:ring-brand/50 transition-all">
        <Input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="p-0 border-0 w-7 h-7 rounded cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md"
        />
        <Input 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-20 border-0 bg-transparent text-xs uppercase font-mono p-0 focus-visible:ring-0 text-neutral-400 text-center"
        />
      </div>
    </div>
  );
}
