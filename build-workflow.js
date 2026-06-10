export const meta = {
  name: 'famtastic-hosting-build',
  description: 'Build FAMtasticHosting.com — 7-page Astro hosting site with shared components',
  phases: [
    { title: 'Scaffold', detail: 'Astro project init, components, styles, data' },
    { title: 'Pages', detail: '7 pages built in parallel' },
    { title: 'Verify', detail: 'Build check + commit each page' },
  ],
}

const ROOT = '/Users/famtasticfritz/famtastic/famtastic-sites/famtastic-hosting'

// ─── SHARED CONTEXT ──────────────────────────────────────────────────────────

const PRICING = `
PRICING (retail only, never show wholesale):
- .com: $20/yr  .net: $25/yr  .org: $22/yr  .co: $35/yr
- cPanel Starter: $7/mo (1 site, 50GB SSD, cPanel, SSL, custom nameservers, white-label support)
- cPanel Ultimate: $31/mo (Unlimited sites/storage, cPanel+Softaculous, malware scan, priority support)
- Managed WP Basic: $12/mo (1 site, 30GB SSD, 1-click WP, daily backups, custom nameservers, SSL)
- Managed WP Ultimate: $24/mo (Unlimited sites, 75GB SSD, WP staging, malware scan, priority support)
- Web Hosting Plus Launch: $37/mo (1 site, 30GB NVMe, dedicated CPU+RAM, custom nameservers, SSL)
- Web Hosting Plus Expand: $127/mo (Unlimited sites, 120GB NVMe, dedicated resources, priority support)
- Website Builder Essential: $12/mo (1 site, free domain, mobile templates, SSL, basic marketing)
- Website Builder Commerce: $30/mo (Online store, payments, shipping, marketing suite, SSL)
- Pro Email: $3/mo (custom domain, 10GB)
- Group Email: $4/mo (team inboxes, shared calendars)
- Microsoft 365: $9/mo (full suite)
- SSL Standard: $79/yr (single domain, DV, auto-renew)
- Security Std: $8/mo  Security Premium: $39/mo
BUNDLES:
- Small Biz Starter: $299/yr → domain + 3 Pro Email + SSL
- WordPress Launch: $35/mo → WP Basic + Pro Email + SSL + domain
- Growth Hosting: $50/mo → WHP Launch + Security + SSL
- Designs Complete: $1,500 + $40/mo → custom design + WP Launch bundle
Annual discount: 20% off monthly equivalent
`

const COMPONENT_API = `
COMPONENT/LAYOUT IMPORT PATHS (from src/pages/*.astro):
  import WildLayout from '../layouts/WildLayout.astro'
  import ExtremeLayout from '../layouts/ExtremeLayout.astro'
  import DesignBridge from '../components/DesignBridge.astro'
  import PricingCard from '../components/PricingCard.astro'
  import BillingToggle from '../components/BillingToggle.astro'
  import FAMThoughts from '../components/FAMThoughts.astro'

COMPONENT PROPS:
WildLayout: { title: string, description: string, canonicalPath?: string }
ExtremeLayout: { title: string, description: string }
DesignBridge: { variant?: 'default'|'wordpress'|'builder'|'servers'|'domains'|'bundles' }
  - variant controls copy; all variants link to famtasticdesigns.com
  - Deep indigo bg (#1a0d3a), hot pink (#ff007a) CTA button
PricingCard: { name: string, price: string, period?: string, annualPrice?: string, annualPeriod?: string, badge?: string, tagline?: string, features: string[], ctaText: string, ctaHref?: string, featured?: boolean, position?: 'left'|'center'|'right' }
  - position determines 3D tilt: left=rotateY(14deg), center=translateZ(40px) with violet border, right=rotateY(-14deg)
  - featured=true adds lime badge
  - annualPrice shown when billing toggle set to annual
BillingToggle: no props — renders monthly/annual toggle; BillingToggle uses data-billing attribute on parent
FAMThoughts: { headline?: string, cta?: string, href?: string }
  - Default: "Running a site? Learn how to grow it." → famtasticthoughts.com

WILD DESIGN TOKENS (CSS variables in :root):
  --pitch: #080808   --surface: #111114   --surface-alt: #161620
  --violet: #7c3aed  --lime: #84cc16      --hot: #ff007a
  --text: #f5f5f0    --muted: #9090a0     --border: #2a2a38

EXTREME DESIGN TOKENS:
  --green: #00ff41   --black: #000000     --void: #060a10
  --green-dim: #00a829  --green-glow: rgba(0,255,65,0.35)

FONTS:
WILD: Space Grotesk (display 600/700), Lora (body 400/500), JetBrains Mono (code/UI)
EXTREME: Share Tech Mono (display), Space Grotesk (subheads), JetBrains Mono (code)
`

const BRAND_VOICE = `
COPY VOICE: Confident but not arrogant. Direct. Outcome-first ("sites that load fast" not "NVMe SSD").
No filler. No "In today's digital landscape". No lorem ipsum or placeholder copy.
"Talk to a Human" → mailto:hello@famtastichosting.com
Support phone: (480) 624-2500 (GoDaddy 24/7, white-labeled as FAMtastic Hosting support)
ICANN footer line: "Domain registration services fulfilled through WildWestDomains.com, an ICANN-accredited registrar."
NO logo image files — text wordmark only.
NO AI references anywhere.
`

// ─── PHASE 1: SCAFFOLD ───────────────────────────────────────────────────────

phase('Scaffold')

const SCAFFOLD_PROMPT = `
You are building the scaffold for FAMtasticHosting.com, a 7-page Astro hosting site.
Working directory: ${ROOT}

TASK: Create all files needed BEFORE the pages are built:
- Astro project config (package.json, astro.config.mjs, tsconfig.json)
- Public font files (download via curl)
- CSS: global.css, wild.css, extreme.css, components.css
- Astro components: Nav, Footer, DesignBridge, PricingCard, BillingToggle, FAMThoughts
- Astro layouts: WildLayout, ExtremeLayout
- Data files: products.json, bundles.json
- Scripts: billing-toggle.js, nav.js, animations.js

STEP 1 — Create package.json (DO NOT RUN npm create astro — do it manually):
{
  "name": "famtastic-hosting",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^4.0.0"
  }
}

STEP 2 — Create astro.config.mjs:
import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://famtastichosting.com',
  output: 'static',
});

STEP 3 — Create tsconfig.json:
{"extends": "astro/tsconfigs/base"}

STEP 4 — Create src/env.d.ts:
/// <reference types="astro/client" />

STEP 5 — Download fonts into public/fonts/:
Use curl to download woff2 font files. Here is the pattern:
  # Space Grotesk 600 and 700
  curl -L "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozuEnL5srOpGo.woff2" -o public/fonts/SpaceGrotesk-SemiBold.woff2
  curl -L "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozu0rL5srOpGo.woff2" -o public/fonts/SpaceGrotesk-Bold.woff2
  curl -L "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozuUnL5srOpGo.woff2" -o public/fonts/SpaceGrotesk-Regular.woff2
  # JetBrains Mono 400 and 700
  curl -L "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOTk6OThhvA.woff2" -o public/fonts/JetBrainsMono-Regular.woff2
  curl -L "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOTkxuThxvA.woff2" -o public/fonts/JetBrainsMono-Bold.woff2
  # Lora 400 and 500
  curl -L "https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOxE7fSUj8h5A.woff2" -o public/fonts/Lora-Regular.woff2
  curl -L "https://fonts.gstatic.com/s/lora/v35/0QI8MX1D_JOxE7fSUj-_AWH.woff2" -o public/fonts/Lora-Medium.woff2
  # Lora Italic 400
  curl -L "https://fonts.gstatic.com/s/lora/v35/0QI8MX1D_JOxE7fSUj9y_w.woff2" -o public/fonts/Lora-Italic.woff2
  # Share Tech Mono 400
  curl -L "https://fonts.gstatic.com/s/sharetechmono/v15/J7aHnp1uDWRBEqV98dVQztYldFcLowEF.woff2" -o public/fonts/ShareTechMono-Regular.woff2

If any curl fails (wrong URL), that font will fall back to Google CDN in the CSS — that's acceptable.
After downloading, check which files exist with ls public/fonts/ and adjust font-face src accordingly.

STEP 6 — Create src/styles/global.css:
/* Font-face declarations */
@font-face { font-family: 'Space Grotesk'; font-weight: 400; font-style: normal; font-display: swap;
  src: url('/fonts/SpaceGrotesk-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-weight: 600; font-style: normal; font-display: swap;
  src: url('/fonts/SpaceGrotesk-SemiBold.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-weight: 700; font-style: normal; font-display: swap;
  src: url('/fonts/SpaceGrotesk-Bold.woff2') format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-weight: 400; font-style: normal; font-display: swap;
  src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-weight: 700; font-style: normal; font-display: swap;
  src: url('/fonts/JetBrainsMono-Bold.woff2') format('woff2'); }
@font-face { font-family: 'Lora'; font-weight: 400; font-style: normal; font-display: swap;
  src: url('/fonts/Lora-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Lora'; font-weight: 500; font-style: normal; font-display: swap;
  src: url('/fonts/Lora-Medium.woff2') format('woff2'); }
@font-face { font-family: 'Lora'; font-weight: 400; font-style: italic; font-display: swap;
  src: url('/fonts/Lora-Italic.woff2') format('woff2'); }
@font-face { font-family: 'Share Tech Mono'; font-weight: 400; font-style: normal; font-display: swap;
  src: url('/fonts/ShareTechMono-Regular.woff2') format('woff2'); }

/* CSS Variables */
:root {
  --pitch: #080808; --surface: #111114; --surface-alt: #161620;
  --violet: #7c3aed; --violet-dim: rgba(124,58,237,0.15); --violet-mid: rgba(124,58,237,0.4);
  --lime: #84cc16; --hot: #ff007a;
  --text: #f5f5f0; --muted: #9090a0; --border: #2a2a38;
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Lora', serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-term: 'Share Tech Mono', monospace;
  /* EXTREME */
  --green: #00ff41; --black: #000000; --void: #060a10;
  --green-dim: #00a829; --green-ghost: rgba(0,255,65,0.08); --green-glow: rgba(0,255,65,0.35);
}

*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { overflow-x: hidden; }
a { text-decoration: none; color: inherit; }
img { max-width: 100%; height: auto; }

STEP 7 — Create src/styles/wild.css — extract ALL styles from wild-reference.html's <style> block verbatim.
Key sections needed: .fam-nav, .fam-logo, .nav-links, .nav-link, .nav-cta, .fam-hero-layered (4 layers), hero animations, .ticker-strip, .stats-section, .pricing-section, .card-deck, .plan-card variants, .features-section, .upsell-section, .trust-bar, .fam-footer, responsive @media.
Add these additional classes NOT in the reference:
  .design-bridge { background: #1a0d3a; padding: 6rem 3rem; }
  .design-bridge .db-label { font-family:var(--font-mono); font-size:0.7rem; letter-spacing:0.15em; color:var(--hot); text-transform:uppercase; margin-bottom:1rem; }
  .design-bridge .db-headline { font-family:var(--font-display); font-size:clamp(1.8rem,3.5vw,3rem); font-weight:700; color:var(--text); max-width:560px; line-height:1.1; margin-bottom:1.5rem; }
  .design-bridge .db-body { font-family:var(--font-mono); font-size:0.8rem; color:rgba(245,245,240,0.55); max-width:440px; line-height:1.75; margin-bottom:2rem; }
  .btn-hot { font-family:var(--font-mono); font-size:0.8rem; letter-spacing:0.08em; text-transform:uppercase; background:var(--hot); color:var(--text); border:none; padding:0.9rem 2.2rem; cursor:pointer; display:inline-block; text-decoration:none; transition:background 0.2s; }
  .btn-hot:hover { background:#cc005e; }
  .fam-thoughts-strip { background:#0d0d14; border-top:1px solid var(--border); border-bottom:1px solid var(--border); padding:2rem 3rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; }
  .fts-label { font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.15em; text-transform:uppercase; color:var(--violet); margin-bottom:0.3rem; }
  .fts-headline { font-family:var(--font-display); font-size:1.1rem; font-weight:600; color:var(--text); }
  .fts-link { font-family:var(--font-mono); font-size:0.75rem; letter-spacing:0.06em; color:var(--lime); border:1px solid rgba(132,204,22,0.3); padding:0.5rem 1.2rem; transition:all 0.2s; }
  .fts-link:hover { background:rgba(132,204,22,0.1); }
  .mobile-menu-btn { display:none; background:none; border:1px solid var(--border); color:var(--text); width:40px; height:40px; cursor:pointer; font-size:1.2rem; align-items:center; justify-content:center; }
  .mobile-nav { display:none; flex-direction:column; gap:1rem; padding:1.5rem; background:rgba(8,8,8,0.98); border-bottom:1px solid var(--border); }
  .mobile-nav.open { display:flex; }
  @media (max-width:900px) {
    .nav-links { display:none; }
    .mobile-menu-btn { display:flex; }
    .design-bridge { padding:4rem 1.5rem; }
    .fam-thoughts-strip { padding:1.5rem; }
  }

STEP 8 — Create src/styles/extreme.css — extract all styles from extreme-reference.html's <style> block verbatim (the full block).
Add at the end:
  .ext-nav-link { color:var(--green-dim); transition:color 0.15s; }
  .ext-nav-link:hover { color:var(--green); }
  .ext-footer { background:var(--black); border-top:1px solid rgba(0,255,65,0.15); padding:2.5rem 2rem; }
  .ext-footer-copy { font-family:var(--font-term); font-size:0.72rem; color:rgba(0,255,65,0.3); }
  @media (max-width:768px) { body { transform:none; } }

STEP 9 — Create src/styles/components.css:
/* Shared component styles — billing toggle, product cards, FAQ accordion */
.billing-toggle-wrap { display:flex; align-items:center; justify-content:center; gap:1.5rem; margin-bottom:3rem; }
.billing-option { font-family:var(--font-mono); font-size:0.75rem; letter-spacing:0.08em; color:var(--muted); cursor:pointer; transition:color 0.2s; }
.billing-option.active { color:var(--text); }
.billing-switch { width:48px; height:26px; background:var(--surface-alt); border:1px solid var(--border); border-radius:13px; cursor:pointer; position:relative; transition:background 0.2s; }
.billing-switch.annual { background:var(--violet); border-color:var(--violet); }
.billing-switch::after { content:''; position:absolute; top:3px; left:3px; width:18px; height:18px; background:var(--text); border-radius:50%; transition:transform 0.2s; }
.billing-switch.annual::after { transform:translateX(22px); }
.billing-save-badge { font-family:var(--font-mono); font-size:0.65rem; background:rgba(132,204,22,0.12); color:var(--lime); padding:0.2rem 0.5rem; letter-spacing:0.06em; }
.faq-section { padding:5rem 3rem; }
.faq-item { border-bottom:1px solid var(--border); }
.faq-q { font-family:var(--font-display); font-size:1rem; font-weight:600; color:var(--text); padding:1.2rem 0; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
.faq-q::after { content:'+'; font-family:var(--font-mono); color:var(--violet); font-size:1.2rem; }
.faq-q.open::after { content:'−'; }
.faq-a { font-family:var(--font-body); font-size:0.95rem; color:var(--muted); line-height:1.7; padding-bottom:1.2rem; display:none; }
.faq-a.open { display:block; }
@media (max-width:900px) { .faq-section { padding:4rem 1.5rem; } }

STEP 10 — Create src/components/Nav.astro:
---
const links = [
  { label: 'WordPress', href: '/wordpress' },
  { label: 'Hosting', href: '/hosting' },
  { label: 'Builder', href: '/builder' },
  { label: 'Servers', href: '/servers' },
  { label: 'Domains', href: '/domains' },
  { label: 'Bundles', href: '/bundles' },
]
const currentPath = Astro.url.pathname
---
<nav class="fam-nav" role="navigation" aria-label="Main navigation">
  <a href="/" class="fam-logo" aria-label="FAMtastic Hosting home">
    <span class="fam-mark">FAM</span><span class="fam-host">tastic</span><span class="fam-tld"> Hosting</span>
  </a>
  <div class="nav-links">
    {links.map(l => (
      <a href={l.href} class={\`nav-link \${currentPath === l.href || currentPath === l.href + '/' ? 'active' : ''}\`}>{l.label}</a>
    ))}
    <a href="mailto:hello@famtastichosting.com" class="nav-cta">Talk to a Human</a>
  </div>
  <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Open navigation menu" aria-expanded="false">☰</button>
</nav>
<div class="mobile-nav" id="mobileNav" role="navigation" aria-label="Mobile navigation">
  {links.map(l => <a href={l.href} class="nav-link">{l.label}</a>)}
  <a href="mailto:hello@famtastichosting.com" class="nav-cta" style="display:inline-block;margin-top:0.5rem;">Talk to a Human</a>
</div>
<script>
  const btn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('mobileNav');
  btn?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? '✕' : '☰';
  });
</script>

STEP 11 — Create src/components/Footer.astro:
<footer class="fam-footer">
  <div class="footer-left">
    <div class="footer-logo">
      <span class="fl-fam">FAM</span><span class="fl-host">tastic</span><span class="fl-tld"> Hosting</span>
    </div>
    <div class="footer-sub">
      Premium hosting. Custom nameservers. Your brand on everything.<br/>
      Based in Miami, FL · 24/7 Support: (480) 624-2500
    </div>
  </div>
  <div class="footer-links">
    <a href="/wordpress" class="footer-link">WordPress</a>
    <a href="/hosting" class="footer-link">Hosting</a>
    <a href="/builder" class="footer-link">Builder</a>
    <a href="/servers" class="footer-link">Servers</a>
    <a href="/domains" class="footer-link">Domains</a>
    <a href="/bundles" class="footer-link">Bundles</a>
    <a href="https://famtasticdesigns.com" class="footer-link">Designs</a>
    <a href="https://famtasticthoughts.com" class="footer-link">Thoughts</a>
    <a href="mailto:hello@famtastichosting.com" class="footer-link">Contact</a>
  </div>
  <div class="footer-right">
    <div class="footer-version">© 2026 FAMtastic. All rights reserved.</div>
    <div class="footer-version" style="margin-top:0.4rem;font-size:0.55rem;opacity:0.5;">Domain registration services fulfilled through WildWestDomains.com, an ICANN-accredited registrar.</div>
    <div class="footer-version" style="margin-top:0.2rem;font-size:0.55rem;opacity:0.5;">24/7 Support: (480) 624-2500</div>
  </div>
</footer>

STEP 12 — Create src/components/DesignBridge.astro:
---
interface Props { variant?: string }
const { variant = 'default' } = Astro.props
const copy: Record<string,{headline:string,body:string}> = {
  default: { headline: "A lot of our clients came to us for hosting and left with a site they're proud of.", body: "FAMtasticDesigns.com builds the visual identity to fill the space your hosting just opened. Custom sites, brand systems, and launch-ready design — from the same team." },
  wordpress: { headline: "WordPress runs your content. What runs your brand?", body: "Your WP site is live. Now make it look like nothing else on the internet. Custom design starting at $300." },
  builder: { headline: "You came here to build a site. What if someone could build it for you — and make it look like nothing else on the internet?", body: "Custom site design starting at $300 for a logo package, $800 for a brand refresh, $1,500+ for a full site." },
  servers: { headline: "Running serious infrastructure? Your site deserves serious design.", body: "You've invested in dedicated resources. Invest in a visual identity that matches. Custom design from the same team." },
  domains: { headline: "You claimed your name. Now claim your look.", body: "Domain registered. Brand identity is next. FAMtasticDesigns.com builds logos, identities, and full sites." },
  bundles: { headline: "The ultimate bundle: hosting + design.", body: "The Designs Complete bundle includes everything — hosting, email, and a custom-built site. One team, one package." },
}
const c = copy[variant] || copy.default
---
<section class="design-bridge" aria-label="FAMtastic Designs">
  <div class="db-label">// next move</div>
  <h2 class="db-headline">{c.headline}</h2>
  <p class="db-body">{c.body}</p>
  <a href="https://famtasticdesigns.com" class="btn-hot">Visit FAMtasticDesigns.com</a>
</section>

STEP 13 — Create src/components/PricingCard.astro:
---
interface Props {
  name: string; price: string; period?: string;
  annualPrice?: string; annualPeriod?: string;
  badge?: string; tagline?: string; features: string[];
  ctaText: string; ctaHref?: string;
  featured?: boolean; position?: 'left'|'center'|'right';
}
const { name, price, period='/mo', annualPrice, annualPeriod, badge, tagline, features, ctaText, ctaHref='mailto:hello@famtastichosting.com', featured=false, position='center' } = Astro.props
const posClass = position === 'left' ? 'plan-card--left' : position === 'right' ? 'plan-card--right' : 'plan-card--center'
---
<div class:list={['plan-card', posClass, featured && 'plan-card--featured']} data-monthly-price={price} data-annual-price={annualPrice || price} data-monthly-period={period} data-annual-period={annualPeriod || period}>
  {badge && <div class="plan-badge">{badge}</div>}
  <div class="plan-name">{name}</div>
  <div class="plan-price"><span class="price-val">{price}</span><span class="per-mo">{period}</span></div>
  {annualPrice && <div class="plan-price-annual" style="display:none"><span class="price-val">{annualPrice}</span><span class="per-mo">{annualPeriod || '/mo billed annually'}</span></div>}
  {tagline && <div class="plan-tagline">{tagline}</div>}
  <ul class="plan-features">
    {features.map(f => <li><span class="feat-dot"></span>{f}</li>)}
  </ul>
  <a href={ctaHref} class="plan-cta">{ctaText}</a>
</div>

STEP 14 — Create src/components/BillingToggle.astro:
<div class="billing-toggle-wrap" id="billingToggle">
  <span class="billing-option active" data-billing="monthly">Monthly</span>
  <div class="billing-switch" id="billingSwitch" role="switch" aria-checked="false" tabindex="0"></div>
  <span class="billing-option" data-billing="annual">Annual</span>
  <span class="billing-save-badge">Save 20%</span>
</div>
<script>
  const sw = document.getElementById('billingSwitch');
  const opts = document.querySelectorAll('.billing-option');
  let annual = false;
  function update() {
    sw?.classList.toggle('annual', annual);
    sw?.setAttribute('aria-checked', annual ? 'true' : 'false');
    opts.forEach(o => o.classList.toggle('active', (o as HTMLElement).dataset.billing === (annual ? 'annual' : 'monthly')));
    document.querySelectorAll('.plan-card').forEach(card => {
      const c = card as HTMLElement;
      const mp = c.dataset.monthlyPrice, ap = c.dataset.annualPrice;
      const mpr = c.dataset.monthlyPeriod, apr = c.dataset.annualPeriod;
      const pv = card.querySelector('.price-val') as HTMLElement;
      const pp = card.querySelector('.per-mo') as HTMLElement;
      if (pv && mp && ap) pv.textContent = annual ? ap : mp;
      if (pp && mpr && apr) pp.textContent = annual ? apr : mpr;
    });
  }
  sw?.addEventListener('click', () => { annual = !annual; update(); });
  sw?.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); annual = !annual; update(); } });
</script>

STEP 15 — Create src/components/FAMThoughts.astro:
---
interface Props { headline?: string; cta?: string; href?: string; }
const { headline = 'Running a site? Learn how to grow it.', cta = 'Visit FAMtastic Thoughts', href = 'https://famtasticthoughts.com' } = Astro.props
---
<div class="fam-thoughts-strip">
  <div>
    <div class="fts-label">// famtastic thoughts</div>
    <div class="fts-headline">{headline}</div>
  </div>
  <a href={href} class="fts-link">{cta} →</a>
</div>

STEP 16 — Create src/layouts/WildLayout.astro:
---
import Nav from '../components/Nav.astro'
import Footer from '../components/Footer.astro'
import '../styles/global.css'
import '../styles/wild.css'
import '../styles/components.css'
interface Props { title: string; description: string; canonicalPath?: string }
const { title, description, canonicalPath = '' } = Astro.props
const canonical = \`https://famtastichosting.com\${canonicalPath}\`
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:type" content="website" />
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "FAMtastic Hosting",
    "url": "https://famtastichosting.com",
    "telephone": "+14806242500"
  })} />
</head>
<body style="background:var(--pitch);color:var(--text);font-family:var(--font-body);">
  <Nav />
  <main>
    <slot />
  </main>
  <Footer />
  <script src="/scripts/nav.js" is:inline></script>
  <script src="/scripts/animations.js" is:inline></script>
</body>
</html>

STEP 17 — Create src/layouts/ExtremeLayout.astro:
---
import Footer from '../components/Footer.astro'
import '../styles/global.css'
import '../styles/extreme.css'
import '../styles/components.css'
interface Props { title: string; description: string }
const { title, description } = Astro.props
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href="https://famtastichosting.com/servers" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
</head>
<body>
  <div class="crt-scanlines" aria-hidden="true"></div>
  <div class="blend-overlay" aria-hidden="true"></div>
  <!-- Inline nav for EXTREME theme -->
  <nav class="nav-bar" role="navigation" aria-label="Main navigation">
    <div class="nav-logo" data-text="FAMtastic_Hosting">
      <a href="/" style="color:var(--green)">FAMtastic</a><span style="opacity:0.5;color:var(--green)">_Hosting</span>
    </div>
    <ul class="nav-links">
      <li><a href="/wordpress" class="ext-nav-link">./wordpress</a></li>
      <li><a href="/hosting" class="ext-nav-link">./hosting</a></li>
      <li><a href="/builder" class="ext-nav-link">./builder</a></li>
      <li><a href="/servers" class="ext-nav-link">./servers</a></li>
      <li><a href="/domains" class="ext-nav-link">./domains</a></li>
      <li><a href="/bundles" class="ext-nav-link">./bundles</a></li>
    </ul>
    <a href="mailto:hello@famtastichosting.com" class="btn-primary"><span>Talk to a Human</span></a>
  </nav>
  <main>
    <slot />
  </main>
  <!-- Extreme footer adapted -->
  <footer class="ext-footer">
    <div class="ext-footer-copy">FAMtastic Hosting © 2026 — All systems operational. 24/7 Support: (480) 624-2500</div>
    <nav style="display:flex;gap:1.5rem;font-family:var(--font-term);font-size:0.72rem;">
      <a href="/" style="color:rgba(0,255,65,0.35)">./home</a>
      <a href="/wordpress" style="color:rgba(0,255,65,0.35)">./wordpress</a>
      <a href="/hosting" style="color:rgba(0,255,65,0.35)">./hosting</a>
      <a href="/bundles" style="color:rgba(0,255,65,0.35)">./bundles</a>
      <a href="https://famtasticdesigns.com" style="color:rgba(0,255,65,0.35)">./designs</a>
    </nav>
    <div style="font-family:var(--font-term);font-size:0.55rem;color:rgba(0,255,65,0.2);margin-top:0.5rem;">Domain registration fulfilled through WildWestDomains.com, an ICANN-accredited registrar.</div>
  </footer>
  <script>
    // Matrix rain
    (function() {
      const container = document.getElementById('matrixRain');
      if (!container) return;
      const chars = '01アイウエオカキクケコ▓▒░█▄▀FAMtastic'.split('');
      const columns = Math.floor(window.innerWidth / 20);
      for (let i = 0; i < columns; i++) {
        const col = document.createElement('div');
        col.className = 'matrix-col';
        let txt = '';
        for (let j = 0; j < 10 + Math.floor(Math.random() * 20); j++) txt += chars[Math.floor(Math.random() * chars.length)] + '\\n';
        col.textContent = txt;
        col.style.left = (i * 20) + 'px';
        col.style.animationDuration = (6 + Math.random() * 14) + 's';
        col.style.animationDelay = (Math.random() * -20) + 's';
        col.style.opacity = (0.04 + Math.random() * 0.1).toString();
        container.appendChild(col);
      }
    })();
  </script>
</body>
</html>

STEP 18 — Create src/data/products.json with all pricing from spec (see pricing table below).
Create src/data/bundles.json with bundle definitions.

STEP 19 — Create public/scripts/nav.js:
// Smooth scroll, card hover effects, stat row animations
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
const cards = document.querySelectorAll('.plan-card');
cards.forEach(card => {
  card.addEventListener('mouseenter', () => cards.forEach(c => { if (c !== card) c.style.opacity = '0.6'; }));
  card.addEventListener('mouseleave', () => cards.forEach(c => c.style.opacity = '1'));
});

Create public/scripts/animations.js:
// FAQ accordion + intersection observer for stat rows
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    q.classList.toggle('open');
    const a = q.nextElementSibling;
    if (a) a.classList.toggle('open');
  });
});
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity='1'; e.target.style.transform='translateX(0)'; obs.unobserve(e.target); } });
}, { threshold: 0.2 });
document.querySelectorAll('.stat-row').forEach((row, i) => {
  row.style.opacity = '0';
  row.style.transform = 'translateX(-30px)';
  row.style.transition = \`opacity 0.6s ease \${i * 0.12}s, transform 0.6s ease \${i * 0.12}s\`;
  obs.observe(row);
});

STEP 20 — Run: cd ${ROOT} && npm install

After completing all file writes and npm install, output a JSON summary:
{ "status": "scaffold_complete", "files_created": ["list all files created"], "npm_installed": true/false }

PRICING DATA TO USE FOR products.json and bundles.json:
${PRICING}

IMPORTANT RULES:
- NO AI references, NO "Claude", NO "Co-Authored-By" in any file
- NO CDN script tags in production HTML (fonts are self-hosted, no Tailwind CDN)
- NO logo images — text wordmark only
- NO placeholder copy — every field must have real content
`

const scaffoldResult = await agent(SCAFFOLD_PROMPT, { label: 'scaffold', model: 'sonnet' })
log(`Scaffold result: ${typeof scaffoldResult === 'string' ? scaffoldResult.slice(0, 200) : JSON.stringify(scaffoldResult).slice(0, 200)}`)

// ─── PHASE 2: PAGES ──────────────────────────────────────────────────────────

phase('Pages')

const PAGE_SHARED = `
Working directory: ${ROOT}
${COMPONENT_API}
${BRAND_VOICE}
${PRICING}

RULES FOR ALL PAGES:
- Write the complete file to the path specified using the Write tool
- Use ONLY the component interfaces listed above
- NO CDN script/link tags
- NO placeholder text — all copy must be real, final
- NO logo image files
- Mobile responsive (test at 320px, 768px, 1024px)
- Every page footer has GoDaddy support (480) 624-2500 (handled by Footer component)
- Use inline SVG icons, not image files
- After writing, confirm the file path
`

// Run all 7 pages in parallel
const pageResults = await parallel([

  // ─── INDEX ──────────────────────────────────────────────────────────────────
  () => agent(`${PAGE_SHARED}

TASK: Write src/pages/index.astro — FAMtasticHosting.com homepage.

LAYOUT: WildLayout, title="FAMtastic Hosting — Your site. Hosted right.", description="Premium hosting with custom nameservers, starting at $5.99/mo. WordPress, cPanel, dedicated servers, domains, email, and website builder."

SECTIONS (in this order):

1. HERO — Use .fam-hero-layered structure with all 4 layers:
   - layer--bg: pitch black
   - layer--fx: perspective grid SVG (copy from wild-reference.html exactly) + two floating orbs (.hero-orb--a and .hero-orb--b)
   - layer--character: aria-hidden "99.9%" in giant violet translucent font
   - layer--content:
     * .hero-prompt: "> your brand is live" + blinking cursor
     * h1.hero-headline: "Your site. Hosted right.<br/>No one needs to know<br/><span class='hl-invisible'>who's behind the curtain.</span>"
     * p.hero-sub (mono): "Premium hosting with custom nameservers, starting at $5.99/mo."
     * .hero-actions: btn-primary href="#plans" "See Plans" + btn-outline href="mailto:hello@famtastichosting.com" "Talk to a Human"

2. TICKER STRIP — .ticker-strip > .ticker-inner (duplicate items for loop):
   Items: "99.9% Uptime" | "1,000+ Sites Hosted" | "Based in Miami, FL" | "Custom Nameservers" | "Same-Day Setup" | "24/7 Human Support" | "Free SSL Included" | "No Lock-In"

3. TRUST BAR — .trust-bar with 3 items only:
   - "99.9%" / "Uptime"
   - "1,000+" / "Sites Hosted"
   - "Miami, FL" / "Based Here"

4. PRODUCT PREVIEW GRID — id="plans", 5 cards in a CSS grid (2-col on mobile, wrap to 3-2 on desktop):
   Each card: .product-card (create CSS for it — dark surface, border, hover lift):
   - WordPress Hosting → /wordpress — tagline "Managed. Optimized. Yours." — desc "1-click install, daily backups, custom nameservers."
   - Web Hosting → /hosting — tagline "cPanel. Full control. Your brand." — desc "50GB SSD, cPanel, custom nameservers."
   - Website Builder → /builder — tagline "Build it yourself. Or let us." — desc "Drag and drop + FAMtastic Designs tie-in."
   - Servers & Infrastructure → /servers — tagline "Dedicated resources. Zero sharing." — desc "NVMe SSD, dedicated CPU and RAM."
   - Domains & Email → /domains — tagline "Your name. Your inbox. Secured." — desc "Domains from $20/yr. Email from $3/mo."
   Each card: inline SVG icon (simple geometric, violet stroke), title, tagline, desc, link arrow "→"

5. BUNDLE HIGHLIGHT — .upsell-section (lime bg, skewed -4deg):
   .upsell-inner: headline "Small Biz Starter — $299/yr" with body "Domain + 3 professional email addresses + SSL certificate. Everything you need to exist online. One purchase." + btn-dark href="/bundles" "See All Bundles"

6. HOW IT WORKS — 3 numbered steps, prose style (NOT icon grid):
   Section bg var(--surface), padding 6rem 3rem, max-width 700px
   Label "// how it works"
   Steps as large numbered list:
   01. "Pick your plan." — Choose the hosting that fits where you are today.
   02. "We set you up." — Custom nameservers, white-label support, same-day provisioning. GoDaddy's infrastructure, your brand on everything.
   03. "You build." — Use our Website Builder, bring your own site, or let FAMtastic Designs build something custom.

7. DESIGN BRIDGE: <DesignBridge variant="default" />

8. FOUNDER VOICE — .founder-section (bg var(--pitch), padding 6rem 3rem):
   Label "// from the founder"
   Headline "Why I built this."
   Three short paragraphs (first person, no job title, no founding date):
   P1: "I started FAMtastic Hosting because I was tired of watching small businesses get stuck with GoDaddy's brand on their nameservers and Bluehost banners in their cPanel. Your hosting provider shouldn't be your business card."
   P2: "Here's what the other guys do: ✕ They slap their name on your nameservers. ✕ They make you call a 1-800 number that sends you to a hold queue. ✕ They upsell you on things you don't need. Here's what we do: ✓ Custom nameservers with your brand. ✓ 24/7 white-label support through GoDaddy's infrastructure. ✓ Real pricing, no bait-and-switch."
   P3: "If you need a site built while you're at it — we do that too. FAMtastic Designs is the other half of what we offer."
   (Use inline HTML for ✕ and ✓ with color styling)

9. FAMthoughts strip: <FAMThoughts headline="Running a site? Learn how to grow it." />

Then Footer is auto-included by WildLayout.

ADD this CSS in a <style> block in the .astro file:
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.5rem; padding: 5rem 3rem; max-width: 1400px; margin: 0 auto; }
.product-card { background: var(--surface); border: 1px solid var(--border); padding: 2rem; transition: border-color 0.2s, transform 0.3s; cursor: pointer; }
.product-card:hover { border-color: var(--violet); transform: translateY(-4px); }
.product-card-icon { width: 36px; height: 36px; margin-bottom: 1.2rem; }
.product-card-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 0.4rem; }
.product-card-tagline { font-family: var(--font-mono); font-size: 0.72rem; color: var(--lime); letter-spacing: 0.06em; margin-bottom: 0.75rem; }
.product-card-desc { font-family: var(--font-body); font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin-bottom: 1.2rem; }
.product-card-link { font-family: var(--font-mono); font-size: 0.72rem; color: var(--violet); letter-spacing: 0.06em; }
.how-it-works { background: var(--surface); padding: 6rem 3rem; }
.how-step { display: flex; gap: 2rem; align-items: baseline; padding: 2.5rem 0; border-bottom: 1px solid var(--border); max-width: 700px; }
.how-step:first-of-type { border-top: 1px solid var(--border); }
.how-num { font-family: var(--font-mono); font-size: 3rem; font-weight: 700; color: var(--violet); opacity: 0.3; min-width: 80px; line-height: 1; }
.how-text { }
.how-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--text); margin-bottom: 0.4rem; }
.how-desc { font-family: var(--font-body); font-size: 0.95rem; color: var(--muted); line-height: 1.7; }
.founder-section { padding: 6rem 3rem; max-width: 700px; }
.founder-p { font-family: var(--font-body); font-size: 1.05rem; color: rgba(245,245,240,0.7); line-height: 1.8; margin-bottom: 1.5rem; }
.founder-x { color: #ff4444; }
.founder-check { color: var(--lime); }
@media (max-width: 900px) {
  .product-grid { padding: 3rem 1.5rem; grid-template-columns: 1fr 1fr; }
  .how-it-works { padding: 4rem 1.5rem; }
  .founder-section { padding: 4rem 1.5rem; }
}
@media (max-width: 600px) { .product-grid { grid-template-columns: 1fr; } }
`, { label: 'page:index', model: 'sonnet' }),

  // ─── WORDPRESS ──────────────────────────────────────────────────────────────
  () => agent(`${PAGE_SHARED}

TASK: Write src/pages/wordpress.astro — Managed WordPress Hosting page.

LAYOUT: WildLayout, title="Managed WordPress Hosting — FAMtastic Hosting", description="WordPress hosting that doesn't make you think about hosting. Starting at $12/mo with custom nameservers, daily backups, and 24/7 white-label support."

SECTIONS:

1. HERO — .fam-hero-layered:
   - layer--bg + layer--fx (perspective grid SVG) + layer--character "WP" (giant translucent violet)
   - layer--content:
     * .hero-prompt "> wordpress.initialize" + blinking cursor
     * h1: "WordPress hosting that doesn't make you<br/><span class='hl-invisible'>think about hosting.</span>"
     * p.hero-sub: "Managed, optimized, and branded as yours — starting at $12/mo."
     * .hero-actions: btn-primary href="#plans" "See WordPress Plans" + btn-outline href="mailto:hello@famtastichosting.com" "Talk to a Human"

2. TICKER — same structure as homepage, items: "WordPress Optimized" | "Daily Backups" | "Custom Nameservers" | "1-Click Install" | "Free SSL" | "Malware Scanning" | "Staging Environment" | "24/7 Support"

3. PRICING — id="plans", .pricing-section:
   Label "// plans", Headline "Pick your WordPress altitude."
   BillingToggle
   .card-deck with 3 PricingCards:
   - PricingCard position="left" name="Basic" price="$12" period="/mo" annualPrice="$9.60" annualPeriod="/mo billed annually" tagline="// for getting your WP site live" features=["1 WordPress site","30GB SSD storage","1-click WordPress install","Daily automated backups","Custom nameservers","Free SSL certificate","24/7 white-label support"] ctaText="Start Basic" ctaHref="mailto:hello@famtastichosting.com"
   - PricingCard position="center" name="Ultimate" price="$24" period="/mo" annualPrice="$19.20" annualPeriod="/mo billed annually" badge="Most Popular" tagline="// for growing brands with serious sites" features=["Unlimited WordPress sites","75GB SSD storage","Premium WP staging environment","Malware scan & removal","Custom nameservers","Free SSL certificate","Priority white-label support","WP-CLI access"] ctaText="Go Ultimate" ctaHref="mailto:hello@famtastichosting.com" featured=true
   - PricingCard position="right" name="WP Launch Bundle" price="$35" period="/mo" tagline="// everything included, one price" features=["Managed WP Basic plan","Professional email address","Free SSL certificate","Domain registration (year 1)","Save 15% vs buying separate","Custom nameservers","24/7 white-label support"] ctaText="Get the Bundle" ctaHref="/bundles"

4. WHY MANAGED WP — outcome-focused prose, NOT a feature grid:
   .features-section > .features-layout (2-col):
   Left col: 4 .feature-item blocks, each with inline SVG icon + title + desc:
   - "Auto-updates handled for you" — WordPress core, plugins, and themes stay current. You never wake up to a site broken by an update you missed.
   - "Security that runs in the background" — Malware scanning and removal, SSL on every domain, and a firewall that catches threats before they reach your site.
   - "Staging so you can test before you break things" — Make changes on a clone of your site. Push live only when everything looks right.
   - "Nameservers that say your name" — ns1.famtastichosting.com. ns2.famtastichosting.com. GoDaddy is the infrastructure. You're the brand.
   Right col: spec blocks (using .spec-block / .spec-key / .spec-value / .spec-desc):
   - // uptime / 99.9% / — contractual, every plan
   - // setup / Today / — same-day provisioning
   - // backups / Daily / — 30-day retention, one-click restore
   - // support / 24/7 / — (480) 624-2500, white-labeled

5. FAQ — .faq-section:
   Label "// common questions", Headline "Real answers."
   5 questions with real answers:
   Q: "What's the difference between managed WordPress and regular hosting?" A: "Regular hosting gives you a server and a control panel. Managed WordPress is configured specifically for WordPress — faster load times, automatic updates, daily backups, and a security layer that regular shared hosting doesn't have. You pay a little more and think about hosting a lot less."
   Q: "Can I use my own domain?" A: "Yes. We configure the nameservers to ns1.famtastichosting.com and ns2.famtastichosting.com. Your domain, your brand, our infrastructure."
   Q: "Do I need to know how to use WordPress?" A: "A basic familiarity helps but we set everything up. 1-click install means your WordPress site is ready to log into on day one. If you want someone to build the site for you, check out FAMtastic Designs."
   Q: "What happens if my site gets hacked?" A: "The Ultimate plan includes malware scan and removal. We clean it, figure out how it got in, and close the gap. On Basic, we can help you through the remediation — it's not automatic, but we don't abandon you."
   Q: "Can I migrate my existing WordPress site?" A: "Yes. We handle the migration same-day. Send us your current host credentials and we take it from there."

6. DESIGN BRIDGE: <DesignBridge variant="wordpress" />
7. FAMthoughts: <FAMThoughts headline="Choosing between WordPress and cPanel hosting? We break it down." href="https://famtasticthoughts.com" />

Add CSS in <style> for any page-specific styles needed. Reuse .fam-hero-layered, .pricing-section, .features-section, .faq-section from wild.css.
`, { label: 'page:wordpress', model: 'sonnet' }),

  // ─── HOSTING ────────────────────────────────────────────────────────────────
  () => agent(`${PAGE_SHARED}

TASK: Write src/pages/hosting.astro — cPanel Web Hosting page.

LAYOUT: WildLayout, title="cPanel Web Hosting — FAMtastic Hosting", description="cPanel hosting that doesn't scream reseller. Full control, custom nameservers, starting at $7/mo."

SECTIONS:

1. HERO:
   layer--character: "cP" (giant translucent)
   hero-prompt: "> cpanel.initialize"
   h1: "cPanel hosting that doesn't<br/><span class='hl-invisible'>scream reseller.</span>"
   hero-sub: "Full control. Custom nameservers. Your brand on everything — starting at $7/mo."
   CTAs: "See Plans" href="#plans", "Talk to a Human" href="mailto:hello@famtastichosting.com"

2. TICKER: "cPanel Full Control" | "50GB SSD" | "1-Click Installs" | "Custom Nameservers" | "Free SSL" | "White-Label Support" | "Unlimited Bandwidth" | "Same-Day Setup"

3. PRICING — BillingToggle + .card-deck:
   - PricingCard position="left" name="Starter" price="$7" period="/mo" annualPrice="$5.60" annualPeriod="/mo billed annually" tagline="// one site, full control" features=["1 website","50GB SSD storage","cPanel control panel","1-click app installs","Custom nameservers","Free SSL certificate","White-label 24/7 support"] ctaText="Start Starter" ctaHref="mailto:hello@famtastichosting.com"
   - PricingCard position="center" name="Ultimate" price="$31" period="/mo" annualPrice="$24.80" annualPeriod="/mo billed annually" badge="Best Value" tagline="// unlimited sites, serious power" features=["Unlimited websites","Unlimited SSD storage","cPanel + Softaculous","1-click installs for 400+ apps","Custom nameservers","Free SSL + malware scan","Priority white-label support"] ctaText="Go Ultimate" ctaHref="mailto:hello@famtastichosting.com" featured=true

4. WHAT YOU GET — outcomes, not specs. .features-section 2-col:
   Left col 4 features:
   - "Your brand on everything" — Custom nameservers, white-label support, no GoDaddy branding anywhere your clients can see.
   - "Sites that load fast" — SSD storage, optimized server configs, and a CDN layer that puts your files closer to your visitors.
   - "cPanel, the way it should work" — Full file manager, email manager, database manager. Softaculous for 1-click app installs. No stripped-down version.
   - "SSL on every domain" — Free DV SSL, auto-renewed. Every site on your account gets one.
   Right col specs: // uptime / 99.9% / — contractual | // storage / 50GB+ / — SSD, starter plan | // support / 24/7 / — (480) 624-2500 | // setup / Today / — same-day provisioning

5. CPANEL VS WORDPRESS — prose section (.cpanel-vs-wp, bg var(--surface), padding 5rem 3rem):
   Headline "cPanel or managed WordPress?"
   Two col comparison layout (2 cards side by side):
   Card A "Choose cPanel if..." — You host multiple sites. You want full file system access. You're running something other than WordPress. You need database access directly. You want the cheapest per-site cost.
   Card B "Choose Managed WP if..." — WordPress is your entire stack. You want updates handled for you. You need staging. You want WP-CLI and WP-specific security scanning. Site speed optimization built in.
   Bottom: "Not sure? Start with cPanel. The Starter plan is $7/mo and you can always upgrade."

6. DESIGN BRIDGE: <DesignBridge variant="default" />
7. FAMthoughts: <FAMThoughts headline="What SSL actually does for your site — and why you need it." />

Add CSS for .cpanel-vs-wp section and comparison cards.
`, { label: 'page:hosting', model: 'sonnet' }),

  // ─── BUILDER ────────────────────────────────────────────────────────────────
  () => agent(`${PAGE_SHARED}

TASK: Write src/pages/builder.astro — Website Builder page (DUAL PURPOSE: sells builder + FAMtastic Designs tie-in).

LAYOUT: WildLayout, title="Website Builder — FAMtastic Hosting", description="Build it yourself starting at $12/mo. Or let FAMtastic Designs build it for you starting at $300. You pick your path."

SECTIONS:

1. HERO:
   layer--character: "BD" (giant translucent)
   hero-prompt: "> builder.initialize"
   h1: "Build it yourself.<br/>Or let us<br/><span class='hl-invisible'>build it for you.</span>"
   hero-sub: "Website Builder starts at $12/mo. Custom design starts at $300. You pick your path."
   CTAs: "See Builder Plans" href="#plans", "Talk to a Designer" href="https://famtasticdesigns.com"

2. TICKER: "Drag and Drop Builder" | "Mobile Optimized" | "Free Domain Included" | "SSL Included" | "Built-In SEO" | "Social Integration" | "eCommerce Ready" | "24/7 Support"

3. PRICING — BillingToggle + .card-deck:
   - PricingCard position="left" name="Essential" price="$12" period="/mo" annualPrice="$9.60" annualPeriod="/mo billed annually" tagline="// drag, drop, launch" features=["1 website","Free domain (year 1)","Mobile-optimized templates","SSL included","Basic marketing suite","Social media integration","24/7 white-label support"] ctaText="Start Building" ctaHref="mailto:hello@famtastichosting.com"
   - PricingCard position="center" name="Commerce" price="$30" period="/mo" annualPrice="$24" annualPeriod="/mo billed annually" badge="Best for stores" tagline="// sell online, ship, grow" features=["Online store","Unlimited product listings","Payment processing","Shipping label printing","Marketing suite","Abandoned cart recovery","SSL included","Priority support"] ctaText="Start Selling" ctaHref="mailto:hello@famtastichosting.com" featured=true

4. BUILDER FEATURES — .features-section 2-col:
   Left col 4 features with SVG icons:
   - "Templates that don't all look the same" — Start from one of hundreds of mobile-optimized templates. Customize every pixel without touching code.
   - "SEO baked in from day one" — Title tags, meta descriptions, sitemap generation. Your site gets found without a plugin.
   - "Social in, social out" — Connect your Instagram, Facebook, or X. Pull in your feed. Share new posts automatically.
   - "Mobile-first by default" — Every template is responsive. The mobile preview is built into the editor. What you see is what loads on a phone.
   Right col specs: // templates / 100+ / — all mobile-optimized | // launch / Today / — same-day setup | // domain / Free / — first year included | // ssl / Free / — auto-renewed

5. THE CROSSROADS — .crossroads-section (key differentiator):
   Full-width section, bg var(--surface), padding 7rem 3rem
   Top label "// your path"
   Headline "Two ways to get online."
   Two-col layout:
   Left card (bg var(--pitch), border var(--border)):
     Eyebrow "Build it yourself"
     Features: Pick a template. Drag. Drop. Launch. 10-20 hours of your time. $12/mo. You own every pixel.
     Bullet points: ✓ Full control of every page ✓ No designers, no waiting ✓ Launch this week ✓ Change anything, anytime
     CTA: btn-outline href="mailto:hello@famtastichosting.com" "Start Building — $12/mo"
   Right card (bg #1a0d3a, border var(--hot)):
     Eyebrow "Let us build it"
     Features: You tell us what you want. We design it. We build it. You approve it. It's yours.
     Pricing: Logo package from $300 · Brand refresh from $800 · Full site from $1,500+
     Bullet points: ✓ Custom design, nothing templated ✓ 2-3 week turnaround ✓ You own all files ✓ Hosted here when you're ready
     CTA: btn-hot href="https://famtasticdesigns.com" "Talk to a Designer"
   Bottom strip (full width, centered, muted mono font): "Not sure? Start with the builder. Upgrade to custom when you're ready. Both options are right."

6. FAMTASTIC DESIGNS SHOWCASE — .designs-showcase (bg var(--pitch), padding 6rem 3rem):
   Label "// famtastic designs"
   Headline "Custom sites. Real brand identity."
   Body: "FAMtastic Designs is the design half of the FAMtastic ecosystem. We build logos, brand systems, and full websites — custom, not templated. Starting at $300 for a logo package."
   Three horizontal items: "Logo Package — $300" | "Brand Refresh — $800" | "Full Site — $1,500+"
   CTA: btn-hot href="https://famtasticdesigns.com" "Visit FAMtastic Designs"

7. DESIGN BRIDGE (more prominent here): <DesignBridge variant="builder" />

8. FAQ:
   Q: "What's the difference between Website Builder and custom design?" A: "Website Builder is you picking a template and filling it in. Custom design is us building something original based on your brand, your content, and your goals. Builder is faster and cheaper. Custom design is more distinctive and more hands-off."
   Q: "Can I start with the builder and upgrade to custom later?" A: "Yes. Plenty of our clients start with the builder to get something live quickly, then come back to FAMtastic Designs when they're ready to invest in a full identity."
   Q: "Do I need hosting if I use the builder?" A: "Hosting is included in the Website Builder plan. Your site lives on FAMtastic Hosting's infrastructure."
   Q: "What if I already have a design and just need hosting?" A: "Use cPanel Hosting or Managed WordPress — both work with any site. The Website Builder plan is for building within the builder environment."

9. FAMthoughts: <FAMThoughts headline="Building vs designing: how to choose the right path for your site." />

Add CSS for .crossroads-section, .designs-showcase, crossroads cards.
`, { label: 'page:builder', model: 'sonnet' }),

  // ─── SERVERS ────────────────────────────────────────────────────────────────
  () => agent(`${PAGE_SHARED}

TASK: Write src/pages/servers.astro — Web Hosting Plus / Dedicated Resources page.
THIS IS THE ONLY PAGE USING ExtremeLayout. Dark terminal green aesthetic.

LAYOUT: ExtremeLayout, title="Web Hosting Plus — Dedicated Resources | FAMtastic Hosting", description="Dedicated CPU and RAM. Zero shared resources. NVMe SSD. For sites that can't afford shared hosting anymore."

ALL HTML uses EXTREME design tokens (var(--green), var(--void), var(--green-dim), var(--font-term), var(--font-mono)).
No violet, no lime, no --pitch. This page lives in a different visual world.

SECTIONS:

1. HERO — .fam-hero-layered with extreme styling:
   - layer--bg: var(--black) radial gradient
   - layer--fx: div#matrixRain (matrix rain via JS in ExtremeLayout) + scanline pseudo-element
   - layer--character: "WHP" in giant translucent green (opacity 0.06, mix-blend-mode screen)
   - layer--content: .terminal-prompt-block with 4 .prompt-line.typing lines:
     Line 1: "> hostname: dedicated-server"
     Line 2: "> cpu: ALLOCATED"
     Line 3: "> resources: YOURS ONLY"
     Line 4 (cursor): "> status: READY_"
   - h1.hero-headline (Share Tech Mono, green glow): "> Dedicated resources.<br/>Zero sharing.<br/><span style='opacity:0.5'>Full uptime.</span>"
   - p.hero-subline: "For sites that have outgrown shared hosting. NVMe SSD. Dedicated CPU. Custom nameservers."
   - .hero-actions: btn-primary href="#plans" "Initialize Project" + btn-secondary href="mailto:hello@famtastichosting.com" "Talk to a Human"

2. STATUS TICKER (.status-ticker): "ALL SYSTEMS DEDICATED" | "NVMe SSD STORAGE" | "DEDICATED CPU+RAM" | "CUSTOM NAMESERVERS" | "FREE SSL INCLUDED" | "24/7 SUPPORT: (480) 624-2500" | "SAME-DAY PROVISIONING" | "NO SHARED RESOURCES"

3. PRICING — .section-pricing (use skewY like extreme-reference):
   Label "// system select", Headline "Choose your configuration."
   Two .term-window cards (terminal windows from extreme.css):

   Card 1 — LAUNCH ($37/mo):
   .term-titlebar with dots + "plan_launch.sh"
   .term-body:
   term-plan-name: "LAUNCH"
   term-price: "$37" term-price-sub: "/month"
   Annual note: "$29.60/mo billed annually"
   hr.term-divider
   term-features with [OK]/[WARN] indicators:
   [OK] 1 website
   [OK] 30GB NVMe SSD storage
   [OK] Dedicated CPU allocation
   [OK] Dedicated RAM allocation
   [OK] Custom nameservers
   [OK] Free SSL certificate
   [OK] 24/7 white-label support
   [WARN] Single site only
   term-selected-label + btn-secondary "Select Launch"

   Card 2 — EXPAND ($127/mo) [featured — .term-window.featured]:
   .term-titlebar with "plan_expand.sh — RECOMMENDED"
   .term-body:
   term-plan-name: "EXPAND"
   term-price: "$127" term-price-sub: "/month"
   Annual: "$101.60/mo billed annually"
   hr.term-divider
   [OK] Unlimited websites
   [OK] 120GB NVMe SSD storage
   [OK] Dedicated CPU + RAM (enhanced)
   [OK] Full cPanel root-like control
   [OK] Custom nameservers
   [OK] Free SSL + malware scan
   [OK] Priority white-label support
   [OK] Advanced WAF included
   term-selected-label active + btn-primary "Select Expand"

4. SERVER SPECS — .section-terminal-features:
   Label "// specifications", Headline "What dedicated actually means."
   .cli-table with header SPEC | VALUE | PLAN:
   Rows:
   ./storage --type | NVMe SSD (not SATA, not HDD) | ALL
   ./cpu --allocation | Dedicated (not shared pool) | ALL
   ./ram --allocation | Dedicated (not burstable) | ALL
   ./nameservers | ns1.famtastichosting.com | ALL
   ./ssl --provisioning | < 60 seconds | ALL
   ./uptime --sla | 99.9% contractual | ALL
   ./bandwidth | Unmetered | ALL
   ./backups --frequency | Daily automated | EXPAND
   ./cdn --priority | Yes | EXPAND

5. TERMINAL DEMO — .upsell-terminal style block:
   Title: "nameserver_config.sh"
   Terminal lines showing what the customer sees:
   "> dig NS yourdomain.com"
   "yourdomain.com. 3600 IN NS ns1.famtastichosting.com."
   "yourdomain.com. 3600 IN NS ns2.famtastichosting.com."
   "; <<>> DiG <<>> +short"
   "; GoDaddy infrastructure, your nameservers."
   "[OK] Brand: YOURS"
   "[OK] Infrastructure: FAMTASTIC HOSTING"

6. WHEN YOU'VE OUTGROWN SHARED — prose section (var(--void) bg, padding 6rem 2rem):
   Label "// migration guide"
   Headline "You've been here before."
   Body (3 paragraphs, Share Tech Mono for headers, body text in readable green-tinted white):
   P1: "You bought the $3/mo shared hosting plan. Your site loaded in 4 seconds. You blamed the theme. Then you blamed the plugins. Then you found out your server has 800 other sites on it."
   P2: "Dedicated resources don't share. Your CPU is your CPU. Your RAM is your RAM. When the site next door gets hit by traffic, yours doesn't slow down."
   P3: "Migration is same-day. We handle it. If you're running on shared hosting and your site has become your business — this is the move."

7. DESIGN BRIDGE — adapted for EXTREME aesthetic (inline, not the component — ExtremeLayout doesn't have wild.css):
   Dark terminal version: bg var(--void), border 1px solid rgba(0,255,65,0.2), padding 5rem 2rem:
   Terminal window with title "design_diagnostic.sh":
   Lines: "> Running brand diagnostic..." | "> Infrastructure: READY ✓" | "> Brand identity: UNRESOLVED ⚠" | "> RECOMMENDED: famtasticdesigns.com"
   CTA: btn-primary href="https://famtasticdesigns.com" "Run Command"

ADD CSS in <style>:
.server-hero-content { max-width: 800px; margin: 0 auto; }
.term-window-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; max-width: 900px; margin: 3rem auto 0; }
.when-outgrown { background: var(--void); padding: 6rem 2rem; }
.outgrown-inner { max-width: 700px; margin: 0 auto; }
.outgrown-p { font-family: var(--font-mono); font-size: 0.9rem; color: rgba(0,255,65,0.6); line-height: 1.8; margin-bottom: 1.5rem; }
@media (max-width: 768px) {
  .term-window-duo { grid-template-columns: 1fr; }
  .when-outgrown { padding: 4rem 1.5rem; }
}
`, { label: 'page:servers', model: 'sonnet' }),

  // ─── DOMAINS ────────────────────────────────────────────────────────────────
  () => agent(`${PAGE_SHARED}

TASK: Write src/pages/domains.astro — Domains, Email & SSL page.

LAYOUT: WildLayout, title="Domains, Email & SSL — FAMtastic Hosting", description="Your name. Your inbox. Your lock. Domains from $20/yr, professional email from $3/mo, SSL from $79/yr."

SECTIONS:

1. HERO (lighter tone than other pages — this is the "get your name" page):
   layer--character: ".com" (giant translucent lime)
   hero-prompt: "> domain.search"
   h1: "Your name.<br/>Your inbox.<br/><span class='hl-invisible'>Your lock.</span>"
   hero-sub: "Domains starting at $20/yr. Professional email from $3/mo. SSL to seal it."
   CTAs: "See Pricing" href="#pricing", "Talk to a Human" href="mailto:hello@famtastichosting.com"

2. TICKER: "Domains from $20/yr" | "Email from $3/mo" | "SSL from $79/yr" | "Auto-Renew Available" | "Custom Nameservers" | "ICANN Accredited" | "Same-Day Setup" | "24/7 Support"

3. PRICING SECTIONS — id="pricing":

   A. DOMAIN PRICING (.domain-pricing, bg var(--surface), padding 5rem 3rem):
   Label "// domain registry"
   Headline "Claim your namespace."
   4-col grid of TLD cards:
   - .com / $20/yr — The standard. If it's available, take it.
   - .net / $25/yr — The backup. Good for tech and infrastructure brands.
   - .org / $22/yr — For nonprofits, communities, and causes.
   - .co / $35/yr — The shorthand. Popular with startups and founders.
   Each card: bg var(--pitch), border var(--border), padding 2rem, TLD in large mono font (lime), price in Space Grotesk, short one-liner desc

   B. EMAIL PACKAGES (.email-pricing, padding 5rem 3rem):
   BillingToggle
   Label "// professional email"
   Headline "An inbox that means business."
   3 PricingCards:
   - PricingCard position="left" name="Professional" price="$3" period="/mo" annualPrice="$2.40" annualPeriod="/mo billed annually" tagline="// your name, your email" features=["Custom domain address (you@yourdomain.com)","10GB storage per mailbox","Works with any email client","Custom nameservers","Webmail access","spam and virus filtering"] ctaText="Get Pro Email" ctaHref="mailto:hello@famtastichosting.com"
   - PricingCard position="center" name="Group" price="$4" period="/mo" annualPrice="$3.20" annualPeriod="/mo billed annually" badge="For Teams" tagline="// for teams that need shared inboxes" features=["Team email inboxes","Shared calendars","Shared contacts","Custom domain addresses","10GB per mailbox","Admin controls"] ctaText="Get Group Email" ctaHref="mailto:hello@famtastichosting.com" featured=true
   - PricingCard position="right" name="Microsoft 365" price="$9" period="/mo" tagline="// the full suite" features=["Word, Excel, PowerPoint","Teams, SharePoint, OneDrive","Custom domain email","1TB cloud storage per user","Advanced security","Desktop + mobile apps"] ctaText="Get Microsoft 365" ctaHref="mailto:hello@famtastichosting.com"

   C. SSL CERTIFICATE (.ssl-pricing, bg var(--surface), padding 5rem 3rem):
   Label "// security layer"
   Headline "The lock in the address bar."
   Single SSL card (not a deck, full-width up to 500px):
   Name: Standard SSL, Price: $79/yr, Features: ["Single domain DV certificate","Auto-renewal (never lapses)","Browser trust indicator","Encrypts all data in transit","Compatible with all major browsers","Same-day provisioning"], CTA: "Get SSL" href="mailto:hello@famtastichosting.com"
   Side prose: "SSL is not optional. Google ranks HTTPS pages higher. Browsers warn visitors about HTTP sites. Every site on FAMtastic Hosting gets a free DV SSL. The standard certificate ($79/yr) adds the purchased trust seal for businesses where that signal matters."

4. BUNDLE UPSELL — .upsell-section (lime, skewed):
   headline "Small Biz Starter — $299/yr"
   body "Domain registration + 3 professional email addresses + SSL certificate. Everything you need to exist online. One purchase, one year."
   btn-dark href="/bundles" "See All Bundles"

5. DESIGN BRIDGE: <DesignBridge variant="domains" />
6. FAMthoughts: <FAMThoughts headline="How to pick a domain name that works as hard as you do." />

Add CSS for .domain-pricing, .tld-grid, .tld-card, .email-pricing, .ssl-pricing, .ssl-single-card.
`, { label: 'page:domains', model: 'sonnet' }),

  // ─── BUNDLES ────────────────────────────────────────────────────────────────
  () => agent(`${PAGE_SHARED}

TASK: Write src/pages/bundles.astro — Pre-Built Bundles page.

LAYOUT: WildLayout, title="Hosting Bundles — FAMtastic Hosting", description="Everything you need. One purchase. Pre-built packages for starting, launching, and growing."

SECTIONS:

1. HERO:
   layer--character: "∞" (giant translucent)
   hero-prompt: "> bundles.configure"
   h1: "Everything you need.<br/><span class='hl-invisible'>One purchase.</span>"
   hero-sub: "Pre-built packages for starting, launching, and growing. No assembly required."
   CTAs: "See Bundles" href="#bundles", "Talk to a Human" href="mailto:hello@famtastichosting.com"

2. TICKER: "Domain Included" | "Email Included" | "SSL Included" | "One Price" | "No Assembly" | "Same-Day Setup" | "Custom Nameservers" | "Cancel Anytime"

3. FOUR BUNDLE CARDS — id="bundles", .bundle-grid (2-col on desktop, 1-col on mobile):
   Each .bundle-card (custom style — see CSS below):

   Card 1 — Small Biz Starter ($299/yr):
   Badge: "Best for starting"
   Headline: "Small Biz Starter"
   Price: "$299/yr"
   For: "You just need to exist online. This gets you there."
   Includes (as a clean list): .com domain registration · 3 professional email addresses · SSL standard certificate
   Savings note: "Save $34 vs buying separately"
   CTA: btn-outline href="mailto:hello@famtastichosting.com?subject=Small Biz Starter Bundle" "Get Started"

   Card 2 — WordPress Launch ($35/mo) [FEATURED — most popular]:
   Badge: "Most Popular"
   Headline: "WordPress Launch"
   Price: "$35/mo"
   For: "You want a WordPress site, live, with email. This is it."
   Includes: Managed WordPress Basic plan · 1 Professional email address · SSL standard certificate · Domain registration (year 1)
   Savings note: "Save 15% vs buying separately"
   CTA: btn-primary href="mailto:hello@famtastichosting.com?subject=WordPress Launch Bundle" "Launch WordPress"
   Lime border treatment, card stands out

   Card 3 — Growth Hosting ($50/mo):
   Badge: "For traffic-heavy sites"
   Headline: "Growth Hosting"
   Price: "$50/mo"
   For: "Traffic is growing. You need more than shared hosting."
   Includes: Web Hosting Plus Launch plan · Website Security Standard · SSL standard certificate
   Savings note: "Save $26/mo vs buying separately"
   CTA: btn-outline href="mailto:hello@famtastichosting.com?subject=Growth Hosting Bundle" "Get Growth"

   Card 4 — Designs Complete ($1,500 + $40/mo):
   Badge: "Full service"
   Headline: "Designs Complete"
   Price: "$1,500 + $40/mo"
   Price-sub: "One-time design fee + monthly hosting"
   For: "You want us to build it and host it. Done."
   Includes: Custom site design by FAMtastic Designs · WordPress Launch bundle ($40/mo) · Full brand delivery (files, fonts, colors) · 2-3 week turnaround
   CTA: btn-hot href="https://famtasticdesigns.com" "Talk to a Designer"
   Deep indigo (#1a0d3a) card, hot accent

4. HOW BUNDLES WORK — 3 steps (clean, simple):
   .bundle-steps: numbered 01 02 03, prose style (reuse .how-it-works CSS):
   01. "Choose your bundle." — Pick the package that matches where you are today. Small Biz Starter if you're just getting your name out. WordPress Launch if you're ready to build. Designs Complete if you want it done for you.
   02. "We configure everything." — Domain, DNS, email, SSL, hosting — all configured to your nameservers. Same day. No technical setup on your end.
   03. "You build (or we build)." — Log into your cPanel, your WordPress, or your Website Builder. Or hand the keys to FAMtastic Designs and let us build something custom.

5. DESIGN BRIDGE: <DesignBridge variant="bundles" />
6. FAMthoughts: <FAMThoughts headline="Your first year online: a small business hosting guide." />

Add CSS for .bundle-grid, .bundle-card, .bundle-card--featured, .bundle-card--designs.
`, { label: 'page:bundles', model: 'sonnet' }),

]) // end parallel

log(`All 7 pages completed. Checking results...`)

// ─── PHASE 3: VERIFY ─────────────────────────────────────────────────────────

phase('Verify')

const VERIFY_PROMPT = `
You are the verifier for a FAMtasticHosting.com Astro build.
Working directory: ${ROOT}

TASKS:
1. Run: ls src/pages/ src/components/ src/layouts/ src/styles/ public/fonts/ — confirm all expected files exist.
2. Run: npm run build 2>&1 | head -100 — check for build errors.
3. If build errors exist, attempt to fix them (missing imports, syntax errors, prop mismatches).
4. After successful build (or after fixing): run "git -C ${ROOT}/../../ add famtastic-sites/famtastic-hosting/" then commit with message:
   "feat: FAMtasticHosting.com — 7-page Astro hosting site"
5. Report: which pages built successfully, any remaining issues, what was fixed.

Expected files:
- src/pages/index.astro, wordpress.astro, hosting.astro, builder.astro, servers.astro, domains.astro, bundles.astro
- src/components/Nav.astro, Footer.astro, DesignBridge.astro, PricingCard.astro, BillingToggle.astro, FAMThoughts.astro
- src/layouts/WildLayout.astro, ExtremeLayout.astro
- src/styles/global.css, wild.css, extreme.css, components.css
- src/data/products.json, bundles.json
- public/fonts/ (at least some .woff2 files)
- public/scripts/nav.js, animations.js
- package.json, astro.config.mjs

IMPORTANT:
- Do NOT add "Co-Authored-By", "Claude", "AI" to the commit message
- The commit message must read as a human developer wrote it
`

const verifyResult = await agent(VERIFY_PROMPT, { label: 'verify', model: 'sonnet' })
log(`Verify complete: ${typeof verifyResult === 'string' ? verifyResult.slice(0, 300) : 'done'}`)

return { scaffoldResult, pages: pageResults, verifyResult }
