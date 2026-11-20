---
name: slideck-html
description: Use when the user wants slides, a deck or a presentation (weekly report, internal update, lecture, seminar, pitch) as a single offline HTML file, or exported to PDF or editable PowerPoint (.pptx); when importing a .pptx into editable slides; or when making a custom slide design or brand theme. Frozen 1920x1080 template, 18 designs, 10 themes, placeholder layouts, autofit, SVG charts, shapes, Mermaid flowcharts, zero dependency.
---

# slideck-html

You write slide content as small HTML files. A frozen build turns them into one self-contained `deck.html` (fonts inlined, works offline, opens by double-click). From there it exports PDF (one slide per page) and editable PPTX. The stage is fixed at **1920×1080** and scales as a whole; there is no responsive reflow.

Four things are kept separate. Pick each one independently:

| | What | Where | You choose with |
|---|---|---|---|
| **design** | shape: spacing, cards, borders, type treatment | built-in `designs/` or the deck's `designs/` | `deck.json` `"design"` |
| **theme** | colours and fonts | built-in `themes/` or the deck's `themes/` | `deck.json` `"theme"` |
| **motion** | reveal animation timing | `motions/` | `deck.json` `"motion"` |
| **content** | the slides | `<deck>/slides/*.html` | you write these |

## 0. Setup: where things are

- **Tools:** in the slideck-html folder. As a plugin this is `${CLAUDE_PLUGIN_ROOT}`. In a clone or a skill folder it is the folder holding `build.js` (if `${CLAUDE_PLUGIN_ROOT}` appears literally, use that folder). With the npm package installed, the `slideck` command is on PATH.
- **Deck:** the user's project folder (`deck.json` + `slides/`, output in `dist/`). **Never write the deck inside the plugin or package folder**, because updates replace it.
- **Running commands:** all of them work on the current folder or on `--root <deck>`. Below, `slideck <cmd>` means whichever form is available:
  - `slideck <cmd>`, if the npm package is installed;
  - `node "${CLAUDE_PLUGIN_ROOT}/bin/slideck.js" <cmd>` otherwise.
- **Requirements:** Node 18+. Chrome, Edge or Chromium for `pdf`, `pptx` and `check` (set `CHROME_PATH` if not found).

## 1. Workflow

**Read `<tools>/docs/slide-craft.md` before writing any slide.** It is the content and quality guide: storyline structures, action titles, density, choosing a visual from the content, premium-layout rules, copy-paste recipes for every common slide type, and the polish loop. This file covers syntax; that one covers making the deck good.

1. **Ask only what you can't infer:** topic and audience, the one message, roughly how many slides, **presented live or read alone** (density), which outputs (HTML / PDF / PPTX), and any brand colours. Default to HTML + PDF.
2. **Storyline first** (`slide-craft.md` §1): pick a structure, then write every slide title as a full-sentence takeaway and check that the titles alone tell the story. Make a slide plan: layout, kicker, title, proof, takeaway. For decks over 8 slides, show the plan to the user before building.
3. **Create the deck:** `slideck init <folder>`. Fill in `deck.json`: `title`, `footer`, `output` (ends in `.html`), `design`, `theme`, `motion`. Use §2 to choose. Delete the sample slides.
4. **Write the slides:** `slides/NN-name.html`, one per file. Use the recipes in `slide-craft.md` §4 and the syntax in §3 below. Put images in `<deck>/images/`; the build embeds them.
5. **Build and check:** `slideck build` (fix every `x` line), then `slideck check` (with screenshots). Autofit below 0.75 means too much content: split the slide.
6. **Look, then polish** (`slide-craft.md` §5): open `<deck>/.slideck-check/current/*.png`, write down the 3 worst problems, fix them, rebuild and look again. Do at least 2 rounds. If a visual change was intended, accept it with `slideck check --update`.
7. **Export:** `slideck pdf` and/or `slideck pptx`. The PDF line must show `halaman PDF` (pages) = slides + notes pages.
8. **Report:** give the user the output paths (`dist/<output>.html|.pdf|.pptx`). Mention any slide you split, and anything you invented (e.g. placeholder numbers).

**Done gate:** report done only when the tool output in this session shows it:
- the build has no `x` lines;
- `check` prints `Semua lolos.`;
- the requested exports exist.

Never claim "passed" or "looks good" without having run the command and seen it.

## 2. Choosing a design and theme

| Purpose | Design | Theme |
|---|---|---|
| weekly report, internal update | `default`, `consulting` | `navy`, `slate-rust` |
| management / client report | `consulting`, `minimal` | `slate-rust`, `terracotta` |
| editorial, long narrative, read-alone | `editorial`, `minimal` | `paper`, `terracotta` |
| lecture, course module, training | `campus`, `lesson`, `campus-slide` | `paper`, `campus-slide` |
| research seminar, academic talk | `colloquium`, `scholar`, `dark-academia` | `paper`, `petrol-gold`, `parchment-gold` |
| university assignment / group report | `campus-slide` | `campus-slide` |
| conference keynote, launch | `keynote`, `ribbon`, `spotlight` | `navy`, `neon` |
| product / marketing pitch | `organic`, `ribbon` | `petrol-gold`, `botanical` |
| technical, audit, engineering | `plate`, `architectural`, `brutalist` | `navy`, `swiss` |
| bold poster style | `geometric`, `brutalist` | `swiss`, `navy` |

Each design's `designs/<name>/design.json` has a `recommended` theme and motion. Any design works with any theme. `slideck list` shows everything available, including the deck's own.

**Designs:** default · editorial · brutalist · geometric · architectural · ribbon · plate · campus · keynote · colloquium · lesson · spotlight · dark-academia · consulting · scholar · organic · minimal · campus-slide.

**Themes** (fonts are bundled and embedded):

| Theme | Fonts |
|---|---|
| `navy` (default) | Plus Jakarta Sans / Source Serif 4 |
| `paper` | Inter / Gelasio |
| `botanical` | Jost / Crimson Pro |
| `swiss` | Inter |
| `neon` | Space Grotesk / JetBrains Mono |
| `slate-rust` | IBM Plex Sans / IBM Plex Serif |
| `petrol-gold` | Public Sans / Gelasio |
| `terracotta` | Work Sans |
| `parchment-gold` | Inter / Libre Baskerville |
| `campus-slide` | Carlito / Caladea, metric-compatible with Calibri / Cambria |

**Motions:** `corporate` (default, 300 ms rise) · `cinematic` (1 s fade + scale) · `playful` (550 ms spring).

**`deck.json` `"fonts"`:**
- `"theme"` (default): only this theme's fonts, about 100 KB;
- `"all"`: every theme's fonts, so the runtime theme switcher shows real fonts, about 1 MB;
- `"none"`: system fonts.

## 3. Slide syntax

```html
<slide layout="two-content" notes="Speaker notes: printed as their own PDF page after this slide">
<ph name="kicker">Q3 REVIEW</ph>
<ph name="title">Revenue grew, costs held</ph>
<ph name="left"><ul class="bul"><li>Revenue +18% YoY<ul><li>Driven by enterprise</li></ul></li><li>Churn flat at 2.1%</li></ul></ph>
<ph name="right"><chart type="doughnut" width="820" height="560">
labels: Enterprise | SMB | Self-serve
Revenue: 41 | 22 | 9
</chart></ph>
<ph name="takeaway"><b>Kesimpulan:</b> enterprise is now 57% of revenue.</ph>
</slide>
```

| Layout | Placeholders |
|---|---|
| `title` (cover, `--cover` background) | kicker, title, subtitle |
| `section` | kicker, title, subtitle |
| `title-content` | kicker, title, body, takeaway |
| `two-content` | kicker, title, left, right, takeaway |
| `comparison` | kicker, title, left-head, left, right-head, right, takeaway |
| `title-only` | kicker, title, takeaway; free shapes and charts go outside `<ph>` |
| `content-caption` | title, caption, body, takeaway |
| `picture-caption` | picture, title, caption |
| `blank` | none |

- **`<slide>` attributes:** `dark` (dark background), `notes="…"`, `class`, `fit="off"`.
- **`<ph>` attributes:** `x y w h` (absolute position in stage px) and `anchor="m|b"`.
- Empty placeholders are dropped. Lists nest up to 3 levels; `<ol>` is numbered.
- **Takeaway:** `takeaway` adds a conclusion band under the content. Start it with `<b>Kesimpulan:</b>`.

**Content classes** (inside placeholders):
- `.bul` lists;
- `.card` (+ `.card.accent`) inside `.grid2` / `.grid3` / `.grid4`;
- `.kpi-num` + `.kpi-lab`;
- `.tag`, `.small`, `.quote`;
- `table.t` (`td.n` for right-aligned numbers);
- `.timeline > .step > .dot`, `ul.checklist`, `.map > .mapcol` with `.arrow`.

**Components** (rendered at build time as SVG, coloured by the theme):
- **Chart:** `<chart type="bar|hbar|line|area|pie|doughnut" width height [title] [unit] [prefix] [stacked] [values="off"] [legend="off"] [center]>`, then one line per series: `labels: A, B` / `Series name: 1, 2`. Use `|` as the separator when values contain commas; the body may also be JSON. Size it to the placeholder: about 1720×600 for a full-width body, 820×560 for a two-content column.
- **Shape:** `<shape type="rect|round|pill|ellipse|diamond|hexagon|chevron|pentagon|arrow|arrow-left|arrow-up|arrow-down|arrow-both|triangle|parallelogram|trapezoid|callout|cylinder|star|plus" w h [x y] [fill="teal|navy|grey|mint|surface|ink|none"] [line="none|teal|ink|navy|line"] [size] [rot] [id]>Text</shape>`. Wrap a row in `<div class="shapes tight">` to butt chevrons together.
- **Connector:** `<connector from="#idA" to="#idB" [type="straight|elbow|curve"] [arrow="end|start|both|none"] [label] [dash]>`, or `x1 y1 x2 y2`.
- **Flowchart:** `<pre class="mermaid" data-width="1720" data-height="600">flowchart LR …</pre>`. Supports the Mermaid flowchart subset:
  - TD / LR / BT / RL and every node shape;
  - `-->` `---` `-.->` `==>` `~~~`, `|label|`, `&`, `subgraph … end`.

  Flowcharts only; no other diagram types.

**Other syntax:**
- `{{N}}` / `{{TOTAL}}` become slide numbers. `[Footer kiri]` comes from `deck.footer`.
- A file starting with `_` is skipped by the build.
- `slides/*.css` is appended as deck-local CSS. It uses tokens only, never hex.
- **Templates (alternative):** copy `<tools>/templates/NN-*.html` into `slides/`, replace only the `[...]` text, and keep every class. Available templates:
  - 01 cover-split-kpi · 02 title-cards-3 · 03 compare-2col · 04 table-detail;
  - 05 mapping-2col · 06 scope-4box · 07 stat-full-navy · 08 rows-list;
  - 09 blocker-2col · 10 quote-closing · 11 timeline · 12 checklist.

## 4. Worked example (a complete 4-slide deck)

`deck.json`
```json
{ "title": "Q3 Sales Review", "footer": "Q3 Sales Review | Oct 2026", "output": "q3-review.html",
  "design": "consulting", "theme": "slate-rust", "motion": "corporate" }
```

`slides/01-cover.html`
```html
<slide layout="title">
<ph name="kicker">SALES · Q3 2026</ph>
<ph name="title">Q3 Sales Review</ph>
<ph name="subtitle">Regional performance and Q4 priorities · 14 Oct 2026</ph>
</slide>
```

`slides/02-kpi.html`
```html
<slide layout="title-content">
<ph name="kicker">HEADLINE</ph>
<ph name="title">Three numbers that matter</ph>
<ph name="body"><div class="grid3">
<div class="card"><div class="kpi-num">$4.2M</div><div class="kpi-lab">Revenue, +18% YoY</div></div>
<div class="card"><div class="kpi-num">312</div><div class="kpi-lab">New accounts</div></div>
<div class="card accent"><div class="kpi-num">2.1%</div><div class="kpi-lab">Monthly churn, flat</div></div>
</div></ph>
<ph name="takeaway"><b>Kesimpulan:</b> growth came from new accounts, not price.</ph>
</slide>
```

`slides/03-trend.html`
```html
<slide layout="title-content" notes="Mention the August promo spike.">
<ph name="kicker">TREND</ph>
<ph name="title">Monthly revenue ($k)</ph>
<ph name="body"><chart type="bar" width="1720" height="600" unit="k" prefix="$">
labels: Jul | Aug | Sep
2025: 1180 | 1240 | 1150
2026: 1310 | 1560 | 1330
</chart></ph>
</slide>
```

`slides/04-next.html`
```html
<slide layout="comparison">
<ph name="kicker">Q4</ph>
<ph name="title">Keep, change</ph>
<ph name="left-head"><span class="tag">KEEP</span></ph>
<ph name="left"><ul class="bul"><li>Enterprise outbound</li><li>Annual-plan discount</li></ul></ph>
<ph name="right-head"><span class="tag">CHANGE</span></ph>
<ph name="right"><ul class="bul"><li>Move SMB to self-serve</li><li>Cut paid social by 30%</li></ul></ph>
</slide>
```

Then run `slideck build && slideck check --no-shot && slideck pdf`.

## 5. Custom design or theme

Use these when the user wants their brand or a look none of the built-ins give. **Theme = colours and fonts** (most brand requests). **Design = shape and structure.**

```bash
slideck new-theme acme --from navy          # → <deck>/themes/acme.css: edit the hex tokens
slideck new-design acme --from consulting   # → <deck>/designs/acme/: edit the CSS, keep tokens
slideck lint                                # must print "Semua lolos."
```

Set `"theme"` / `"design"` in `deck.json`. The build refuses a custom design or theme that breaks a rule. Read **`<tools>/docs/custom-design.md`** before writing one. Rules in short:
- a design never uses a fixed colour (derive extras with `color-mix()` from tokens);
- only contract tokens, or your own derived ones;
- never touch the shell UI or the `.slide` size and position;
- no network URLs;
- style the core classes;
- text ≥ 18px;
- a theme is only `:root{}` tokens, with body-text contrast ≥ 4.5:1 and `--navy` dark.

## 6. Reading tool output

Tool messages are in Indonesian. Line prefixes: `x` = error (must fix), `!` = warning (read it), `·` = info.

| Message | Meaning | Do |
|---|---|---|
| `Semua lolos.` | all passed | done |
| `N masalah.` | N problems; exit code 1 | fix the `x` lines above it |
| `autofit slide 0.81` / `autofit "body" 0.7` | content was shrunk to fit | below 0.75: split the slide or cut text |
| `masih meluber walau autofit …` / `konten meluber dari slide` | still overflows at minimum scale | split the slide |
| `connector: target tidak ketemu` | a connector's `#id` does not exist | fix the `id` / `from` / `to` |
| `tag komponen tidak dirender` / `mermaid tidak dirender` | an unknown tag or a syntax error | check the component syntax |
| `gambar gagal dimuat` | broken image path | fix `src` (relative to the deck, or a `data:` URI) |
| `N% piksel berubah dari baseline` | the look changed since the last `--update` | intended: `slideck check --update`; otherwise investigate |
| `deck.output tanpa .html` | `output` lacks `.html`; it was added | set `"output": "name.html"` |
| `design … melanggar N aturan` | the custom design breaks rules D1–D9 | fix per `docs/custom-design.md` |
| `frozen file berubah` | a framework file was edited | revert it; never edit framework files |
| `halaman PDF=N` | PDF page count (should be slides + notes) | if it differs, rebuild and retry |

## 7. Rules

- **The output is always ONE self-contained `.html` file.** That is the core promise of slideck. Fonts, CSS, JS and every local image, video or CSS `url()` are embedded by the build as `data:` URIs.
  - Put images in the deck folder (e.g. `<deck>/images/`) and reference them relatively, e.g. `<img src="../images/logo.png" alt="…">` or `src="images/logo.png"`. Paths are resolved from `slides/` first, then from the deck folder.
  - Never link internet URLs. The build warns (`aset dari jaringan`), and the deck would no longer work offline.
  - Keep each image under ~2 MB; compress large photos.
  - Images never need inline sizes; placement decides behaviour (`slide-craft.md` §3.1):
    - `picture` placeholder: fills its area (`class="contain"` shows the whole image);
    - any other placeholder: fits the remaining space;
    - `.gallery`: equal tiles;
    - inside `.card`: a 16:10 banner;
    - `img.icon`: 72 px.
  - Never add features that need a second file, a server or a CDN.

- Edit only `<deck>/slides/*`, `<deck>/deck.json`, and the deck's own `designs/` / `themes/`. **Never edit framework files** (`template.html`, `core.css`, `*.js`, `bin/`, `lib/`, `layouts/`, `designs/`, `themes/`, `motions/`, `templates/`, `assets/`) or `dist/`.
- Tables: at most 7 rows per slide. Split the rest into a continuation slide.
- Charts: size `width` / `height` to the placeholder.
- Text on `--navy` uses `var(--on-navy)` / `var(--on-navy-mut)`. Body text on light surfaces uses `var(--ink)`. Never hardcode a hex colour.
- No responsive breakpoints inside slides.
- Replace every `[...]` placeholder before building.
- Mermaid: flowcharts only. For sequences or timelines, use shapes + connectors or `.timeline`.
- Don't invent facts: if the user gave no numbers, use clearly marked placeholder values and say so.

## 8. PowerPoint and PDF

- **Import:** `slideck import talk.pptx [--force]` turns a .pptx into `<slide layout>` files.
  - Titles, bullets, tables, pictures, notes, bar/line/pie charts and SmartArt text come across.
  - The pptx look is dropped; the slides take the deck's design and theme.
  - EMF/WMF pictures and scatter/radar/combo charts are skipped with a warning.
- **PPTX export:** `slideck pptx [--out file.pptx]` exports editable shapes, text, tables and pictures, with fonts embedded.
- **PDF export:** `slideck pdf [--out file.pdf] [--html file.html]` prints through headless Chrome using the shell's print stylesheet. Each slide is one 1920×1080 page; a slide with notes gets an extra notes page after it.
