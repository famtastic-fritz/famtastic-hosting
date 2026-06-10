# FAMtasticHosting.com — Brain Instructions for Claude Code Multi-Swarm

## Execution Command

Run this from terminal:

```bash
cd ~/famtastic/famtastic-hosting && bash build.sh
```

Or directly:

```bash
cd ~/famtastic/famtastic-hosting && claude --model sonnet -p "Read BUILD-SPEC.md, wild-reference.html, extreme-reference.html, and DESIGN-DECISIONS.md in this directory. Build all 6 pages of FAMtasticHosting.com as specified. This is a MULTI-PAGE static site. index.html (WILD template) is a product preview hub linking to category pages. wordpress.html (WILD), hosting.html (WILD), servers.html (EXTREME template only), domains.html (WILD lighter), bundles.html (WILD). Every page gets real copy, real pricing, Design Bridge, shared nav/footer. No single-page collapse. No logo images. No AI references. No CDN dependencies. Self-host fonts. Extract Tailwind into proper CSS. Mobile responsive. Commit each page separately."
```

## What This Does

1. Claude Code reads the full BUILD-SPEC.md (19KB of detailed instructions covering every page, every section, real pricing data, design system, copy voice, acceptance criteria)
2. It reads both reference mockups (wild.html and extreme.html)
3. It reads the design decisions doc (color rationale, typography choices, anti-patterns)
4. It builds all 6 HTML pages + CSS + JS as static files
5. It commits each page separately with clean human-written commit messages

## What It Does NOT Do

- Does not use Opus (sonnet model for cheap execution)
- Does not use any framework (Astro, React, Next.js) — pure static HTML/CSS/JS
- Does not create a single-page site
- Does not reference AI in any code or commits
- Does not require a logo image

## After Build: Product Verification

Once Claude Code completes, verify:
1. All 6 pages render in browser
2. Navigation links between pages work
3. servers.html looks distinctly different (EXTREME aesthetic)
4. Pricing matches BUILD-SPEC.md exactly
5. Mobile responsive at all breakpoints
6. No CDN dependencies remain
7. Self-hosted fonts load correctly
8. Design Bridge section present on all pages
9. ICANN disclosure in every footer
10. "Talk to a Human" links work