# FAMtasticHosting.com — Brain Instructions for Claude Code Multi-Swarm

## What Changed From Previous Version

1. **7 pages, not 6** — added `builder.html` (Website Builder with FAMtastic Designs tie-in)
2. **Framework is OPEN** — the build team can use Astro, Next.js, or whatever produces the best result. Not locked to vanilla HTML. Recommended: Astro for Phase 1 + easy Phase 2 dashboard expansion.
3. **Dashboard is designed into the architecture** — Phase 1 ships the hosting site. Phase 2 adds customer portal + admin dashboard. File structure accounts for both.
4. **GoDaddy white-label support phone** — (480) 624-2500 must appear on every page footer and in the dashboard.
5. **Website Builder page has a dual purpose** — sells the builder AND tees up FAMtastic Designs as the upgrade path. The Crossroads section is the key differentiator.

## Execution Command

Run this from terminal:

```bash
cd ~/famtastic-sites/famtastic-hosting && claude --model sonnet -p "Read BUILD-SPEC.md, wild-reference.html, extreme-reference.html, and DESIGN-DECISIONS.md in this directory. Build all 7 pages of FAMtasticHosting.com as specified. This is a MULTI-PAGE site with a framework-open approach — use Astro or whatever produces the best result. index.html (WILD) is a product preview hub linking to category pages. wordpress.html (WILD), hosting.html (WILD), builder.html (WILD + FAMtastic Designs tie-in), servers.html (EXTREME only), domains.html (WILD lighter), bundles.html (WILD). Every page gets real copy, real pricing, Design Bridge, shared nav/footer, GoDaddy support phone (480) 624-2500 in footer. No single-page collapse. No logo images. No AI references. No CDN dependencies. Self-host fonts. Extract Tailwind into proper CSS or use Astro scoped styles. Mobile responsive. Dashboard architecture is designed into the file structure (Phase 2) but NOT built yet. Commit each page separately. Use component reuse — shared nav, footer, DesignBridge, PricingCard, billing toggle should be defined once, used everywhere."
```

## What Gets Built (Phase 1)

7-page hosting site with:
- Real pricing from the pricing table in BUILD-SPEC.md
- WILD template for 6 pages, EXTREME for servers only
- builder.html has a Crossroads section (DIY vs Custom Design) and FAMtastic Designs tie-in
- GoDaddy white-label support phone in every footer
- Design Bridge section on every page
- Monthly/annual billing toggle
- Self-hosted fonts, no CDN dependencies
- Mobile-first responsive
- Centralized product data (JSON), not copy-pasted across pages

## What Gets DESIGNED But Not Built (Phase 2)

- Customer portal (login, manage services, view billing, white-label support phone)
- Admin dashboard (customer lookup, order management, revenue tracking, GoDaddy API integration)
- Auth layer
- GoDaddy reseller API integration

## After Build: Product Verification

1. All 7 pages render in browser
2. Navigation links between pages work
3. builder.html has the Crossroads section + FAMtastic Designs tie-in
4. servers.html looks distinctly different (EXTREME aesthetic)
5. Pricing matches BUILD-SPEC.md exactly
6. Mobile responsive at all breakpoints
7. No CDN dependencies remain
8. Self-hosted fonts load correctly
9. Design Bridge section present on all pages
10. ICANN disclosure in every footer
11. GoDaddy support phone (480) 624-2500 in every footer
12. Product data centralized, not copy-pasted
13. "Talk to a Human" links work