---
name: slideck-html
description: Use when creating or editing stable single-file HTML slide decks (weekly reporting, internal presentations) with the frozen 1920x1080 slideck template system — designs, themes, motions, 12 layouts, node build
---

# slideck-html

Single-file HTML deck framework. Frozen shell + designs, per-slide files, `node build.js` (stdlib only, zero dependency).

## Overview

Frozen `template.html` + `designs/` + `build.js`; you edit only `slides/*.html` + `deck.json`. The build assembles one self-contained `dist/<output>.html` with fonts inlined.

Four dimensions kept separate:

- **design** — shape, spacing, typography treatment (`designs/<name>/components.css`)
- **theme** — color + font tokens (`themes/*.css`)
- **layout** — 12 patterns (`templates/*.html`), shared across designs
- **content** — `slides/*.html`

Stage is fixed **1920×1080**, scaled as a whole to the viewport (letterboxed, never reflowed).

## When to use

- Weekly report / internal presentation decks as a single HTML file
- Reusing an existing deck's structure for a new one
- Output must work offline (fonts embedded) and open by double-click

When NOT to use: markdown-driven developer decks (`slidev`), native `.pptx` binaries (`pptx`), one-off freeform HTML with style exploration (`frontend-slides`).

## Quickstart

```bash
git clone https://github.com/mahdyarief/slideck-html.git
cd slideck-html
node build.js            # → dist/contoh-deck.html
```

New deck:

1. edit `deck.json` — `title`, `footer`, `output`, `design`, `theme`, `motion`
2. copy `templates/<n>-*.html` → `slides/NN-name.html`, replace `[...]` only, keep classes
3. `node build.js` → `dist/<output>.html`, open in browser, arrow through every slide

## Install as AI skill

```bash
mkdir -p ~/.openclaude/skills/slideck-html
cp -r skill/SKILL.md template.html build.js designs themes motions templates assets ~/.openclaude/skills/slideck-html/
```

## Files

```
template.html   FROZEN shell — {{TITLE}} {{FONTS}} {{COMPONENTS}} {{SLIDES}} + nav JS
build.js        FROZEN — assembles output, validates placeholders, writes FROZEN.json lock
designs/        FROZEN — default, editorial, brutalist, geometric, architectural, ribbon
deck.json       EDIT — title, footer, output, design, theme, motion
themes/         FROZEN — navy, paper, botanical, swiss, neon (only :root color+font tokens)
motions/        FROZEN — corporate, cinematic, playful (only .reveal timing)
templates/      FROZEN — 12 copy-paste layouts with [...] placeholders, shared across designs
slides/         EDIT — your content
assets/fonts/   FROZEN — woff2 + fonts.json (navy fonts, base64-inlined at build)
dist/           OUTPUT — never edit
```

## Designs (`deck.json` `"design"`)

| Design | Shape | Layout set |
|---|---|---|
| default (default) | rounded cards, soft shadow, teal accent | shared 12 |
| editorial | sharp corners, hairline rules, serif headings, no shadow | shared 12 |
| brutalist | thick ink borders, hard offset shadow, mono labels, uppercase | shared 12 |
| geometric | orbital circles, asymmetric corners, layered modular planes | shared 12 |
| architectural | perimeter frames, side rail, indexed drafting modules | shared 12 |
| ribbon | diagonal bands, angled edges, cinematic directional hierarchy | shared 12 |

A design owns shape, spacing, and typography treatment, and styles only through the shared token names — never a raw hex. That is what lets any design work with any theme. To add one, write `designs/<name>/components.css` + `design.json`, then re-freeze with `node build.js --lock`.

## Themes (`deck.json` `"theme"`)

| Theme | Look | Font |
|---|---|---|
| navy (default) | deep navy + teal | Plus Jakarta Sans / Source Serif 4 — inlined base64, works offline |
| paper | warm off-white, ink | system stack |
| botanical | dark green-black | system stack |
| swiss | high-contrast minimal | system stack |
| neon | dark blue-black | system stack |

## Motions (`deck.json` `"motion"`)

| Motion | Feel |
|---|---|
| corporate (default) | 300 ms, subtle rise |
| cinematic | 1 s fade + scale |
| playful | 550 ms spring |

Wrong theme or motion name → build warns and falls back to the default. Wrong design name → build stops.

## Templates (copy to `slides/`)

01 cover-split-kpi · 02 title-cards-3 · 03 compare-2col · 04 table-detail · 05 mapping-2col · 06 scope-4box · 07 stat-full-navy · 08 rows-list · 09 blocker-2col · 10 quote-closing · 11 timeline · 12 checklist

## Rules

- Edit only `slides/*.html` + `deck.json`. Never edit frozen files (`template.html`, `build.js`, `designs/`, `themes/`, `motions/`, `templates/`, `assets/`).
- Keep every class on every element; replace only `[...]` placeholder text.
- `{{N}}` / `{{TOTAL}}` are replaced with slide numbers. `[Footer kiri]` comes from `deck.footer`.
- To keep a file in `slides/` without rendering it, prefix the name with `_` (build skips those).
- Tables max 7 rows per slide — split overflow into a continuation slide.
- No responsive breakpoints inside slides; the stage scales as a unit.
- Text on `--navy` must use `var(--on-navy)` / `var(--on-navy-mut)`. Body text on light surfaces uses `var(--ink)`. Never hardcode a hex color.
- `prefers-reduced-motion` and print (`@media print`, one slide per page) are handled by the frozen shell.

## Verification

`node build.js` prints design, theme, motion, slide count, font mode (inline/system) and output path. It warns on leftover `{{...}}`, unfilled `[...]`, and any frozen file whose hash differs from `FROZEN.json`. Regenerate the lock deliberately with `node build.js --lock`.

## Common mistakes

| Mistake | Fix |
|---|---|
| Editing `template.html` / `designs/` | Edit `slides/` only — frozen files are shared |
| Hardcoding `#fff` on a navy slide | Use `var(--on-navy)` |
| Using `var(--navy)` as text on a light card | Use `var(--ink)` |
| Theme/motion name typo | Build warns and falls back — check `themes/` and `motions/` |
| Shipping with `[Judul]` placeholders | Replace every `[...]` before building |
| 8+ table rows on one slide | Split into continuation slides |
