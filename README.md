# slideck-html

Stable single-file HTML slide decks. Frozen template + per-slide files + `node build.js` (stdlib only, zero dependency).

Stage fixed **1920×1080**, scaled to viewport. Four dimensions separated: **design** (shape + typography treatment) × **theme** (color + font) × **layout** (12 templates) × **content** (`slides/`).

Output is one self-contained `.html` with fonts inlined base64 — works offline, opens by double-click, prints one slide per page. A built-in **theme switcher** (top-right) swaps the palette live without rebuilding, and per-slide **speaker notes** (`data-notes`) print as their own pages in the PDF.

```bash
npm install -g slideck-html     # then: slideck init my-deck
```

## What's new in 2.1

- **Concept diagrams:** `<diagram type="venn|matrix|cycle|funnel|pyramid|scale">`, drawn as SVG at build time and coloured by the theme.
- **Icons:** 46 built-in line icons, `<icon name="target">` or `<icon name="shield" badge>`.
- **Layout blocks** that work in every design: numbered or icon rows (`.rows`), highlight one item (`.is-key`), before/after bands, hero number + list, callouts, labelled boxes, chips, source lines.
- **New layout** `content-aside`: content on the left, a dark panel for the decision on the right.
- **New design** `lineart`: blueprint line art with outline boxes, hairline dividers and one accent highlight per slide.

See them all in `examples/components/` and the recipes in [docs/slide-craft.md](docs/slide-craft.md). Upgrade with `npm install -g slideck-html@latest`.

## Preview

Same slides and theme, seventeen designs:

| default | editorial | brutalist |
|---|---|---|
| ![default](assets/preview/design-default.png) | ![editorial](assets/preview/design-editorial.png) | ![brutalist](assets/preview/design-brutalist.png) |

| geometric | architectural | ribbon |
|---|---|---|
| ![geometric](assets/preview/design-geometric.png) | ![architectural](assets/preview/design-architectural.png) | ![ribbon](assets/preview/design-ribbon.png) |

| plate | campus | keynote |
|---|---|---|
| ![plate](assets/preview/design-plate.png) | ![campus](assets/preview/design-campus.png) | ![keynote](assets/preview/design-keynote.png) |

| colloquium | lesson | spotlight |
|---|---|---|
| ![colloquium](assets/preview/design-colloquium.png) | ![lesson](assets/preview/design-lesson.png) | ![spotlight](assets/preview/design-spotlight.png) |

| dark-academia | consulting | scholar |
|---|---|---|
| ![dark-academia](assets/preview/design-dark-academia.png) | ![consulting](assets/preview/design-consulting.png) | ![scholar](assets/preview/design-scholar.png) |

| organic | minimal | |
|---|---|---|
| ![organic](assets/preview/design-organic.png) | ![minimal](assets/preview/design-minimal.png) | |

Same design, nine themes:

| navy (default) | paper | botanical |
|---|---|---|
| ![navy](assets/preview/deck-navy.png) | ![paper](assets/preview/deck-paper.png) | ![botanical](assets/preview/deck-botanical.png) |

| swiss | neon | slate-rust |
|---|---|---|
| ![swiss](assets/preview/deck-swiss.png) | ![neon](assets/preview/deck-neon.png) | ![slate-rust](assets/preview/deck-slate-rust.png) |

| petrol-gold | terracotta | parchment-gold |
|---|---|---|
| ![petrol-gold](assets/preview/deck-petrol-gold.png) | ![terracotta](assets/preview/deck-terracotta.png) | ![parchment-gold](assets/preview/deck-parchment-gold.png) |

## For AI agents: read this first

If you were given this repo URL and asked to make slides, do exactly this:

1. **Read** `AGENTS.md` (rules), then `skills/slideck-html/SKILL.md` (workflow + designs + themes + motions + templates).
2. **Never edit** the framework (`template.html`, `core.css`, the root `*.js` tools, `lib/`, `layouts/`, `designs/`, `themes/`, `motions/`, `templates/`, `assets/`). Edit only `slides/*.html` + `deck.json`.
3. **New deck:** write `slides/NN-name.html` as `<slide layout="…">` with `<ph>` placeholders, or copy `templates/<n>-*.html` and replace `[...]` placeholders only, keeping classes. Use `<chart>`, `<shape>`, `<connector>` and `<pre class="mermaid">` for visuals.
4. **Build:** `node build.js` → `dist/<output>.html`. Open in browser to verify. Add `node pdf.js` for a PDF, one slide per page.
5. **Tables max 7 rows** per slide — overflow goes to a continuation slide.
6. **Never hardcode a hex color.** Text on `--navy` uses `var(--on-navy)`; body text on light surfaces uses `var(--ink)`.

## Quickstart

Requirements: Node.js 18+. Chrome, Edge or Chromium for PDF, PPTX export and `check` (set `CHROME_PATH` if it isn't found). Zero dependencies: Node stdlib only.

### Install from npm (recommended)

[![npm](https://img.shields.io/npm/v/slideck-html)](https://www.npmjs.com/package/slideck-html)

**Option A: install once, use everywhere.** This gives you the `slideck` command.

```bash
npm install -g slideck-html
slideck --version
```

**Option B: no install.** Run the latest version on demand with `npx`:

```bash
npx slideck-html init my-deck
cd my-deck
npx slideck-html build
```

**Option C: per project.** Pin the version in your project's `package.json`:

```bash
npm install --save-dev slideck-html
npx slideck build                # or add "slides": "slideck build && slideck pdf" to your scripts
```

The package has no dependencies; everything runs on Node's standard library. Update with `npm update -g slideck-html` (or `npm install -g slideck-html@latest`), and remove with `npm uninstall -g slideck-html`.

**Your first deck:**

```bash
slideck init my-deck && cd my-deck   # deck.json + slides/ + .gitignore
slideck list                         # pick a design and theme, set them in deck.json
slideck build                        # → dist/deck.html (one self-contained file)
slideck check                        # overflow + visual check
slideck pdf                          # → dist/deck.pdf, one slide per page
slideck pptx                         # → dist/deck.pptx, editable in PowerPoint
```

Windows PowerShell: if `slideck` is blocked by the script policy, use `slideck.cmd` or `npx slideck-html …`.

| Command | Does |
|---|---|
| `slideck init [dir]` | new deck: `deck.json` + two sample slides + `.gitignore` |
| `slideck build` | `slides/*.html` → `dist/<output>.html` |
| `slideck pdf` / `slideck pptx` | export the built deck |
| `slideck import talk.pptx` | PowerPoint → `slides/*.html` in slideck layouts |
| `slideck check [--update] [--no-shot]` | overflow report + pixel regression |
| `slideck new-design <name> [--from <design>]` | start a custom design in `designs/<name>/` |
| `slideck new-theme <name> [--from <theme>]` | start a custom theme in `themes/<name>.css` |
| `slideck lint [--all]` | check custom designs and themes against the rules |
| `slideck list` | built-in and deck-local designs, themes, motions |
| `slideck path` | where the package is installed (templates, docs) |

Every command works on the current folder, or on `--root <dir>`.

### From a clone

```bash
git clone https://github.com/mahdyarief/slideck-html.git
cd slideck-html
node build.js            # builds dist/contoh-deck.html from slides/
node pdf.js              # builds dist/contoh-deck.pdf, one slide per page
node bin/slideck.js --help
```

### Your own deck, in its own folder (without npm)

The tools live in the repo; your deck can live anywhere. Each tool takes its deck folder from `--root <dir>`, otherwise from the current folder when it contains a `deck.json`, otherwise the repo's sample deck.

```bash
mkdir my-deck && cd my-deck
cp /path/to/slideck-html/deck.json .      # edit title, footer, output, design, theme, motion
mkdir slides                              # write slides/01-cover.html, 02-….html (see "Slides")
node /path/to/slideck-html/build.js       # → my-deck/dist/<output>.html
node /path/to/slideck-html/pdf.js         # → my-deck/dist/<output>.pdf
node /path/to/slideck-html/pptx.js        # → my-deck/dist/<output>.pptx
node /path/to/slideck-html/check.js       # overflow + pixel check
node /path/to/slideck-html/import.js talk.pptx   # .pptx → my-deck/slides/
```

## Use as a Claude Code plugin

slideck-html ships as a plugin (`.claude-plugin/`) holding one skill, `slideck-html`. Once it's installed, ask for slides in plain words, e.g. *"make a 10-slide deck about our Q3 results, consulting design, slate-rust theme, and export a PDF"*. The agent loads the skill, writes `deck.json` + `slides/` in **your current project folder**, and runs the tools from the plugin folder. Your deck never goes into the plugin folder, so plugin updates can't overwrite it.

Tip: also running `npm install -g slideck-html` lets the agent use the short `slideck <command>` form. Without it, the agent calls the tools from the plugin folder; both work.

### Option 1: plugin marketplace (recommended, updates with the repo)

In Claude Code:

```
/plugin marketplace add mahdyarief/slideck-html
/plugin install slideck-html@mahdyarief
```

Restart the session if the skill doesn't appear. Update later with `/plugin marketplace update mahdyarief`, remove with `/plugin uninstall slideck-html@mahdyarief`.

From a local clone instead of GitHub (handy while editing the framework):

```
/plugin marketplace add /path/to/slideck-html
/plugin install slideck-html@mahdyarief
```

Or load it for one session without installing: `claude --plugin-dir /path/to/slideck-html`.

### Option 2: personal skill folder (without the plugin system)

Clone the whole repo into your Claude Code skills folder and put `SKILL.md` at its top level. The skill needs all the tools and assets, not just `SKILL.md`.

```bash
git clone https://github.com/mahdyarief/slideck-html.git ~/.claude/skills/slideck-html
cp ~/.claude/skills/slideck-html/skills/slideck-html/SKILL.md ~/.claude/skills/slideck-html/SKILL.md
```

Update with `git pull` in that folder, then repeat the `cp`. Here `${CLAUDE_PLUGIN_ROOT}` in `SKILL.md` isn't substituted; the skill tells the agent to use the skill folder instead.

### Option 3: any other AI agent

Give the agent this repo URL. It reads `AGENTS.md` and then `skills/slideck-html/SKILL.md` (see below).

## Layout

```
.claude-plugin/    plugin + marketplace manifest (marketplace.json, plugin.json)
package.json       npm package (bin: slideck) — no dependencies
bin/slideck.js     FROZEN: CLI (init · build · pdf · pptx · import · check · new-design · new-theme · lint · list)
docs/              custom-design.md — rules and guide for your own designs and themes
template.html      FROZEN shell ({{TITLE}} {{FONTS}} {{COMPONENTS}} {{SLIDES}} + nav, autofit, connector JS)
core.css           FROZEN: shared components for every design (placeholders, lists, chart, shape, flow)
build.js           FROZEN: slides/*.html → dist/<output>.html; expands <slide>, <chart>, <shape>, mermaid
lib/               FROZEN: layout · chart · shape · flow (Mermaid) · browser · ooxml · zip · xml · pptx-read · font · design-lint
layouts/           FROZEN: 9 placeholder layouts for <slide layout="…">
pdf.js             TOOL: dist/<output>.html → dist/<output>.pdf, one slide per page
pptx.js            TOOL: dist/<output>.html → dist/<output>.pptx, editable objects
import.js          TOOL: .pptx → slides/*.html in slideck layouts
check.js           TOOL: overflow report + pixel regression against a baseline
designs/           FROZEN: default · editorial · brutalist · geometric · architectural · ribbon · plate ·
                   campus · keynote · colloquium · lesson · spotlight · dark-academia ·
                   consulting · scholar · organic · minimal · campus-slide · lineart   (components.css + design.json each)
deck.json          EDIT: title, footer, output, design, theme, motion, fonts
themes/            navy (default) · paper · botanical · swiss · neon · slate-rust ·
                   petrol-gold · terracotta · parchment-gold · campus-slide   (:root color+font only)
motions/           corporate (default) · cinematic · playful           (.reveal timing only)
templates/         12 copy-paste layouts with [...] placeholders
slides/            YOUR content (only dir you + AI edit)
assets/fonts/      WOFF 1.0 (OFL) + fonts.json per theme — base64-inlined at build, embedded into .pptx by pptx.js
dist/              build output (gitignored, never edit)
FROZEN.json        hash lock of frozen files (see below)
skills/slideck-html/SKILL.md   agent skill file
LICENSE            MIT
```

## Designs, themes, motions

`deck.json`:

```json
{
  "title": "Contoh Deck — slideck-html",
  "footer": "Contoh Deck | Cutoff —",
  "output": "contoh-deck.html",
  "design": "default",
  "theme": "navy",
  "motion": "corporate"
}
```

| Design | Shape | Layout set |
|---|---|---|
| `default` | rounded cards, soft shadow, teal accent, roomy spacing | shared 12 |
| `editorial` | sharp corners, hairline rules, serif headings, no shadow | shared 12 |
| `brutalist` | thick ink borders, hard offset shadow, mono labels, uppercase | shared 12 |
| `geometric` | flat colour planes, full-height edge spine, no outlines or shadows, uppercase | shared 12 |
| `architectural` | centred axis, hairline measure lines, micro labels, no fills, wide white space | shared 12 |
| `ribbon` | dark navy canvas, light data panels, accent bands top and bottom | shared 12 |
| `plate` | closed ink frame, corner ticks, outlined cards with auto numerals, no fills | shared 12 |
| `campus` | ruled-paper lines, left margin rule, dashed dividers, square checkboxes, module chips | shared 12 |
| `keynote` | dark canvas, oversized display type, inverted lower-third band, single accent, no panels | shared 12 |
| `colloquium` | left folio gutter, running-head rule, serif body text, booktabs tables, folio | shared 12 |
| `lesson` | dot-grid background, vertical connector, numbered steps, multi-accent pills, timeline connector | shared 12 |
| `spotlight` | centered focus area with dimmed surroundings, radial glow, spotlight cards, centered layout | shared 12 |
| `dark-academia` | navy canvas, serif display, ornamental border, earthy accents, double-rule tables | shared 12 |
| `consulting` | warm grey canvas, elevated white cards with soft shadow, small-caps coloured eyebrows, step indicator | shared 12 |
| `scholar` | serif display headings, circular numbered badges on cards, accent medallions, rounded white cards | shared 12 |
| `organic` | imagery-led cover, soft blob/wave decorations, 01/02/03 list markers, pill cards with circular icons | shared 12 |
| `minimal` | thin large display type, single hairline accent rule under title, booktabs tables, low density | shared 12 |
| `campus-slide` | academic report: letter-spaced kicker, bold accent title, flat panels, dark-header zebra tables, dark Kesimpulan band, full-width accent footer bar, grey cover | shared 12 |
| `lineart` | blueprint line art: 2px outline boxes with sharp corners, hairline column dividers, bold title over a full-width hairline, one accent offset plate per slide, bottom-anchored cover with an accent rule from the left edge | shared 12 |

| Theme | Look | Font |
|---|---|---|
| `navy` (default) | deep navy + teal | Plus Jakarta Sans / Source Serif 4 |
| `paper` | warm off-white, ink | Inter / Gelasio |
| `botanical` | dark green-black | Jost / Crimson Pro |
| `swiss` | high-contrast minimal | Inter |
| `neon` | dark blue-black | Space Grotesk / JetBrains Mono |
| `slate-rust` | dark slate + rust, warm grey canvas | IBM Plex Sans / IBM Plex Serif |
| `petrol-gold` | deep petrol teal + gold | Public Sans / Gelasio |
| `terracotta` | terracotta + light grey, thin display | Work Sans |
| `parchment-gold` | cream canvas + navy + gold | Inter / Libre Baskerville |
| `campus-slide` | white canvas, navy titles, light-blue panels, red footer bar, grey cover | Carlito / Caladea (metric-compatible with Calibri / Cambria) |

**One file, always.** The build output is a single self-contained `.html`. Fonts, CSS, scripts and every local image, video or CSS `url()` referenced by your slides are embedded as `data:` URIs. Put images in your deck folder and reference them relatively (resolved from `slides/`, then the deck folder). Internet URLs are left alone, with a warning, since they break offline use.

Every theme's fonts are bundled (OFL, Latin subset, `assets/fonts/`) and inlined base64 into the deck, so text looks the same on every machine, offline. `deck.json` `"fonts"`: `"theme"` (default, only the deck theme's fonts, ~80–140 KB), `"all"` (every theme's fonts, so the runtime theme switcher also shows real fonts, ~1 MB), `"none"` (system fallback stacks).

| Motion | Feel |
|---|---|
| `corporate` (default) | 300 ms subtle rise |
| `cinematic` | 1 s fade + scale |
| `playful` | 550 ms spring |

The build inlines `designs/<d>/components.css + themes/<t>.css + motions/<m>.css`, in that order. A wrong design name stops the build; a wrong theme or motion name warns and falls back to the default.

### Custom designs and themes

Make your own **in your deck folder**. You don't touch the package, and your design travels with the deck:

```bash
slideck new-design acme --from consulting   # → designs/acme/ (components.css + design.json)
slideck new-theme acme-blue --from navy     # → themes/acme-blue.css (:root tokens only)
# deck.json: "design": "acme", "theme": "acme-blue"
slideck lint && slideck build
```

A deck-local design, theme or motion overrides a built-in one with the same name, and custom themes appear in the theme switcher. Custom fonts go in `<deck>/fonts/` with a `fonts.json`. A theme that names a bundled family (e.g. `'Inter'`) gets that font embedded automatically.

The core rule: **a design owns shape, a theme owns colour.** A design styles only through the shared token names, never a fixed colour, so any design works with any theme. Every build checks a custom design or theme, and a broken rule stops it with a coded message (D1–D9 for designs, T1–T4 for themes): fixed colours, unknown tokens, touching the shell UI or the 1920×1080 stage, network URLs, missing core classes, text under 18px, low theme contrast.

For **what to put on slides and how to make them look premium** (storyline, action titles, density, choosing charts and layouts, copy-paste recipes, the polish loop), see **[docs/slide-craft.md](docs/slide-craft.md)**.

**Full guide: [docs/custom-design.md](docs/custom-design.md)**. It covers the token contract, every rule with its reason, the classes a design must style, `design.json`, fonts and a pre-flight checklist.

## Slides

Copy a layout from `templates/`, keep every class, replace only the `[...]` text:

```bash
cp templates/04-table-detail.html slides/03-progress.html
```

- `{{N}}` / `{{TOTAL}}` → slide numbers, filled automatically.
- `[Footer kiri]` → replaced from `deck.footer`.
- Prefix a filename with `_` (e.g. `_draft.html`) to keep it in `slides/` without rendering it.
- Tables max 7 rows; split overflow into a continuation slide.
- `data-notes="..."` on a `<section class="slide">` adds speaker notes. They're invisible on screen but print as their own page after that slide, so `node pdf.js` ships a presenter copy with notes.

### Publishing a deck as a web page

The landing page at [slideck.nimb.us.ci](https://slideck.nimb.us.ci/) is itself a slideck-html deck (source in `site/`). Optional `deck.json` fields for this:

| Field | Effect |
| --- | --- |
| `lang` | `"id"` (default) or `"en"`: `<html lang>`, on-screen hint and Theme label |
| `scroll` | `"auto"` (default; phones and narrow portrait screens get the slides stacked for vertical scrolling), `"on"`, `"off"` |
| `description`, `url`, `image`, `icon` | page description, canonical URL, share image (og:image) and favicon (inlined) |

- Add `?clean` to the URL to hide the controls, progress bar and theme menu (embeds, screenshots).
- Page blocks: `<a class="btn">` / `<a class="btn ghost">`, `<span class="cmd">` (click to copy its text or `data-copy`), `<pre class="code">`.
- Every output carries the generator identity only in its source: an HTML comment and `<meta name="generator">`, the PDF's Creator/Producer properties, and the .pptx Application property.

## PowerPoint-grade features

Techniques borrowed from how PowerPoint (and the PPTX2HTML converter) work, kept zero-dependency. See `examples/features/` for a deck that uses all of them.

**Placeholder layouts.** Instead of copying a template, a slide can name one of ten layouts in `layouts/` and fill its placeholders by name. Empty placeholders are dropped, and margins come from the active design:

```html
<slide layout="two-content" notes="speaker notes">
<ph name="kicker">Q3 REPORT</ph>
<ph name="title">Target vs actual</ph>
<ph name="left"><ul><li>Level 1<ul><li>Level 2</li></ul></li></ul></ph>
<ph name="right"><chart type="bar">…</chart></ph>
</slide>
```

Layouts: `title`, `section`, `title-content`, `two-content`, `comparison`, `title-only`, `content-caption`, `picture-caption`, `content-aside` (main content + dark panel for the decision), `blank`.

- Add `dark` to the `<slide>` tag for a navy slide.
- `<ph … x y w h>` moves a placeholder to an absolute position.
- Anything written outside `<ph>` is placed on the slide as-is.
- The 12 `templates/` still work unchanged.

**Autofit.** Like PowerPoint's "shrink text on overflow": content that overflows its placeholder, or the slide, is scaled down (text and spacing together) to the largest size that fits, never below 0.55. It recomputes on theme switch and while editing. Turn it off per slide with `fit="off"`.

**Charts.** `<chart type="bar|hbar|line|area|pie|doughnut">` with the data inline is drawn as SVG at build time, coloured by theme tokens:

```html
<chart type="bar" width="1720" height="600" unit="%">
labels: Q1, Q2, Q3, Q4
Target: 70, 80, 85, 95
Actual: 64, 83, 88, 97.3
</chart>
```

Options: `stacked`, `title`, `prefix`, `unit`, `values="off"`, `legend="off"`, `center` (doughnut). The data can also be JSON.

**Shapes and connectors.**
- `<shape type="chevron|arrow|pill|diamond|cylinder|callout|…" w h [x y] [fill] [line]>text</shape>` draws an OOXML preset geometry; the exporter turns it back into a native PowerPoint shape.
- `<connector from="#a" to="#b" type="straight|elbow|curve" [label] [dash]>` is routed at runtime between the real element boxes.

**Mermaid flowcharts.** `<pre class="mermaid">flowchart LR …</pre>` is laid out at build time and drawn as SVG. No mermaid.js, no network. It supports:
- directions TD, LR, BT, RL;
- all node shapes;
- edge labels and solid, dotted, thick and invisible edges;
- chains and `&`, and `subgraph`.

Other Mermaid diagram types are left as text with a build warning.

**Concept diagrams.** `<diagram type="venn|matrix|cycle|funnel|pyramid|scale">` draws the diagrams Mermaid can't, as SVG at build time, one `Title: description` line per item. `key="N"` highlights the item that matters:

```html
<diagram type="matrix" key="2">
Big bets: high impact, high effort
Quick wins: high impact, low effort
Fill-ins: low impact, low effort
Avoid: low impact, high effort
x: Effort
y: Impact
</diagram>
```

**Icons.** `<icon name="target">` or `<icon name="shield" badge tone="navy">` inlines one of 46 built-in line icons (drawn for slideck, no icon font, no network), coloured by the theme.

**Layout blocks** that work in every design: `.rows` (numbered or icon rows), `.is-key` (highlight one card, row, step or chip), `.bands` (before/after), `.hero` (giant number + list), `.with-aside` / layout `content-aside` (content + dark decision panel), `.callout` / `.callout.warn`, `.boxed` (label on the border), `.chips`, `.source`. Syntax in [SKILL.md](skills/slideck-html/SKILL.md) §3, recipes in [docs/slide-craft.md](docs/slide-craft.md) §4, and a live deck in `examples/components/`.

**Dark canvases.** Designs whose slides are navy (keynote, ribbon, dark-academia) are detected automatically, and charts, shapes and diagrams switch to their light-on-dark variants. A design can force this with `"canvas": "dark"|"light"` in `design.json`.

### Import and export PowerPoint

```bash
node import.js deck.pptx --root my-deck              # content → slideck layouts (takes your design/theme)
node pptx.js --root my-deck                          # built deck → editable dist/<output>.pptx
```

- **Import** reads the .pptx with its own zero-dependency parser (`lib/pptx-read.js`).
  - It maps placeholders (with their layout/master inheritance), nested bullets, links, tables, pictures, video/audio, charts, SmartArt text, hidden slides, dark backgrounds and notes onto slideck layouts. Tables over 7 rows split into continuation slides.
  - Not imported: the original look (fonts, colours, geometry), EMF/WMF pictures, and chart types without a slideck equivalent (scatter, radar, combo). The importer lists what it skipped.
- **Export** measures the rendered deck in headless Chrome (the same browser `pdf.js` uses) and writes native, editable PowerPoint objects:
  - text boxes with per-run styling and nested bullets;
  - rectangles, rounded rectangles and borders;
  - real tables;
  - preset shapes for `<shape>`;
  - pictures;
  - speaker notes;
  - a theme built from the deck's colour and font tokens.

  Charts, diagrams, icons, flowcharts and connectors become pictures, with a vector SVG copy for current PowerPoint. Every export re-reads its own package and exits 1 if anything is malformed.
  - The deck's fonts are embedded in the .pptx (`ppt/fonts/*.fntdata`, EOT), taken from the HTML's own `@font-face`, so the file opens with the theme fonts on machines that lack them. `--no-embed-fonts` turns this off. Weight 800 maps to the real ExtraBold face (e.g. "Inter ExtraBold"), not synthetic bold.
  - Fonts are embedded whole and uncompressed (PowerPoint itself writes subset, MicroType-compressed fonts), so each family adds ~30–100 KB.
  - Long paragraphs can wrap one word differently.

### Visual check

```bash
node check.js                # overflow report + pixel diff of every slide against a baseline
node check.js --update       # accept the current look as the new baseline
node check.js --examples     # every examples/html/*.html
```

It reports, per slide:
- the autofit scale applied, warning below 0.75;
- content still overflowing at the minimum scale;
- connectors whose target is missing;
- unrendered components;
- broken images;
- slides whose pixels changed from the baseline (stored in `.slideck-check/`).

It exits 1 on any of these, so it can gate CI.

## Examples

`examples/` ships one demo deck (12 slides = all 12 layouts) rendered across several design × theme combinations, so you can see the range before committing to a look.

```bash
node examples/build-all.js      # builds every example into examples/html/
```

Browse `examples/html/*.html` directly — no server needed. Add a combination by creating `examples/<name>/deck.json` with `"slides": "../slides"`; see `examples/README.md`.

## Verify

```bash
node build.js
```

Prints version, design, theme, motion, slide count, font mode (inline/system), output size, and output path. It warns about:

- leftover `{{...}}` placeholders,
- unfilled `[...]` placeholders,
- `<img>` without `alt` (accessibility),
- frozen files whose hash differs from `FROZEN.json`.

Then run `node check.js` for the overflow report and pixel diff, and open `dist/<output>.html` (append `#N` to jump to slide N) to look through the slides.

## PDF export

```bash
node build.js        # first: dist/<output>.html
node pdf.js          # then: dist/<output>.pdf — one slide per page, 1920×1080
```

`pdf.js` drives a locally installed Chromium/Chrome/Edge (`--headless=new --print-to-pdf`) and prints through the shell's existing `@media print` rules, so every page is exactly stage-sized with one slide each and no header or footer. Options: `--root <dir>` (deck in another folder), `--html <file.html>` (print any built deck directly), `--out <file.pdf>`, and `CHROME_PATH=<exe>` to pin a specific browser. It reports `slides=N | halaman PDF=N | ukuran halaman=WxH pt` and exits non-zero if the page count does not match the slide count, so a broken export is visible.

## Frozen-file lock

`FROZEN.json` stores a short sha256 of `template.html`, `core.css`, the root tools (`build.js`, `pdf.js`, `pptx.js`, `import.js`, `check.js`), and every file under `lib/`, `layouts/`, `designs/`, `themes/`, and `motions/`. If one of them changes, the next build warns — so accidental edits to shared files are visible. If you *intentionally* changed a frozen file, regenerate the lock:

```bash
node build.js --lock
```

## Navigation and output

- Arrow keys / Space / PageUp-PageDown move between slides; `Home`/`End` jump to first/last.
- `E` toggles inline text edit mode, `Esc` leaves it. Keys are ignored while editing.
- The theme dropdown (top-right) swaps between all themes in `themes/` at runtime and remembers the choice in `localStorage`.
- `prefers-reduced-motion` disables reveals.
- Print / Save as PDF (or `node pdf.js`) gives one slide per page, plus a notes page after any slide that has `data-notes`.

## License

MIT — see `LICENSE`.