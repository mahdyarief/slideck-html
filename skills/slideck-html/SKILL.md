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

**Framework root.** The framework files (`template.html`, `build.js`, `pdf.js`, `designs/`, `themes/`, `motions/`, `templates/`, `assets/`) sit together in one directory — resolve it by locating `build.js`. Installed as a plugin it is `${CLAUDE_PLUGIN_ROOT}`; after a manual copy it is the directory holding this `SKILL.md`. Run the tools from there, pointing `--root` at the deck folder.

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
4. `node pdf.js` → `dist/<output>.pdf`, one slide per page

## Install as AI skill

Install from the marketplace (auto-updates with the repo):

```
/plugin marketplace add mahdyarief/slideck-html
/plugin install slideck-html@slideck-html
```

Or copy manually (a static snapshot — re-copy to update):

```bash
mkdir -p ~/.openclaude/skills/slideck-html
cp -r skills/slideck-html/SKILL.md template.html build.js pdf.js designs themes motions templates assets ~/.openclaude/skills/slideck-html/
```

## Files

```
template.html   FROZEN shell — {{TITLE}} {{FONTS}} {{COMPONENTS}} {{SLIDES}} + nav JS
build.js        FROZEN — assembles output, validates placeholders, writes FROZEN.json lock
pdf.js          TOOL — dist/<output>.html → dist/<output>.pdf, one slide per page
designs/        FROZEN — default, editorial, brutalist, geometric, architectural, ribbon, plate, campus, keynote, colloquium, lesson, spotlight, dark-academia
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
| geometric | flat colour planes, full-height edge spine, no outlines or shadows, uppercase | shared 12 |
| architectural | centred axis, hairline measure lines, micro labels, no fills, wide white space | shared 12 |
| ribbon | dark navy canvas, light data panels, accent bands top and bottom | shared 12 |
| plate | closed ink frame, corner ticks, outlined cards with auto numerals, no fills | shared 12 |
| campus | ruled-paper lines, left margin rule, dashed dividers, square checkboxes, module chips | shared 12 |
| keynote | dark canvas, oversized display type, inverted lower-third band, single accent, no panels | shared 12 |
| colloquium | left folio gutter, running-head rule, serif body text, booktabs tables, folio | shared 12 |
| lesson | dot-grid background, vertical connector, numbered steps, multi-accent pills, timeline connector | shared 12 |
| spotlight | centered focus area with dimmed surroundings, radial glow, spotlight cards, centered layout | shared 12 |
| dark-academia | navy canvas, serif display, ornamental border, earthy accents, double-rule tables | shared 12 |

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

## PDF export

```bash
node build.js        # first: dist/<output>.html
node pdf.js          # then: dist/<output>.pdf — one slide per page, 1920×1080
```

`pdf.js` drives a locally installed Chromium/Chrome/Edge (`--headless=new --print-to-pdf`) and uses the shell's print stylesheet, so pages come out exactly stage-sized with one slide each, no header or footer. Flags: `--root <dir>` (deck elsewhere), `--html <file.html>` (print any built deck directly), `--out <file.pdf>`, and `CHROME_PATH=<exe>` to pin the browser. It prints `slides=N | halaman PDF=N | ukuran halaman=WxH pt` and exits non-zero if the page count does not match the slide count.

## Rules

- Edit only `slides/*.html` + `deck.json`. Never edit frozen files (`template.html`, `build.js`, `designs/`, `themes/`, `motions/`, `templates/`, `assets/`).
- Keep every class on every element; replace only `[...]` placeholder text.
- `{{N}}` / `{{TOTAL}}` are replaced with slide numbers. `[Footer kiri]` comes from `deck.footer`.
- To keep a file in `slides/` without rendering it, prefix the name with `_` (build skips those).
- Tables max 7 rows per slide — split overflow into a continuation slide.
- No responsive breakpoints inside slides; the stage scales as a unit.
- Text on `--navy` must use `var(--on-navy)` / `var(--on-navy-mut)`. Body text on light surfaces uses `var(--ink)`. Never hardcode a hex color.
- `prefers-reduced-motion` and print (`@media print`, one slide per page) are handled by the frozen shell. Use `node pdf.js` to capture that print layout as a PDF.

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
