---
title: "Build: FAMtasticHosting.com Multi-Page Static Site"
date: 2026-06-10
author: shay
source: directive
confidence: decision
type: build-spec
task-id: hosting-site-build-001
status: pending
assigned-to: claude-code-multiswarm
---

# Build: FAMtasticHosting.com Multi-Page Static Site

## Objective

Build a complete multi-page static website for famtastichosting.com using the wild.html mockup as the primary design template and extreme.html for the servers/dedicated resources page. Ship 6 pages: homepage + 5 product category pages, each with real pricing, real copy, and consistent brand identity.

## Critical Constraints (NEVER VIOLATE)

1. **NO single-page site.** Every product category gets its own HTML file. The homepage is a product PREVIEW that links out. This is a standing directive from Fritz — Claude tends to collapse everything into one page. Fight that instinct.
2. **NO AI references in commits.** No "Claude", "AI", "Co-Authored-By", "generated", "assisted" anywhere in commit messages.
3. **NO official FAMtastic logo yet.** Use text-based branding (Space Grotesk "FAMtastic" wordmark) or the SVG orbital/tech marks from the mockups. Do not create or reference a logo image file.
4. **NO GoDaddy branding exposed.** GoDaddy is invisible infrastructure. Custom nameservers, branded touchpoints. ICANN disclosure line only where legally required (footer).
5. **NO template defaults.** No centered heroes, no Inter font, no 3-column feature grids, no stock photos, no "Trusted by 10,000+ businesses" fake social proof.
6. **NO hardcoded placeholder content.** Every heading, paragraph, CTA, and price must be real, final copy. No "Lorem ipsum", no "Coming soon", no "TBD".
7. **Cheap swarm execution.** Use Claude Code multi-agent (no Opus). Subagents use Sonnet/Haiku. This is a static HTML build — it does not need heavyweight models.

## Source Files

- **Primary template:** `~/famtastic/FAMtastic Fishing Lines 6-8/mockups/hosting-com/wild.html`
- **Secondary template (servers page ONLY):** `~/famtastic/FAMtastic Fishing Lines 6-8/mockups/hosting-com/extreme.html`
- **Design decisions doc:** `~/famtastic/FAMtastic Fishing Lines 6-8/design-decisions/hosting-com.md`
- **Strategy doc:** `~/famtastic/FAMTASTIC-HOSTING-STRATEGY.md`

## Page Structure (6 pages)

### 1. index.html — Homepage (WILD template)

**Purpose:** Product preview hub. Visitor lands here, sees the product categories, clicks through to the one they need.

**Sections (in order):**
1. **Hero** — Layered hero from wild.html. Headline: "Your site. Hosted right. No one needs to know who's behind the curtain." Subhead: "Premium hosting with custom nameservers, starting at $5.99/mo." Two CTAs: primary "See Plans" (#plans), secondary "Talk to a Human" (mailto or contact).
2. **Trust Bar** — One tight row: "99.9% Uptime" | "1,000+ Sites Hosted" | "Based in Miami, FL" — three elements max, no logo carousel, no fake testimonials.
3. **Product Preview Grid** — Four cards, each linking to its own page:
   - "WordPress Hosting" → wordpress.html (icon: WordPress logo or editorial icon, short desc: "Managed. Optimized. Yours.")
   - "Web Hosting" → hosting.html (icon: cPanel/server icon, short desc: "cPanel. Full control. Your brand.")
   - "Servers & Infrastructure" → servers.html (icon: terminal/server icon, short desc: "Dedicated resources. Zero sharing.")
   - "Domains & Email" → domains.html (icon: globe/mail icon, short desc: "Your name. Your inbox. Secured.")
4. **Bundle Highlight** — Feature the "Small Biz Starter" bundle prominently. $299/yr. Includes domain + 3 emails + SSL. CTA links to a bundle detail section or bundles.html.
5. **How It Works** — Three numbered steps, prose-style (NOT icon grid):
   - Step 1: "Pick your plan." One sentence.
   - Step 2: "We set you up." One sentence about custom nameservers and white-labeling.
   - Step 3: "You build." One sentence about the Designs Bridge and support.
6. **Design Bridge** — Full section with its own bg color (#1a0d3a deep indigo). Accent CTA in #ff007a. Copy: "A lot of our clients came to us for hosting and left with a site they're proud of." Link to famtasticdesigns.com. This is NOT a banner — it's a full editorial section.
7. **Founder Voice** — Short, first person. Three paragraphs max. No corporate bio. "×" marks for what others do wrong, checks for what we do right.
8. **FAMtasticThoughts strip** — One strip: "Running a site? Learn how to grow it." Link to famtasticthoughts.com. Editorial framing, not self-promotion.
9. **Footer** — Required ICANN disclosure, copyright, links to all pages, social links (placeholder URLs), contact email.

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

### 4. servers.html — Web Hosting Plus / Dedicated Resources (EXTREME template)

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

### 5. domains.html — Domains, Email & SSL (WILD template, lighter tone)

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

### 6. bundles.html — Pre-Built Combos (WILD template)

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

## Design System

### WILD Template (pages 1, 2, 3, 5, 6)

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

### EXTREME Template (page 4 ONLY)

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

### Shared Across All Pages

**Navigation:** Top nav with FAMtastic wordmark (text, no logo image), page links (WordPress, Hosting, Servers, Domains, Bundles), and "Talk to a Human" CTA button. Consistent across all pages.

**Footer:** ICANN disclosure line, copyright, links to all pages, email contact, social links (placeholders), famtasticdesigns.com and famtasticthoughts.com cross-promo links.

**Mobile-first responsive:** Every page must look correct on mobile, tablet, desktop. The wild.html mockup already has mobile breakpoints — use those as the model.

## File Structure

```
famtastic-hosting/
├── index.html              (homepage — WILD)
├── wordpress.html          (managed WP — WILD)
├── hosting.html            (cPanel hosting — WILD)
├── servers.html            (Web Hosting Plus — EXTREME)
├── domains.html            (domains + email + SSL — WILD lighter)
├── bundles.html            (pre-built combos — WILD)
├── css/
│   ├── base.css            (shared resets, typography, variables)
│   ├── wild.css            (WILD template styles)
│   ├── extreme.css         (EXTREME template styles)
│   └── components.css     (shared components: nav, footer, cards)
├── js/
│   ├── nav.js              (mobile nav toggle, scroll behavior)
│   ├── billing-toggle.js   (monthly/annual price toggle — shared)
│   └── animations.js       (tickers, fades, scroll-triggered)
├── assets/
│   └── fonts/              (self-hosted font files, no CDN)
└── README.md               (build notes, deployment instructions)
```

## Technical Implementation

1. **Static HTML + CSS + JS.** No frameworks. No build step. No Astro. No React. Pure files.
2. **Self-host fonts.** Download Space Grotesk, Lora, JetBrains Mono, Share Tech Mono from Google Fonts and serve locally. Remove all CDN `<link>` tags. This eliminates SRI concerns and external dependencies.
3. **Tailwind CSS → custom CSS.** The mockups use Tailwind via CDN. Extract the utility classes used into a custom CSS file. The final site should NOT load Tailwind CDN. Write proper CSS with variables matching the design system above.
4. **Responsive.** Test at 320px, 768px, 1024px, 1440px minimum. Use clamp() for fluid typography. Mobile nav is a hamburger menu.
5. **Accessible.** Semantic HTML5 elements, proper heading hierarchy, ARIA labels on interactive elements, sufficient color contrast (WCAG AA minimum). The dark theme can still pass AA with the text colors specified.
6. **Fast.** No render-blocking external resources. Inline critical CSS or load with `<link rel="preload">`. Images (if any) use lazy loading. Target <3s full page load on 4G.
7. **SEO.** Proper `<title>`, `<meta description>`, Open Graph tags per page. Structured data (JSON-LD) for Organization and Product schemas. Canonical URLs.
8. **Contact.** "Talk to a Human" links to `mailto:hello@famtastichosting.com` (placeholder email). When Netlify Forms or Formspree is wired, this becomes a real contact flow.

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

## Copy Voice & Tone

- **Confident but not arrogant.** "Your site. Hosted right." not "The best hosting on the planet."
- **Direct.** No filler paragraphs. No "In today's digital landscape..."
- **First person in founder section.** "I started this because..." not "FAMtastic was founded in..."
- **Outcome-first.** "Sites that load fast" not "NVMe SSD storage with Litespeed caching."
- **Culturally fluent.** The brand is FAMtastic — bold, unapologetic, stands apart. The voice should feel like talking to someone who knows what they're doing and won't waste your time.
- **Honest about what this is.** We're not claiming enterprise infrastructure. We're saying: premium-branded hosting, custom nameservers, white-label support, and a clear path to getting your site designed too.
- **No fear in the ICANN disclosure.** One honest line in the footer: "Domain registration services fulfilled through WildWestDomains.com, an ICANN-accredited registrar." Own it. Porkbun proves this builds trust.
- **Design Bridge is editorial, not an ad.** "A lot of our clients came to us for hosting and left with a site they're proud of." This is a referral framing, not a banner.

## Acceptance Criteria

1. All 6 HTML pages exist and render correctly in browser
2. Mobile responsive at all breakpoints (320, 768, 1024, 1440)
3. No external CDN dependencies — all fonts and CSS are local
4. Navigation links between all pages work
5. Pricing matches the table above exactly
6. Design Bridge section appears on all pages with correct copy and link to famtasticdesigns.com
7. ICANN disclosure in every footer
8. servers.html uses the EXTREME template aesthetic (dark terminal green, Share Tech Mono, CRT effects)
9. All other pages use WILD template aesthetic (violet/lime, Space Grotesk, perspective grid)
10. No placeholder content — every word is real, final copy
11. No logo image files — text wordmark only
12. Billing toggle works (monthly/annual) on pages with pricing
13. "Talk to a Human" CTA links to mailto:hello@famtastichosting.com
14. All images/icons are inline SVG or CSS — no external image dependencies
15. Page load under 3 seconds on 4G connection

## Deployment Target

- **Domain:** famtastichosting.com
- **Hosting:** Netlify (static site deploy)
- **DNS:** Already configured through GoDaddy
- **SSL:** Netlify provides free SSL via Let's Encrypt
- **Contact form:** Initially mailto: link. Netlify Forms or Formspree to be wired in Phase 2.

## Provenance

- Design direction: Fritz (confirmed June 10, 2026)
- Template choices: wild.html for most pages, extreme.html for servers page (Fritz directive)
- Pricing: 1.75x global markup, 2.5x SSL (confirmed by Fritz June 9-10, 2026)
- Multi-page directive: Fritz explicitly rejected single-page approach ("claude tends to build one page sites which I hate")
- No-logo constraint: Fritz confirmed no official FAMtastic signature logo yet — use wordmark
- Swarm execution: Fritz directed multi-swarm, autonomous, cheap (no Opus)