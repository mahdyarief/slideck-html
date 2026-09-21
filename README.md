# slideck-html

Stable single-file HTML slide decks. Frozen template + per-slide files + `node build.js` (stdlib only, zero dependency).

Stage fixed **1920×1080**, scaled to viewport. Four dimensions separated: **design** (shape + typography treatment) × **theme** (color + font) × **layout** (12 templates) × **content** (`slides/`).

Output is one self-contained `.html` with fonts inlined base64 — works offline, opens by double-click, prints one slide per page. A built-in **theme switcher** (top-right) swaps the palette live without rebuilding, and per-slide **speaker notes** (`data-notes`) print as their own pages in the PDF.

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
2. **Never edit** `template.html`, `build.js`, `pdf.js`, `designs/`, `themes/`, `motions/`, `templates/`, `assets/`. Edit only `slides/*.html` + `deck.json`.
3. **New deck:** copy `templates/<n>-*.html` → `slides/NN-name.html`, replace `[...]` placeholders only, keep classes.
4. **Build:** `node build.js` → `dist/<output>.html`. Open in browser to verify. Add `node pdf.js` for a PDF, one slide per page.
5. **Tables max 7 rows** per slide — overflow goes to a continuation slide.
6. **Never hardcode a hex color.** Text on `--navy` uses `var(--on-navy)`; body text on light surfaces uses `var(--ink)`.

## Quickstart

```bash
git clone https://github.com/mahdyarief/slideck-html.git
cd slideck-html
node build.js            # builds dist/contoh-deck.html from slides/
node pdf.js              # builds dist/contoh-deck.pdf, one slide per page
# new deck: edit deck.json (title/footer/output/design/theme/motion), put slides in slides/, run node build.js
```

No `npm install`. Node stdlib only.

## Install as an AI skill

From the plugin marketplace — updates follow the repo:

```
/plugin marketplace add mahdyarief/slideck-html
/plugin install slideck-html@slideck-html
```

Or copy manually — a static snapshot, re-copy to update:

```bash
mkdir -p ~/.openclaude/skills/slideck-html
cd slideck-html
cp -r skills/slideck-html/SKILL.md template.html build.js pdf.js designs themes motions templates assets ~/.openclaude/skills/slideck-html/
```

Then an agent asked to build slides can follow `SKILL.md` directly.

## Layout

```
.claude-plugin/    plugin + marketplace manifest (marketplace.json, plugin.json)
template.html      FROZEN shell ({{TITLE}} {{FONTS}} {{COMPONENTS}} {{SLIDES}} + nav JS)
build.js           FROZEN: slides/*.html → dist/<output>.html, validates placeholders, writes FROZEN.json
pdf.js             TOOL: dist/<output>.html → dist/<output>.pdf, one slide per page
designs/           FROZEN: default · editorial · brutalist · geometric · architectural · ribbon · plate ·
                   campus · keynote · colloquium · lesson · spotlight · dark-academia ·
                   consulting · scholar · organic · minimal   (components.css + design.json each)
deck.json          EDIT: title, footer, output, design, theme, motion
themes/            navy (default) · paper · botanical · swiss · neon ·
                   slate-rust · petrol-gold · terracotta · parchment-gold   (:root color+font only)
motions/           corporate (default) · cinematic · playful           (.reveal timing only)
templates/         12 copy-paste layouts with [...] placeholders
slides/            YOUR content (only dir you + AI edit)
assets/fonts/      woff2 + fonts.json — base64-inlined at build, no network needed
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

| Theme | Look | Font |
|---|---|---|
| `navy` (default) | deep navy + teal | Plus Jakarta Sans / Source Serif 4, inlined base64 |
| `paper` | warm off-white, ink | system stack |
| `botanical` | dark green-black | system stack |
| `swiss` | high-contrast minimal | system stack |
| `neon` | dark blue-black | system stack |
| `slate-rust` | dark slate + rust, warm grey canvas | system stack |
| `petrol-gold` | deep petrol teal + gold | system stack |
| `terracotta` | terracotta + light grey, thin display | system stack |
| `parchment-gold` | cream canvas + navy + gold | system stack |

| Motion | Feel |
|---|---|
| `corporate` (default) | 300 ms subtle rise |
| `cinematic` | 1 s fade + scale |
| `playful` | 550 ms spring |

The build inlines `designs/<d>/components.css + themes/<t>.css + motions/<m>.css`, in that order. A wrong design name stops the build; a wrong theme or motion name warns and falls back to the default.

Adding a theme means overriding the `:root` tokens only (see the token contract comment at the top of `designs/default/components.css`). Adding a design means writing a `designs/<name>/components.css` that styles through those same token names, plus a matching `design.json`. Because every design speaks the same token vocabulary, any design works with any theme.

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

Then open `dist/<output>.html` and arrow through every slide — check for overflow or clipping.

## PDF export

```bash
node build.js        # first: dist/<output>.html
node pdf.js          # then: dist/<output>.pdf — one slide per page, 1920×1080
```

`pdf.js` drives a locally installed Chromium/Chrome/Edge (`--headless=new --print-to-pdf`) and prints through the shell's existing `@media print` rules, so every page is exactly stage-sized with one slide each and no header or footer. Options: `--root <dir>` (deck in another folder), `--html <file.html>` (print any built deck directly), `--out <file.pdf>`, and `CHROME_PATH=<exe>` to pin a specific browser. It reports `slides=N | halaman PDF=N | ukuran halaman=WxH pt` and exits non-zero if the page count does not match the slide count, so a broken export is visible.

## Frozen-file lock

`FROZEN.json` stores a short sha256 of `template.html`, `build.js`, `pdf.js`, and every file under `designs/`, `themes/`, and `motions/`. If one of them changes, the next build warns — so accidental edits to shared files are visible. If you *intentionally* changed a frozen file, regenerate the lock:

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