---
title: "Build: FAMtasticHosting.com — Marketing Site + Dashboard"
date: 2026-06-10
author: shay
source: directive
confidence: decision
type: build-spec
task-id: hosting-site-build-001
status: pending
assigned-to: claude-code-multiswarm
---

# Build: FAMtasticHosting.com — Marketing Site + Dashboard

## Objective

Build FAMtasticHosting.com as a full product: 7-page marketing site with real pricing, real copy, and consistent brand identity, PLUS a backend dashboard that replaces the GoDaddy reseller panel with a branded experience. Phase 1 ships the marketing site. Phase 2 ships the dashboard. Both are designed together so the architecture supports the full product from day one.

## Phases

- **Phase 1 (Build Now):** 7-page marketing site. Static or framework-rendered. Ship fast, validate, iterate.
- **Phase 2 (Build After Marketing Site Is Live):** Customer portal + admin dashboard. Requires auth, GoDaddy API integration, database. Designed into the architecture now but built separately.

---

## Critical Constraints (NEVER VIOLATE)

1. **NO single-page site.** Every product category gets its own page. The homepage is a product PREVIEW that links out. This is a standing directive from Fritz — Claude tends to collapse everything into one page. Fight that instinct.
2. **NO AI references in commits.** No "Claude", "AI", "Co-Authored-By", "generated", "assisted" anywhere in commit messages.
3. **NO official FAMtastic logo yet.** Use text-based branding (Space Grotesk "FAMtastic" wordmark) or the SVG orbital/tech marks from the mockups. Do not create or reference a logo image file.
4. **NO GoDaddy branding exposed.** GoDaddy is invisible infrastructure. Custom nameservers, branded touchpoints. ICANN disclosure line only where legally required (footer). The only GoDaddy-visible element is the **customer service phone number** required for reseller support — and even that is presented under the FAMtastic Hosting brand.
5. **NO template defaults.** No centered heroes, no Inter font, no 3-column feature grids, no stock photos, no "Trusted by 10,000+ businesses" fake social proof.
6. **NO hardcoded placeholder content.** Every heading, paragraph, CTA, and price must be real, final copy. No "Lorem ipsum", no "Coming soon", no "TBD".
7. **Cheap swarm execution.** Use Claude Code multi-agent (no Opus). Subagents use Sonnet/Haiku. This build does not need heavyweight models.
8. **Framework choice is OPEN.** Pure static HTML, Astro, Next.js, whatever — the build team chooses the best tool for the job. The mockups are visual reference, not a prison. If a framework produces a more imaginative, more maintainable result with component reuse across 7 pages and an API layer for the dashboard, USE IT. The constraint is the outcome (matches the visual direction, fast, accessible), not the tool. Recommended: Astro for the marketing site (component islands, build-time rendering, fast loads) + a thin Node/Express backend for the dashboard.

---

## Source Files

- **Primary template:** `~/famtastic/FAMtastic Fishing Lines 6-8/mockups/hosting-com/wild.html`
- **Secondary template (servers page ONLY):** `~/famtastic/FAMtastic Fishing Lines 6-8/mockups/hosting-com/extreme.html`
- **Design decisions doc:** `~/famtastic/FAMtastic Fishing Lines 6-8/design-decisions/hosting-com.md`
- **Strategy doc:** `~/famtastic/FAMTASTIC-HOSTING-STRATEGY.md`

---

## Phase 1: Marketing Site (7 Pages)

### 1. index.html — Homepage (WILD template)

**Purpose:** Product preview hub. Visitor lands here, sees the product categories, clicks through to the one they need.

**Sections (in order):**
1. **Hero** — Layered hero from wild.html. Headline: "Your site. Hosted right. No one needs to know who's behind the curtain." Subhead: "Premium hosting with custom nameservers, starting at $5.99/mo." Two CTAs: primary "See Plans" (#plans), secondary "Talk to a Human" (links to contact).
2. **Trust Bar** — One tight row: "99.9% Uptime" | "1,000+ Sites Hosted" | "Based in Miami, FL" — three elements max, no logo carousel, no fake testimonials.
3. **Product Preview Grid** — Five cards, each linking to its own page:
   - "WordPress Hosting" → wordpress.html (icon: WordPress logo or editorial icon, short desc: "Managed. Optimized. Yours.")
   - "Web Hosting" → hosting.html (icon: cPanel/server icon, short desc: "cPanel. Full control. Your brand.")
   - "Website Builder" → builder.html (icon: design/wrench icon, short desc: "Build it yourself. Or let us build it for you.")
   - "Servers & Infrastructure" → servers.html (icon: terminal/server icon, short desc: "Dedicated resources. Zero sharing.")
   - "Domains & Email" → domains.html (icon: globe/mail icon, short desc: "Your name. Your inbox. Secured.")
4. **Bundle Highlight** — Feature the "Small Biz Starter" bundle prominently. $299/yr. Includes domain + 3 emails + SSL. CTA links to bundles.html.
5. **How It Works** — Three numbered steps, prose-style (NOT icon grid):
   - Step 1: "Pick your plan." One sentence.
   - Step 2: "We set you up." One sentence about custom nameservers and white-labeling.
   - Step 3: "You build." One sentence about the Designs Bridge and support.
6. **Design Bridge** — Full section with its own bg color (#1a0d3a deep indigo). Accent CTA in #ff007a. Copy: "A lot of our clients came to us for hosting and left with a site they're proud of." Link to famtasticdesigns.com. This is NOT a banner — it's a full editorial section.
7. **Founder Voice** — Short, first person. Three paragraphs max. No corporate bio. "×" marks for what others do wrong, checks for what we do right.
8. **FAMtasticThoughts strip** — One strip: "Running a site? Learn how to grow it." Link to famtasticthoughts.com. Editorial framing, not self-promotion. This is bidirectional cross-promo — FAMtastic Thoughts articles will host content that drives traffic to FAMtastic Hosting products, and this strip drives traffic back to those articles.
9. **Footer** — Required ICANN disclosure, copyright, links to all pages, social links (placeholder URLs), **GoDaddy 24/7 support phone: (480) 624-2500** (white-labeled, presented as FAMtastic Hosting support), contact email, famtasticthoughts.com cross-promo link.

### 2. wordpress.html — Managed WordPress (WILD template)

**Purpose:** Dedicated WordPress hosting page. This is the lead product.

**Sections:**
1. **Hero** — "WordPress hosting that doesn't make you think about hosting." Sub: "Managed, optimized, and branded as yours — starting at $12/mo."
2. **Pricing Cards** — Two tiers:
   - **Basic: $12/mo** (wholesale $7.01, 1.71x). Features: 1 site, 30GB SSD, 1-click WP install, daily backups, custom nameservers, free SSL, 24/7 white-label support.
   - **Ultimate: $24/mo** (wholesale $13.67, 1.76x). Features: Unlimited sites, 75GB SSD, premium WP staging, malware scan & removal, custom nameservers, free SSL, priority white-label support.
3. **Bundle Upsell** — "WordPress Launch Bundle: $35/mo" (Managed WP + Professional Email + SSL + Domain). Save 15% vs buying separate. This is the highest-value path.
4. **Why Managed WordPress** — Outcome-focused section. NOT a feature grid. Prose explaining: auto-updates, security hardening, staging, WP-CLI access, custom nameservers that hide GoDaddy.
5. **FAQ** — 4-5 real questions with real answers. No filler.
6. **Design Bridge** — Same section as homepage, adapted for WP context.
7. **CTA** — "Get WordPress Hosting" primary button. "Talk to a Human" secondary.

### 3. hosting.html — cPanel Web Hosting (WILD template)

**Purpose:** Traditional shared hosting with cPanel. Entry-level product.

**Sections:**
1. **Hero** — "cPanel hosting that doesn't scream 'reseller'." Sub: "Full control. Custom nameservers. Your brand on everything."
2. **Pricing Cards** — Two tiers:
   - **Starter: $7/mo** (wholesale $3.99). Features: 1 site, 50GB SSD, cPanel, 1-click installs, custom nameservers, free SSL, white-label support.
   - **Ultimate: $31/mo** (wholesale $17.59). Features: Unlimited sites, unlimited SSD, cPanel + Softaculous, custom nameservers, free SSL + malicious malware scan, priority white-label support.
3. **What You Get** — Outcomes, not specs. "Your brand on everything" not "white-labeled cPanel". "Sites that load fast" not "SSD NVMe storage". Frame as benefits, not feature bullets.
4. **cPanel vs WordPress section** — Clear prose explaining when to choose cPanel vs managed WP. Not a hard sell — just clarity.
5. **Design Bridge + CTA**

### 4. builder.html — Website Builder (WILD template)

**Purpose:** GoDaddy's Website Builder product resold under our brand, with a prominent FAMtastic Designs tie-in. This page has a DUAL purpose: sell the builder AND tee up the design services upsell.

**THIS IS THE DESIGNS BRIDGE PAGE.** While every page has a Design Bridge section, this page's entire second half is about the transition from "build it yourself" to "let us build it for you."

**Sections:**
1. **Hero** — "Build it yourself. Or let us build it for you." Sub: "Website Builder starts at $12/mo. Custom design starts at $300. You pick your path."
2. **Pricing Cards** — Two tiers (GoDaddy Website Builder resold):
   - **Essential: $12/mo** (wholesale $4.13). Features: 1 site, free domain, 24/7 phone support, mobile-optimized templates, SSL included, basic marketing suite.
   - **Commerce: $30/mo** (wholesale $10.44). Features: Online store, product listings, payments, shipping labels, marketing suite, SSL included, priority support.
3. **Builder Features** — Show what the builder includes: drag-and-drop, templates, mobile-optimized, built-in SEO tools, social media integration. Outcome-focused, not feature list.
4. **The Crossroads Section** — This is the key differentiator. Two columns:
   - **Left: "Build it yourself."** — You pick a template, you drag, you drop, you launch. It works. You own it. 10-20 hours of your time. $12/mo.
   - **Right: "Let us build it."** — You tell us what you want. We design it. We build it. You approve it. It's yours. 2-3 weeks. Starting at $300 for a logo package, $800 for a brand refresh, $1,500+ for a full site. Link to famtasticdesigns.com.
   - **Bottom: "Not sure? Start with the builder. Upgrade to custom when you're ready."** — This is the honest pitch. Start small, grow into design.
5. **FAMtastic Designs Showcase** — Brief section about what FAMtastic Designs offers: custom site design, brand identity, logo packages. Link to famtasticdesigns.com. This is future integration — for now, just a prominent link with editorial copy.
6. **Design Bridge** — More prominent here than on any other page. Full section: "You came here to build a site. What if someone could build it for you — and make it look like nothing else on the internet?" Link to famtasticdesigns.com.
7. **FAQ** — "What's the difference between Website Builder and custom design?" "Can I start with the builder and upgrade to custom later?" "Do I need hosting if I use the builder?" (Yes, it's included.)
8. **CTA** — "Start Building" (builder purchase) primary. "Talk to a Designer" (famtasticdesigns.com) secondary.

### 5. servers.html — Web Hosting Plus / Dedicated Resources (EXTREME template)

**Purpose:** The serious infrastructure page. Uses the extreme.html template aesthetic — dark terminal green, CRT scanlines, Share Tech Mono, hacker/server DNA.

**THIS IS THE ONLY PAGE THAT USES THE EXTREME TEMPLATE.** All other pages use wild.

**Sections:**
1. **Hero** — EXTREME aesthetic. Terminal-style prompt. Headline: "> Dedicated resources. Zero sharing. Full uptime." (or similar command-line aesthetic). The hero uses the matrix-rain / CRT scanline treatment from extreme.html.
2. **Pricing Cards** — Two tiers styled as terminal cards:
   - **Launch: $37/mo** (wholesale $20.90, 1.77x). Features: 1 site, 30GB NVMe SSD, dedicated CPU & RAM, custom nameservers, free SSL, white-label support. Frame this as "for growing sites that need dedicated resources."
   - **Expand: $127/mo** (wholesale $72.44, 1.75x). Features: Unlimited sites, 120GB NVMe SSD, dedicated resources, full root-like control via cPanel, custom nameservers, free SSL, priority support. Frame as "for traffic-heavy operations that can't share."
3. **Server Specs** — Technical detail section. This page's audience READS specs. Show them: CPU allocation, RAM, storage type, IOPS, bandwidth. Use JetBrains Mono / Share Tech Mono for spec blocks.
4. **Terminal Demo** — A styled section showing what the server experience looks like. cPanel dashboard mock or terminal prompt showing nameserver config. This is the page where technical depth is a selling point, not a barrier.
5. **"When You've Outgrown Shared"** — Prose section for people migrating from cheap shared hosting. Empathy ("you've been burned before") + clarity ("this is the step up").
6. **Design Bridge** — Adapted: "Running serious infrastructure? Your site deserves serious design." Link to famtasticdesigns.com.

### 6. domains.html — Domains, Email & SSL (WILD template, lighter tone)

**Purpose:** Domain registration, professional email, and SSL certificates. This is the "get your name" page.

**Sections:**
1. **Hero** — "Your name. Your inbox. Your lock." Light sub: "Domains starting at $20/yr. Professional email from $3/mo. SSL to seal it."
2. **Domain Pricing** — Key TLDs:
   - .com: $20/yr (wholesale $11.59)
   - .net: $25/yr (wholesale ~$14)
   - .org: $22/yr (wholesale ~$12)
   - .co: $35/yr (wholesale ~$20)
   Note: These are our retail prices with ~1.75x markup.
3. **Email Packages** —
   - Professional Email: $3/mo (wholesale $1.61) — custom domain address, 10GB
   - Group Email: $4/mo (wholesale $2.12) — team inboxes, shared calendars
   - Microsoft 365: from $9/mo (wholesale $4.29) — full suite
4. **SSL Certificates** —
   - Standard SSL: $79/yr (wholesale $31.73, ~2.5x) — single domain, DV, automatic renewal
5. **Bundle Upsell** — "Small Biz Starter: $299/yr" — Domain + 3 email addresses + SSL. The all-in-one kickoff.
6. **Design Bridge + Footer**

### 7. bundles.html — Pre-Built Combos (WILD template)

**Purpose:** Packaging page. Makes the bundle buying decision easy.

**Sections:**
1. **Hero** — "Everything you need. One purchase." Sub: "Pre-built packages for starting, launching, and growing."
2. **Four Bundle Cards:**
   - **Small Biz Starter — $299/yr** — Domain + 3 Professional Email + SSL. For: "You just need to exist online. This gets you there." Components listed out.
   - **WordPress Launch — $35/mo** — Managed WP Basic + Professional Email + SSL + Domain. For: "You want a WordPress site, live, with email. This is it." Most popular badge.
   - **Growth Hosting — $50/mo** — Web Hosting Plus Launch + Website Security + SSL. For: "Traffic is growing. You need more than shared hosting."
   - **Designs Complete — $1,500+ $40/mo** — Custom site design + WP Launch bundle. For: "You want us to build it and host it. Done." CTA links to famtasticdesigns.com.
3. **How Bundles Work** — Three-step flow: Choose → We configure → You build. Clean, simple.
4. **CTA** — Primary: "Start with a bundle" Secondary: "Talk to us"

---

## Phase 2: Dashboard (Designed Now, Built After Marketing Site)

### Customer Portal

**Purpose:** Branded self-service portal where customers manage their hosting, domains, email, and billing. Replaces the GoDaddy reseller storefront experience with something that feels like FAMtastic, not GoDaddy.

**Features:**
1. **Login / Auth** — Email + password. Phase 2 can add social login (Google, Microsoft). The customer creates an account at purchase time or via invitation email from GoDaddy provisioning.
2. **Dashboard Home** — Overview of all services: active domains, hosting plans, email accounts, SSL certs, renewal dates. At-a-glance status (active, expiring soon, expired).
3. **Domain Management** — List domains, view DNS settings, manage nameserver records (showing ns1.famtastichosting.com / ns2.famtastichosting.com), renewal status, auto-renew toggle.
4. **Hosting Management** — View plan details, resource usage (bandwidth, storage), cPanel access link (branded), SSL status.
5. **Email Management** — List email accounts, add/remove addresses, change passwords, view quota usage.
6. **Billing** — View invoices, payment history, upcoming renewals, payment method on file. GoDaddy processes payments — we display the data.
7. **Support** — GoDaddy white-label support phone number prominently displayed: **(480) 624-2500**. "Call us: (480) 624-2500" visible from every page. Link to knowledge base / FAQ. Contact form that routes to support.
8. **Upgrade Path** — Links to upgrade current plans, add services (more email, SSL, security). Cross-sell bundles. "Want a custom site?" → famtasticdesigns.com.

### Admin Dashboard

**Purpose:** Fritz's command center. Everything the GoDaddy reseller panel does, but branded and simplified. One place to see all customers, all orders, all revenue.

**Features:**
1. **Customer Lookup** — Search by name, email, domain. View all services for a customer. View order history. View support tickets (if GoDaddy API exposes them).
2. **Order Management** — View all orders (pending, active, cancelled, expired). Provision new services manually. Cancel or suspend services. View GoDaddy order IDs alongside FAMtastic order references.
3. **Revenue Dashboard** — Total revenue MTD. Revenue by product category. Revenue by bundle type. Margin calculations (wholesale vs retail). Recurring revenue projection.
4. **Product Catalog** — View and manage pricing. Adjust markups per product. Toggle products on/off. Add bundles. The GoDaddy API provides the wholesale price; we set the retail price.
5. **Provisioning Status** — View GoDaddy provisioning status for each order. Track pending activations. Identify stuck orders.
6. **Reports** — Monthly revenue report. Customer growth report. Churn report. Popular products report. Export to CSV.
7. **Settings** — Profile settings. Branding settings (logo, colors, support phone number markup). Notification preferences. API key management (GoDaddy reseller API key, view/regenerate).

### GoDaddy API Integration Points

The dashboard backend talks to GoDaddy's reseller API for:
- **Customer provisioning** — Creating accounts, assigning products
- **Order management** — Placing orders, viewing order status
- **DNS management** — Reading/setting DNS records
- **Product catalog** — Reading available products and wholesale pricing
- **Billing data** — Reading invoices, payment status
- **Support routing** — Displaying GoDaddy's white-label support number

**GoDaddy Reseller API endpoints used:**
- `/v1/orders` — Order management (confirmed working with sso-key auth)
- `/v1/domains` — Domain management
- `/v1/customers` — Customer management (note: currently 401 with sso-key, may need different auth)
- Product catalog endpoints for pricing
- DNS management endpoints

**Phone number:** (480) 624-2500. GoDaddy provides 24/7 white-label phone support for reseller customers. This number must be prominently displayed on every page of the site and in the customer portal. The support team answers as "FAMtastic Hosting support."

---

## Design System

### WILD Template (pages 1, 2, 3, 4, 6, 7)

Source: wild.html mockup. Key attributes:

**Typography:**
- Display font: Space Grotesk (600/700 weights)
- Body: Keep wild.html's body font choices for body text
- Code/technical specs: JetBrains Mono

**Color Palette:**
- Background: #080808 (pitch black)
- Surface/card: #111114 or #161620
- Primary accent: #7c3aed (electric violet)
- Secondary accent: #84cc16 (lime/green) — used for upsell sections, as in wild.html
- Hot accent: #ff007a — ONLY for Design Bridge CTA and hero hot-line. Nowhere else.
- Text: #f5f5f0 (warm white)
- Muted text: #9090a0
- Border: #2a2a38

**Layout Elements:**
- Layered hero with perspective grid SVG, floating orbs, large stat typography
- Terminal-style cursor prompt element
- 3D card deck treatment for pricing
- Skewed lime-green section for upsell
- Stats section with large numbers
- Two-column feature layout
- Footer with FAM text branding

### EXTREME Template (page 5 ONLY — servers)

Source: extreme.html mockup. Key attributes:

**Typography:**
- Display: Share Tech Mono (primary for headlines)
- Secondary: Space Grotesk (for body and subheadings)
- Code: JetBrains Mono (for terminal blocks)

**Color Palette:**
- Background: #000000 (pure black)
- Primary accent: #00ff41 (terminal green)
- Secondary: #1a1a2e (surface cards)
- Hot accent: — extreme.html doesn't have the magenta; use terminal green as the sole accent
- Text: #e0e0e0
- Border: #00ff41 at 20% opacity

**Layout Elements:**
- CRT scanlines overlay (subtle, 3% opacity)
- Grain noise texture
- Matrix rain columns effect
- Glitch effect on logo/heading
- Terminal typewriter prompt effect
- Skewed clip-paths on sections
- Console/terminal-style spec blocks
- Green-on-black pricing cards styled like terminal windows

### Dashboard Design (Phase 2)

**Visual direction:** Clean, dark mode, minimal. Not WILD or EXTREME — a professional admin interface. Space Grotesk for headings, DM Sans for body, violet accent for CTAs and active states, clean card layout, ample whitespace. Inspired by Stripe Dashboard and Linear's admin aesthetic.

The dashboard is NOT a marketing page. It's a productivity tool. Function over form. The brand identity comes through in typography and accent color, not in visual effects.

### Shared Across All Pages

**Navigation:** Top nav with FAMtastic wordmark (text, no logo image), page links (WordPress, Hosting, Builder, Servers, Domains, Bundles), and "Talk to a Human" CTA button. Consistent across all pages.

**Footer:** ICANN disclosure line, copyright, links to all pages, **GoDaddy 24/7 support phone: (480) 624-2500** (white-labeled as FAMtastic Hosting support — required for reseller), email contact, social links (placeholders), famtasticdesigns.com and famtasticthoughts.com cross-promo links.

**Mobile-first responsive:** Every page must look correct on mobile, tablet, desktop. The wild.html mockup already has mobile breakpoints — use those as the model.

---

## File Structure (Framework-Open)

The build team chooses the framework. Here's a reference structure for Astro (recommended for Phase 1) and what it would evolve into for Phase 2:

**Phase 1 — Astro (or equivalent):**
```
famtastic-hosting/
├── src/
│   ├── components/       (shared: Nav, Footer, DesignBridge, PricingCard, etc.)
│   ├── layouts/          (WildLayout, ExtremeLayout)
│   ├── pages/
│   │   ├── index.astro       (homepage — WILD)
│   │   ├── wordpress.astro    (managed WP — WILD)
│   │   ├── hosting.astro     (cPanel — WILD)
│   │   ├── builder.astro     (website builder — WILD + Designs tie-in)
│   │   ├── servers.astro     (Web Hosting Plus — EXTREME)
│   │   ├── domains.astro     (domains + email + SSL — WILD lighter)
│   │   └── bundles.astro     (pre-built combos — WILD)
│   ├── styles/
│   │   ├── global.css        (resets, typography, variables)
│   │   ├── wild.css          (WILD template styles)
│   │   ├── extreme.css       (EXTREME template styles)
│   │   └── components.css    (shared components)
│   ├── data/
│   │   ├── products.json     (all product/pricing data — single source of truth)
│   │   └── bundles.json     (bundle definitions)
│   └── scripts/
│       ├── nav.ts            (mobile nav toggle, scroll behavior)
│       ├── billing-toggle.ts (monthly/annual price toggle)
│       └── animations.ts    (tickers, fades, scroll-triggered)
├── public/
│   └── fonts/                (self-hosted font files)
├── astro.config.mjs
├── package.json
└── README.md
```

**Phase 2 — Dashboard evolves into:**
```
famtastic-hosting/
├── src/
│   ├── pages/            (marketing site, unchanged)
│   ├── components/       (marketing + dashboard shared components)
│   ├── app/              (dashboard SPA — React/Svelte)
│   │   ├── auth/         (login, register, password reset)
│   │   ├── dashboard/    (customer portal)
│   │   ├── admin/        (admin dashboard)
│   │   └── api/          (GoDaddy API integration layer)
│   └── lib/
│       ├── godaddy/      (GoDaddy reseller API client)
│       ├── db/           (supabase or equivalent)
│       └── auth/         (session management)
└── ...
```

---

## Technical Implementation

1. **Framework choice is OPEN.** Pure static HTML, Astro, Next.js — whatever the build team believes produces the best result. The mockups are visual reference, not a straitjacket. If a framework enables better component reuse, faster iterations, and a clear path to the Phase 2 dashboard, USE IT. Recommended: Astro for Phase 1 (component islands, build-time rendering, zero JS by default, easy SSR if needed later).
2. **Component reuse.** Whether Astro components, React components, or Svelte components — the nav, footer, Design Bridge section, pricing cards, and billing toggle should be shared components, not copy-pasted across 7 pages. The mockups have consistent patterns; the implementation should reflect that with DRY code.
3. **Self-host fonts.** Download Space Grotesk, Lora, JetBrains Mono, Share Tech Mono from Google Fonts and serve locally. Remove all CDN `<link>` tags. This eliminates SRI concerns and external dependencies.
4. **Extract Tailwind into proper CSS.** The mockups use Tailwind via CDN. Extract the utility classes into custom CSS with design tokens (CSS variables for colors, spacing, typography). If using Astro, this can be done with scoped styles or a global stylesheet. The final site should NOT rely on the Tailwind CDN in production.
5. **Responsive.** Test at 320px, 768px, 1024px, 1440px minimum. Use clamp() for fluid typography. Mobile nav is a hamburger menu.
6. **Accessible.** Semantic HTML5 elements, proper heading hierarchy, ARIA labels on interactive elements, sufficient color contrast (WCAG AA minimum).
7. **Fast.** No render-blocking external resources. Images (if any) use lazy loading. Target <3s full page load on 4G.
8. **SEO.** Proper `<title>`, `<meta description>`, Open Graph tags per page. Structured data (JSON-LD) for Organization and Product schemas. Canonical URLs.
9. **Contact.** "Talk to a Human" links to `mailto:hello@famtastichosting.com` (placeholder email). When Netlify Forms or Formspree is wired, this becomes a real contact flow.
10. **GoDaddy white-label support number.** Every page footer AND the contact/support section must display the GoDaddy 24/7 white-label support phone number: **(480) 624-2500**. This is required by the reseller agreement and is a trust signal for customers. The wording: "24/7 Support: (480) 624-2500" presented under the FAMtastic Hosting brand.

---

## Pricing Data (Official — Use These Numbers)

All prices are our retail. Wholesale is shown for reference only — customers never see it.

| Product | Our Price | Frequency | Notes |
|---|---|---|---|
| .com Domain | $20/yr | annual | |
| .net Domain | $25/yr | annual | |
| .org Domain | $22/yr | annual | |
| .co Domain | $35/yr | annual | |
| cPanel Starter | $7/mo | monthly | 1 site, 50GB SSD |
| cPanel Ultimate | $31/mo | monthly | Unlimited sites/storage |
| Managed WP Basic | $12/mo | monthly | 1 site, 30GB SSD |
| Managed WP Ultimate | $24/mo | monthly | Unlimited sites, 75GB SSD |
| Web Hosting Plus Launch | $37/mo | monthly | Dedicated CPU/RAM |
| Web Hosting Plus Expand | $127/mo | monthly | 120GB NVMe, serious compute |
| Professional Email | $3/mo | monthly | Custom domain, 10GB |
| Group Email | $4/mo | monthly | Team inboxes |
| Microsoft 365 (base) | $9/mo | monthly | Full suite |
| SSL Standard | $79/yr | annual | Single domain, DV |
| Website Builder Essential | $12/mo | monthly | 1 site, templates, free domain, SSL |
| Website Builder Commerce | $30/mo | monthly | Online store, payments, marketing suite |
| Website Security Std | $8/mo | monthly | Malware scan + removal |
| Website Security Premium | $39/mo | monthly | Advanced WAF + monitoring |
| Email Marketing Beginner | $13/mo | monthly | |
| Email Marketing Pro | $36/mo | monthly | |

**Bundle Pricing:**

| Bundle | Price | Includes |
|---|---|---|
| Small Biz Starter | $299/yr | Domain + 3 Pro Email + SSL |
| WordPress Launch | $35/mo | Managed WP Basic + Pro Email + SSL + Domain annual |
| Growth Hosting | $50/mo | Web Hosting Plus Launch + Security + SSL |
| Designs Complete | $1,500 + $40/mo | Custom design + WP Launch bundle |

**Annual discount:** 20% off monthly equivalent (so $7/mo → ~$67/yr or $5.58/mo equiv). Toggle between monthly/annual on pricing cards.

---

## Copy Voice & Tone

- **Confident but not arrogant.** "Your site. Hosted right." not "The best hosting on the planet."
- **Direct.** No filler paragraphs. No "In today's digital landscape..."
- **First person in founder section.** "I started this because..." not "FAMtastic was founded in..."
- **Outcome-first.** "Sites that load fast" not "NVMe SSD storage with Litespeed caching."
- **Culturally fluent.** The brand is FAMtastic — bold, unapologetic, stands apart. The voice should feel like talking to someone who knows what they're doing and won't waste your time.
- **Honest about what this is.** We're not claiming enterprise infrastructure. We're saying: premium-branded hosting, custom nameservers, white-label support, and a clear path to getting your site designed too.
- **No fear in the ICANN disclosure.** One honest line in the footer: "Domain registration services fulfilled through WildWestDomains.com, an ICANN-accredited registrar." Own it. Porkbun proves this builds trust.
- **Design Bridge is editorial, not an ad.** "A lot of our clients came to us for hosting and left with a site they're proud of." This is a referral framing, not a banner.
- **Website Builder page has DUAL voice.** The first half sells the builder (confident, clear). The second half — the Crossroads section — shifts to editorial: "Not sure? Start with the builder. Upgrade to custom when you're ready." This is the honest pitch.

---

## Acceptance Criteria

### Phase 1 (Marketing Site)
1. All 7 HTML pages (or framework equivalents) exist and render correctly in browser
2. Mobile responsive at all breakpoints (320, 768, 1024px, 1440px)
3. No external CDN dependencies in production — all fonts and CSS are local
4. Navigation links between all pages work
5. Pricing matches the table above exactly
6. Design Bridge section appears on all pages with correct copy and link to famtasticdesigns.com
7. Website Builder page (builder.html) has the Crossroads section and FAMtastic Designs tie-in
8. ICANN disclosure in every footer
9. GoDaddy support phone: (480) 624-2500 in every footer and contact section
10. servers.html uses the EXTREME template aesthetic (dark terminal green, Share Tech Mono, CRT effects)
11. All other pages use WILD template aesthetic (violet/lime, Space Grotesk, perspective grid)
12. No placeholder content — every word is real, final copy
13. No logo image files — text wordmark only
14. Billing toggle works (monthly/annual) on pages with pricing
15. "Talk to a Human" CTA links to mailto:hello@famtastichosting.com
16. All images/icons are inline SVG or CSS — no external image dependencies
17. Page load under 3 seconds on 4G connection
18. Product data (pricing, feature lists, bundle definitions) is in a centralized data file, not copy-pasted across pages
19. Shared components (nav, footer, Design Bridge, pricing cards) are DRY — defined once, reused across pages

### Phase 2 (Dashboard — Design Only, Build Later)
1. Customer portal wireframes designed (login, dashboard home, domain management, hosting management, billing, support)
2. Admin dashboard wireframes designed (customer lookup, order management, revenue dashboard, product catalog, provisioning status, reports, settings)
3. GoDaddy API integration layer spec written (endpoints, auth, data flow)
4. Auth approach decided (supabase, auth0, or custom)
5. Visual direction documented: dark mode, Space Grotesk/DM Sans, violet accent, clean card layout, Stripe Dashboard aesthetic

---

## Deployment Target

- **Domain:** famtastichosting.com
- **Marketing site hosting:** Netlify (static deploy or Astro SSR)
- **Dashboard hosting:** Netlify or separate Node.js service (Phase 2)
- **DNS:** Configured through GoDaddy (custom nameservers: ns1.famtastichosting.com, ns2.famtastichosting.com)
- **SSL:** Netlify provides free SSL via Let's Encrypt (marketing site). Dashboard gets its own SSL.
- **Contact form:** Initially mailto: link. Netlify Forms or Formspree wired when dashboard is ready.
- **Database:** Supabase or equivalent (Phase 2, dashboard only)

---

## Provenance

- Design direction: Fritz (confirmed June 10, 2026)
- Template choices: wild.html for most pages, extreme.html for servers page (Fritz directive)
- Pricing: 1.75x global markup, 2.5x SSL (confirmed by Fritz June 9-10, 2026)
- Multi-page directive: Fritz explicitly rejected single-page approach ("claude tends to build one page sites which I hate")
- No-logo constraint: Fritz confirmed no official FAMtastic signature logo yet — use wordmark
- Framework: Fritz directed framework choice should be open — let the build team choose the best tool for imagination and maintainability. Pure static is not required if a framework produces better results.
- Swarm execution: Fritz directed multi-swarm, autonomous, cheap (no Opus)
- Backend dashboard: Fritz required — customer portal + admin panel that mirrors GoDaddy reseller functions
- Website Builder page: Fritz directed — tied to FAMtastic Designs. Builder page IS the Designs bridge. Future deep integration, current page has the crossroads + tie-in.
- GoDaddy support phone: (480) 624-2500 — must be visible on every page and in the dashboard. White-labeled under FAMtastic Hosting brand.
- FAMtastic Thoughts cross-promo: Fritz required — FAMtasticThoughts.com will have hosting-related articles that link to FAMtastic Hosting products. The hosting site reciprocates with FAMtasticThoughts strip on every page. Bidirectional content marketing loop.

---

## FAMtastic Thoughts Cross-Promo Strategy

This is a bidirectional content loop between FAMtasticHosting.com and FAMtasticThoughts.com. Both sites promote each other.

### Hosting Site → Thoughts Site

Every page on FAMtasticHosting.com has a **FAMtasticThoughts strip** (already spec'd above):
- Homepage: "Running a site? Learn how to grow it." → links to famtasticthoughts.com
- Product pages: Contextual article links ("Choosing between WordPress and cPanel hosting?", "What SSL actually does for your site")
- Footer: famtasticthoughts.com link in the cross-promo section alongside famtasticdesigns.com

### Thoughts Site → Hosting Site

FAMtasticThoughts.com will have articles that drive traffic to FAMtastic Hosting products. These are NOT ads — they're educational content that naturally references hosting as a solution:

- "How to pick a domain name that works as hard as you do" → domains.html
- "Why managed WordPress hosting is worth it (and when it isn't)" → wordpress.html
- "SSL certificates: what they actually do and why your site needs one" → domains.html (SSL section)
- "Your first year online: a small business hosting guide" → bundles.html
- "When shared hosting isn't enough anymore" → servers.html
- "Building vs designing: how to choose" → builder.html

Each article links to the relevant FAMtasticHosting.com page with editorial context — "If you're ready for managed WordPress, here's what that looks like" not "BUY NOW."

### Thoughts Site Page Requirements

FAMtasticThoughts.com needs hosting-related article pages (or at minimum, article stubs that link to Hosting product pages). These pages are part of the FAMtastic Thoughts studio (4th studio), not this build spec, but the URLs and topic mapping need to exist so the hosting site's FAMtasticThoughts strips can link to real content instead of a homepage.

**Minimum viable cross-promo for launch:**
- 3-5 article stubs on famtasticthoughts.com that match the product pages (WordPress, cPanel, SSL, Bundles, Servers)
- Each stub has a real headline, a 2-3 sentence teaser, and a CTA linking to the corresponding hosting page
- The hosting site's FAMtasticThoughts strips link to these specific articles, not just the homepage

**These article pages should be planned as part of the FAMtastic Thoughts build, not this hosting build.** But the hosting build needs to know they exist so the link structure works at launch.