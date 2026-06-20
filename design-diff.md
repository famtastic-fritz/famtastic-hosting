# FAMtastic Hosting — Design Diff: Purple vs Hacker Theme

## Executive Summary

The Astro site has two completely different visual designs that share the same HTML structure but use entirely different CSS rules, fonts, colors, and effects. The theme system must toggle between them by swapping CSS variables and conditional overrides, while keeping the same DOM structure.

---

## 1. Layout Structure Differences

### Purple (WildLayout)
```
<html>
  <body style="background:var(--pitch);color:var(--text);font-family:var(--font-body);">
    <ThemeToggle />
    <Nav />              <!-- .fam-nav -->
    <main><slot /></main>
    <Footer />           <!-- .fam-footer -->
  </body>
</html>
```

### Hacker (ExtremeLayout)
```
<html>
  <body>                <!-- styled by extreme.css: black bg, green text, Share Tech Mono -->
    <ThemeToggle />
    <div class="crt-scanlines"></div>
    <div class="blend-overlay"></div>
    <nav class="nav-bar"> <!-- INLINE nav, not a component -->
      <div class="nav-logo" data-text="FAMtastic_Hosting">...</div>
      <ul class="nav-links">...</ul>
      <a href="/contact" class="btn-primary">...</a>
    </nav>
    <main><slot /></main>
    <footer class="ext-footer">...</footer>  <!-- INLINE footer -->
  </body>
</html>
```

**Key difference:** Hacker layout has CRT scanlines, blend overlay, and an INLINE nav/footer. Purple uses Astro components (`Nav.astro`, `Footer.astro`).

---

## 2. CSS Imports

| Layout | CSS Files |
|--------|-----------|
| Purple | `global.css` → `wild.css` → `components.css` |
| Hacker | `global.css` → `extreme.css` → `wild.css` → `components.css` |

**Note:** Hacker loads `extreme.css` BEFORE `wild.css`, but `extreme.css` has many global rules (body, a, ::selection) that override `wild.css` and `global.css`.

---

## 3. Typography

| Element | Purple | Hacker |
|---------|--------|--------|
| Display font | `Space Grotesk` (sans-serif) | `Space Grotesk` (used for buttons) |
| Body font | `Lora` (serif) | `Share Tech Mono` (monospace) |
| Mono font | `JetBrains Mono` | `Share Tech Mono` |
| Nav links | `JetBrains Mono`, uppercase, 0.75rem | `Share Tech Mono`, lowercase with `./` prefix, 0.8rem |
| Hero headline | `Space Grotesk`, clamp(2.8rem, 6.5vw, 5.5rem) | `Share Tech Mono`, clamp(1.8rem, 5vw, 4.2rem), green glow text-shadow |
| Buttons | `JetBrains Mono`, uppercase, rounded rectangles | `Space Grotesk`, clipped polygon corners, green bg |

---

## 4. Color Palette

| Token | Purple | Hacker |
|-------|--------|--------|
| Background | `#080808` (var(--pitch)) | `#000000` (var(--black)) |
| Surface | `#111114` | `#060a10` (var(--void)) |
| Primary accent | `#7c3aed` (violet) | `#00ff41` (neon green) |
| Secondary accent | `#84cc16` (lime) | `#00a829` (green-dim) |
| Text | `#f5f5f0` (off-white) | `#00ff41` (green) |
| Muted | `#9090a0` | `rgba(0,255,65,0.5)` |
| Selection bg | `#7c3aed` | `#00ff41` |
| Selection text | `#fff` | `#000` |
| Borders | `#2a2a38` | `rgba(0,255,65,0.15)` |
| Hot accent | `#ff007a` (pink) | `#ff007a` (same) |

---

## 5. Navigation

| Feature | Purple | Hacker |
|---------|--------|--------|
| Position | Fixed, top 0 | Fixed, top 0 |
| Background | `rgba(8,8,8,0.85)` + blur | `rgba(0,0,0,0.92)` + blur |
| Border | `1px solid rgba(124,58,237,0.2)` | `1px solid rgba(0,255,65,0.2)` |
| Logo | `FAM` (violet) + `tastic` (white) + ` Hosting` (lime) | `FAMtastic` (green) + `_Hosting` (dim green) |
| Links style | `WordPress`, `Hosting`, etc. — uppercase | `./wordpress`, `./hosting`, etc. — lowercase with `./` prefix |
| CTA button | Purple bg, white text, rounded | Green bg, black text, clipped polygon corners |
| Cart button | Present (Svelte component) | NOT present |
| Sign In link | Present | NOT present |
| Mobile menu | Hamburger button | NOT present |
| Logo hover | No effect | RGB glitch effect (red/cyan split) |

---

## 6. Hero Section

| Feature | Purple | Hacker |
|---------|--------|--------|
| Background | `var(--pitch)` solid | Radial gradient `#080808` → `#000000` |
| FX layer | SVG perspective grid (violet lines), floating orbs | `#matrixRain` div with animated falling characters |
| Character layer | SVG orbital ring with dots | Giant "SRV" text at 4% opacity |
| Content prompt | `// famtastichosting.com` + blinking cursor | Terminal boot sequence: `$ famtastic-hosting --type=server --status` |
| Typewriter effect | None | Status lines with OK/ALLOCATED colored text |
| Headline | "Your domain.<br/>Your brand.<br/><span class='hl-invisible'>Handled.</span>" | "Dedicated<br/>resources.<br/><span>No sharing.</span>" |
| Subheadline | Serif body text, 0.85rem | Mono text, 1rem, green-dim |
| CTA buttons | Rounded, purple + outline | Clipped polygon, green + green border |

---

## 7. Overlays & Effects

| Effect | Purple | Hacker |
|--------|--------|--------|
| CRT scanlines | None | Fixed overlay with repeating green gradient, scrolls infinitely |
| Grain noise | None | Fixed SVG noise overlay at 5.5% opacity, mix-blend-mode: overlay |
| Blend overlay | None | Radial gradient glow spots (green + blue) at 4% opacity |
| Body transform | None | `perspective(1200px) rotateX(0.3deg)` |
| CRT flicker | None | Body opacity flickers 97-99% every 12s |
| Scrollbar | Default | Green glowing thumb, black track |
| Selection | Violet bg, white text | Green bg, black text |
| Link hover | Color change | Color change (green-dim → green) |

---

## 8. Footer

| Feature | Purple | Hacker |
|---------|--------|--------|
| Background | `var(--pitch)` | `var(--black)` |
| Border | `1px solid rgba(245,245,240,0.05)` | `1px solid rgba(0,255,65,0.15)` |
| Logo | Present with colored spans | Not present (just text) |
| Copy text | "Premium hosting... Miami, FL" | "All systems operational." |
| Links | Uppercase, spaced | Lowercase with `./` prefix |
| Domain notice | Small text | Small text (green-dim) |
| Copyright | `© YEAR FAMtastic. All rights reserved.` | `© YEAR FAMtastic Hosting — All systems operational.` |

---

## 9. Shared Components

Both layouts include:
- `ThemeToggle.astro` (same component, styled differently per theme)
- FAQ accordion script
- Smooth scroll for anchor links

---

## 10. CSS Specificity Challenges

**Problem:** `extreme.css` sets many GLOBAL rules:
- `body { background-color: var(--black); color: var(--green); font-family: var(--font-term); }`
- `a { color: inherit; text-decoration: none; }`
- `::selection { background: var(--green); color: var(--black); }`
- `::-webkit-scrollbar-thumb { background: var(--green-dim); }`

These will override purple styles when both CSS files are loaded.

**Solution:** `theme-core.css` must be loaded LAST and use higher-specificity selectors to reset these for purple mode:
```css
html:not([data-theme="hacker"]) body { background: var(--pitch); color: var(--text); font-family: var(--font-body); }
html[data-theme="hacker"] body { /* preserve extreme.css styles */ }
```

---

## 11. Pages Affected

| Page | Current Layout | Action |
|------|---------------|--------|
| `/` (index) | WildLayout | → UnifiedLayout |
| `/wordpress` | WildLayout | → UnifiedLayout |
| `/hosting` | WildLayout | → UnifiedLayout |
| `/builder` | WildLayout | → UnifiedLayout |
| `/servers` | ExtremeLayout | → UnifiedLayout (defaultTheme="hacker") |
| `/domains` | WildLayout | → UnifiedLayout |
| `/bundles` | WildLayout | → UnifiedLayout |
| `/contact` | WildLayout | → UnifiedLayout |
| `/checkout` | WildLayout | → UnifiedLayout |
| `/order-confirmation` | WildLayout | → UnifiedLayout |
| `/thank-you` | WildLayout | → UnifiedLayout |

---

## 12. Implementation Strategy

1. **UnifiedLayout.astro** includes both nav structures (purple + hacker) and both footers, toggled with `.purple-only` / `.hacker-only` classes
2. **theme-core.css** is loaded last, with `[data-theme="hacker"]` overrides and `html:not([data-theme="hacker"])` resets
3. Both `wild.css` and `extreme.css` are loaded as-is (no modifications)
4. The ThemeToggle component works the same way
5. localStorage persistence is preserved

