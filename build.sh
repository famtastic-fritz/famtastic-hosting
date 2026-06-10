#!/bin/bash
# FAMtasticHosting.com Build — Multi-Swarm Executor
# Runs Claude Code with agent teams to build all 6 pages autonomously
# Model: sonnet (no opus) per Fritz directive

set -e

REPO_DIR="$HOME/famtastic/famtastic-hosting"
SPEC="$REPO_DIR/BUILD-SPEC.md"
WILD_REF="$REPO_DIR/wild-reference.html"
EXTREME_REF="$REPO_DIR/extreme-reference.html"
DESIGN_DEC="$REPO_DIR/DESIGN-DECISIONS.md"

echo "=== FAMtasticHosting.com Multi-Swarm Build ==="
echo "Repo: $REPO_DIR"
echo "Spec: $SPEC"
echo "Model: sonnet (cheap, no opus)"
echo ""

cd "$REPO_DIR"

# Launch Claude Code with the full build spec as the prompt
# Agent Teams mode is enabled via CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
claude --model sonnet \
  --allowedTools "Edit,Write,Bash,Read,MCP" \
  -p "
You are building FAMtasticHosting.com — a multi-page static website for a premium hosting brand.

READ THE BUILD SPEC FIRST: $SPEC

That spec contains everything — page structure, design system, pricing data, copy voice, acceptance criteria, file layout, technical requirements.

READ THE REFERENCE MOCKUPS:
- $WILD_REF (primary template — most pages)
- $EXTREME_REF (servers page ONLY)

READ THE DESIGN DECISIONS:
- $DESIGN_DEC (design rationale, typography, color choices, anti-patterns)

CRITICAL RULES:
1. This is a MULTI-PAGE site. SIX separate HTML files. NOT a single-page site.
2. Homepage (index.html) is a PRODUCT PREVIEW hub with cards linking to each category page.
3. servers.html uses the EXTREME template aesthetic (terminal green, Share Tech Mono, CRT effects, dark hacker vibe)
4. ALL other pages use the WILD template aesthetic (violet/lime, Space Grotesk, perspective grid, glassmorphism)
5. Every page has: shared nav, shared footer, Design Bridge section, real final copy, real pricing
6. No placeholder content. No 'Lorem ipsum'. No 'Coming soon'.
7. No logo image — use text wordmark only (Space Grotesk 'FAMtasticHosting' or 'FAMtastic Hosting')
8. Self-host all fonts. Remove all CDN dependencies from mockup code.
9. Extract Tailwind utility classes into proper CSS with variables.
10. Mobile responsive at 320px, 768px, 1024px, 1440px.
11. No AI references anywhere — in code, comments, or commit messages.

BUILD ALL 6 PAGES:
1. index.html — Homepage (WILD)
2. wordpress.html — Managed WordPress (WILD)
3. hosting.html — cPanel Hosting (WILD)
4. servers.html — Dedicated Resources (EXTREME)
5. domains.html — Domains + Email + SSL (WILD, lighter)
6. bundles.html — Pre-Built Combos (WILD)

After building all pages, commit each page separately with clean commit messages, then a final commit for the complete site.

The target directory is: $REPO_DIR

Build it."