/**
 * Demo-only stand-in for the tenant's live website, used by the Themes screen.
 * Real deployments iframe the tenant's actual site; the demo renders this tiny
 * storefront instead and restyles it live when the CMS posts
 * `NOVUS_THEME_UPDATE` messages (same protocol the real site listens for).
 */
export const THEME_PREVIEW_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--primary:#ff8c00;--background:#0a0a0a;--surface:#121212;--accent:#ff6b00;--radius:12px;--body:Inter,system-ui,sans-serif;--heading:Georgia,serif}
*{box-sizing:border-box}body{margin:0;background:var(--background);color:#f5f5f5;font:15px/1.6 var(--body)}
header{display:flex;align-items:center;gap:24px;padding:20px 40px;border-bottom:1px solid #ffffff14}
header b{font-family:var(--heading);font-size:20px;color:var(--primary);margin-right:auto}header a{font-size:13px;opacity:.7}
.hero{padding:90px 40px 70px;text-align:center}.hero h1{font-family:var(--heading);font-size:52px;margin:0 0 14px;letter-spacing:-.02em}
.hero p{opacity:.7;max-width:520px;margin:0 auto 26px}.btn{display:inline-block;background:var(--primary);color:#000;font-weight:600;padding:12px 22px;border-radius:var(--radius)}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:20px 40px 60px}
.card{background:var(--surface);border-radius:var(--radius);padding:12px}.card i{display:block;aspect-ratio:1;border-radius:calc(var(--radius) - 4px);background:linear-gradient(135deg,var(--accent),var(--primary));opacity:.85;margin-bottom:10px}
.card b{font-family:var(--heading)}.card small{display:block;opacity:.6}
footer{padding:28px 40px;border-top:1px solid #ffffff14;opacity:.6;font-size:12px}
</style></head><body>
<header><b>Meridian Roasters</b><a>Shop</a><a>Journal</a><a>Visit</a><a>Contact</a></header>
<div class="hero"><h1>Coffee, roasted slowly.</h1><p>Small-batch specialty coffee from farms we know by name.</p><span class="btn">Shop beans</span></div>
<div class="grid"><div class="card"><i></i><b>Ethiopia Guji</b><small>€19.50</small></div><div class="card"><i></i><b>Colombia Huila</b><small>€17.00</small></div><div class="card"><i></i><b>Kenya AA</b><small>€21.00</small></div><div class="card"><i></i><b>House Blend</b><small>€14.00</small></div></div>
<footer>© 2026 Meridian Roasters</footer>
<script>
function apply(t){if(!t)return;var r=document.documentElement.style,c=t.colors||{},f=t.fonts||{};
if(c.primary)r.setProperty('--primary',c.primary);if(c.background)r.setProperty('--background',c.background);
if(c.surface)r.setProperty('--surface',c.surface);if(c.accent)r.setProperty('--accent',c.accent);
if(t.borderRadius)r.setProperty('--radius',t.borderRadius);
if(f.body)r.setProperty('--body',f.body+',system-ui,sans-serif');if(f.heading)r.setProperty('--heading',f.heading+',Georgia,serif');}
window.addEventListener('message',function(e){if(e.data&&e.data.type==='NOVUS_THEME_UPDATE')apply(e.data.theme)});
</script></body></html>`;
