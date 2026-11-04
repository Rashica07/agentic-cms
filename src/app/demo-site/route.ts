import { THEME_PREVIEW_HTML } from '@/demo/theme-preview';

/** Demo-only: a stand-in for the tenant's public website ("Live Site" links point here). */
export function GET() {
  return new Response(THEME_PREVIEW_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
