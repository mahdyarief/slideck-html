---
name: slideck-html
description: Use when the user wants slides, a deck or a presentation (weekly report, internal update, lecture, seminar, pitch) as a single offline HTML file, or exported to PDF or editable PowerPoint (.pptx); when importing a .pptx into editable slides; or when making a custom slide design or brand theme. Frozen 1920x1080 template, 19 designs, 10 themes, placeholder layouts, autofit, SVG charts, concept diagrams, icons, shapes, Mermaid flowcharts, zero dependency.
---

# slideck-html

You write slide content as small HTML files. A frozen build turns them into one self-contained `deck.html` (fonts inlined, works offline, opens by double-click). From there it exports PDF (one slide per page) and editable PPTX. The stage is fixed at **1920×1080** and scales as a whole; there is no responsive reflow.

Four things are kept separate. Pick each one independently:

| | What | Where | You choose with |
|---|---|---|---|
| **design** | shape: spacing, cards, borders, type treatment | built-in `designs/` or the deck's `designs/` | `deck.json` `"design"` |
| **theme** | colours and fonts | built-in `themes/` or the deck's `themes/` | `deck.json` `"theme"` |
| **motion** | slide transitions + content choreography | `motions/` | `deck.json` `"motion"` |
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
5. **Build and check:** `slideck build` (fix every `x` line), then `slideck check` (with screenshots). Autofit below 0.75 means too much content: split the slide. `blok teks berbentuk narasi` / `isi N kata` means prose: rewrite as points (`slide-craft.md` §2.2). `isi "body" hanya mengisi N%` means too little: the slide has leftover empty space. Fix it per `slide-craft.md` §2.4 (more substance, a bigger visual, `.fill`, or a layout made for little content) until no content slide warns.
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
| frameworks, concepts, diagram-heavy lecture | `lineart`, `minimal` | `parchment-gold`, `navy` |
| bold poster style | `geometric`, `brutalist` | `swiss`, `navy` |

Each design's `designs/<name>/design.json` has a `recommended` theme and motion. Any design works with any theme. `slideck list` shows everything available, including the deck's own.

**Designs:** default · editorial · brutalist · geometric · architectural · ribbon · plate · campus · keynote · colloquium · lesson · spotlight · dark-academia · consulting · scholar · organic · minimal · campus-slide · lineart.

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

**Motions** (how slides change and content enters; full reference `docs/motion.md`): `corporate` (default, short rise, slide glides in the direction you move) · `cinematic` (slow fade and settle, for keynotes and launches) · `editorial` (text lines wipe up, the slide wipes in from the edge) · `keynote` (crisp push between slides) · `static` (no animation; steps still work). Content enters in reading order automatically; going back shows a slide already finished. Print, PDF, PPTX and `check` always use the final state.

**`deck.json` `"fonts"`:**
- `"theme"` (default): only this theme's fonts, about 100 KB;
- `"all"`: every theme's fonts, so the runtime theme switcher shows real fonts, about 1 MB;
- `"none"`: system fonts.

**Publishing a deck as a web page** (optional `deck.json` fields):
- `"lang"`: `"id"` (default) or `"en"`; sets `<html lang>` and the on-screen hint and Theme label;
- `"scroll"`: `"auto"` (default: phones and narrow portrait screens get the slides stacked for vertical scrolling), `"on"` or `"off"`;
- `"description"`, `"url"`, `"image"` (og:image, made absolute from `url`), `"icon"` (favicon file, inlined): fill the page meta and the share preview;
- `deck.html?clean` hides the controls, progress bar and theme menu, for embeds and screenshots;
- page blocks: `<a class="btn">` / `<a class="btn ghost">` buttons, `<span class="cmd">…</span>` copies its text (or `data-copy`) on click, `<pre class="code">` for code samples (`<span class="k">` tag, `<span class="m">` string).

**Contrast (WCAG AA):** every built-in theme passes AA for how its tokens are used: 4.5:1 for body, muted, footer and tag text; 3:1 for large text (kickers, big numbers, diagram titles) and accent fills behind `--on-teal` text. `slideck lint` checks the same pairs for custom themes. Optional theme tokens for this:
- `--on-teal`: text on accent fills (default `--surface`; set it to `var(--navy)` when the accent is light);
- `--accent-on-dark`: kicker and number colour on dark slides and the cover, for a theme whose accent is close to its dark surface.

Every output carries the generator identity only in its source: an `<!-- Generated by slideck-html X -->` comment plus `<meta name="generator">` in the HTML, Creator/Producer in the PDF properties, and Application in the .pptx properties.

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
| `content-aside` | kicker, title, body, aside, takeaway; `aside` is a dark panel on the right third for the key message or decision |
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

**Layout blocks** (work in every design; wrap text in `<h3>` / `<p>` / `<div>`, never loose text next to an icon or number):
- `.rows` (`.rows.cols2` for 2 columns): full-width rows. Put a marker first (`<span class="idx">01</span>`, `.idx.dot` for a circle, an `<icon … badge>`, or a `.kpi-num`), then `<h3>` + `<p class="small">`. Children can be `.card` or plain `<div>` (hairline rows).
- `.is-key` on one `.card`, `.rows` child, `.timeline .step` or chip: the one highlighted item (dark fill or accent). Use once per slide.
- `.bands`: before/after stacked full width; each child starts with a `.tag` label (`SEBELUM`, `SESUDAH`). Make the second `.card.accent`.
- `.hero`: left a `.stat-big` number or acronym + `<h3>` + `.small`; right a `.card` holding a `.rows` list.
- `.with-aside`: main block + a `.card.is-key` panel at a third of the width (same as the `content-aside` layout, for template-style slides).
- `.callout` (`.callout.warn` for a warning): `<icon name="alert" badge tone="accent2" size="32"/><div><b>Perhatian:</b> …</div>`.
- `.boxed` with `<span class="box-label">LABEL</span>` first: a box with its label on the border.
- `.chips` (`.chips.cols2`): many short items as pills, one may be `.is-key`.
- `.source`: small source line under a chart or table (`Sumber: …`).
- `.push` on the last element of a `.card`: pins it to the card bottom so tags line up across a row.
- `.fill` on the last block of a placeholder (`.grid2/3/4`, `.rows`, `.bands`, `.tiers`, `.people`, `.logos`): it grows to the remaining height; cards and rows stretch to equal height with their content centred. Use it only when the content is already substantial (60–70% of the area), never to hide a thin slide.
- `.people` > `.person`: team members in one row (`.people.cols3` / `.cols4` to wrap 5–8). Each: `<img src="foto.jpg" alt="Name">` or `<span class="avatar">AR</span>`, then `<h3>Name</h3><span class="role">Role</span><p class="small">…</p>`.
- `.tiers` > `.card`: packages side by side, the recommended one `.is-key`. Inside: `.tag`, `<span class="price">Rp 4 jt <small>/ bulan</small></span>`, `ul.bul`.
- `table.t` competition cells: `td.yes` (✓), `td.no` (—); `.is-key` on the `th` and `td`s of our column highlights it.
- `ol.refs`: references with automatic `[1]`, `[2]`; `ol.refs.apa` for hanging-indent APA style without numbers.
- `.logos`: logo wall, 4 columns (`.cols3` / `.cols5`); each child a `<div>` holding a name or an `<img alt>`.

**Components** (rendered at build time as SVG, coloured by the theme):
- **Chart:** `<chart type="bar|hbar|line|area|pie|doughnut" width height [title] [unit] [prefix] [stacked] [values="off"] [legend="off"] [center]>`, then one line per series: `labels: A, B` / `Series name: 1, 2`. Use `|` as the separator when values contain commas; the body may also be JSON. Size it to the placeholder: about 1720×600 for a full-width body, 820×560 for a two-content column.
- **Shape:** `<shape type="rect|round|pill|ellipse|diamond|hexagon|chevron|pentagon|arrow|arrow-left|arrow-up|arrow-down|arrow-both|triangle|parallelogram|trapezoid|callout|cylinder|star|plus" w h [x y] [fill="teal|navy|grey|mint|surface|ink|none"] [line="none|teal|ink|navy|line"] [size] [rot] [id]>Text</shape>`. Wrap a row in `<div class="shapes tight">` to butt chevrons together.
- **Connector:** `<connector from="#idA" to="#idB" [type="straight|elbow|curve"] [arrow="end|start|both|none"] [label] [dash]>`, or `x1 y1 x2 y2`.
- **Flowchart:** `<pre class="mermaid" data-width="1720" data-height="600">flowchart LR …</pre>`. Supports the Mermaid flowchart subset:
  - TD / LR / BT / RL and every node shape;
  - `-->` `---` `-.->` `==>` `~~~`, `|label|`, `&`, `subgraph … end`.

  Flowcharts only; for concept diagrams use `<diagram>`.
- **Diagram:** `<diagram type="venn|matrix|cycle|funnel|pyramid|scale|nested|positioning|gantt" [width="1500"] [height] [key="2"]>`, then one `Title: short description` line per item (description optional; `key: 2` or `key="1,3"` highlights items):
  - `venn` 2–3 sets, `overlap: text` for the centre;
  - `matrix` exactly 4 quadrants in order top-left, top-right, bottom-left, bottom-right; `x: axis title`, `y: axis title`;
  - `cycle` 3–6 steps clockwise from the top, `center: text`;
  - `funnel` 2–6 stages wide to narrow; `pyramid` 2–6 layers top to bottom (descriptions go to the right);
  - `scale` 2–7 stops left to right with `from: Low` / `to: High`;
  - `nested` 2–4 circles outer to inner (`TAM: Rp 120 T — all SMEs`); descriptions go to the right;
  - `positioning` 2–12 points `Name: x y` (0–100); `x: Low price | High price` labels the ends (no `|` = axis title), same for `y`; `key` = us;
  - `gantt` 1–10 rows `Task: 2-4` (periods 2 to 4) or `Milestone: 6`, then an optional note; `periods: Jan | Feb | Mar …`; `key` = critical path.
  Keep titles to 1–3 words and descriptions under 8 words; long text wraps but does not shrink.
- **Icon:** `<icon name="target">` (48 px, accent colour) or `<icon name="target" badge [tone="accent2|navy|soft"] [size="44"]>` (icon in a filled circle). Names: check, check-circle, x, plus, minus, arrow-right, alert, info, help, star, heart, user, users, target, clock, calendar, chart, trend-up, trend-down, bulb, gear, shield, lock, book, school, flag, globe, mail, home, search, doc, money, cart, leaf, bolt, cloud, link, chat, award, layers, pin, eye, cycle, database, code, tools. An unknown name is a build warning listing them all.

**Interactive and step-by-step** (full reference `docs/motion.md`; copy templates 13–18). Motion, chart drawing and reading-order entry are automatic; add interaction only where it carries meaning.

*Step 1: decide how the deck is used, and set it in `deck.json`.* Ask the user if it is unclear.
- `"interactive": "live"`: someone presents it on a screen with a clicker. Use **steps only**. The audience cannot hover, so never use peek, focus-group, hotspots or `data-hover`. Swaps and tabs need `data-step`, so → changes them.
- `"interactive": "shared"`: it is sent as a link and read alone. Steps are optional; tabs, swap buttons, peek and hotspots are fine, because the reader explores.
- Not set: treat it as `live`.

*Step 2: pick the component from the content.* No interaction is the default.

| content | use | template |
|---|---|---|
| an argument built point by point (3–4 points) | `data-steps="dim"` on the list + `<ph name="takeaway" data-step>` | 13 |
| before → after, old → new, problem → fix | `.swap` (with `data-step` in a live deck) | 14 |
| 2–4 views of one thing (scope / timeline / risks) | `.tabs` (shared), or separate slides / `.tabs data-step` (live) | 15 |
| one key number explained on the next slide | `data-morph` on the card in both slides + `data-count` on the first | 16 + 17 |
| summary cards whose detail the reader opens | `.peek` inside `.focus-group` (shared only) | 18 |
| parts of a screenshot or diagram | `.hotspots` (shared only) | — |
| 1–3 headline numbers | `data-count` | — |

*Step 3: keep the dose.*
- At most 4–6 steps per slide.
- At most 1–3 `data-count` numbers per slide.
- Interaction on at most ~40% of the slides of a live deck.
- Put `data-morph` on a whole card or block, never on text inside a card.
- Every state of a swap or tab must carry a `data-label` and make sense on its own: each state is printed as its own PDF/PPTX page.

**Syntax:**
- **Steps:** `data-step` on any element (or `<ph name="takeaway" data-step>`) hides it until → / click. `data-steps` on a container makes each child a step; `data-steps="dim"` also dims earlier steps. `data-step="2"` sets the order (same number = together). Shift+→ skips the steps.
- **Swap:** `<div class="swap">` with two or more children, each with `data-label="Before"`…: one shows at a time, with segmented buttons above it. With `data-step` there are no buttons; → moves to the next state.
- **Tabs:** `<div class="tabs">` with children carrying `data-label`: a tab bar is built above them. `data-hover` switches on hover; `data-step` makes → move through the tabs.
- **Peek:** `<div class="card peek"><div>face</div><div>detail</div></div>`: the detail replaces the face on hover, focus or tap.
- **Focus group:** `class="grid3 focus-group"`: hovering or focusing one child dims the others.
- **Hotspots:** `<div class="hotspots"><img src="…" alt="…"><button class="hotspot" style="--x:30%;--y:40%">label text</button></div>`.
- **Count-up:** `data-count` on a number (`<div class="kpi-num" data-count>86%</div>`) counts it up as the slide enters.
- **Morph:** the same `data-morph="name"` on an element in two consecutive slides makes it glide and resize from one to the other.
- **Printing:** PDF, PPTX and `check` show every step. Each extra state of a swap or tab set becomes its own page, right after the slide. `data-print="first"` or `"last"` on the component prints only that state.

**Verify interaction** (you cannot watch the animation, so use these):
- The build warns about misuse: too many steps, unlabelled states, hover in a live deck, a `data-morph` with no partner, `data-count` with no number.
- `slideck check` prints a `~` summary line per interactive slide (e.g. `~ slide 4: 4 langkah · swap 2 keadaan`). Confirm it matches what you meant. State pages are checked for overflow like normal slides and are labelled `slide 5 · keadaan "After"`.
- To look at a step, open `dist/<deck>.html#4.2`: slide 4 with 2 steps revealed. `#4` shows step 0, and `?final` shows everything.

**Other syntax:**
- `{{N}}` / `{{TOTAL}}` become slide numbers. `[Footer kiri]` comes from `deck.footer`.
- A file starting with `_` is skipped by the build.
- `slides/*.css` is appended as deck-local CSS. It uses tokens only, never hex.
- **Templates:** copy `<tools>/templates/NN-*.html` into `slides/`, replace every `[...]` text, and keep every class. All use the layout syntax, so the design and theme apply. The build warns about any `[text]` left in a slide (`placeholder belum diisi`). Also replace the sample numbers in charts and diagrams. A filled version of every template is in `<tools>/examples/templates/` (slide N = template N); copy from there when a worked example helps more than brackets.
  - Opening and structure: 19 cover · 01 cover-split-kpi · 20 agenda · 21 section · 22 exec-summary (situation → complication → recommendation).
  - Numbers and evidence: 02 title-cards-3 · 07 stat-full-navy · 24 insight-chart · 04 table-detail · 31 case-study.
  - Comparing and deciding: 03 compare-2col · 23 problem-solution · 09 blocker-2col · 06 scope-4box · 25 swot · 27 competition-table · 28 positioning.
  - Plans and process: 11 timeline · 33 gantt · 08 rows-list · 05 mapping-2col · 12 checklist · 34 methodology.
  - Business: 26 market-size · 29 team · 30 pricing · 32 logo-wall.
  - Research: 34 methodology · 36 limitations · 35 references.
  - Closing: 37 closing-ask · 10 quote-closing · 38 qa-contact.
  - Interactive: 13 steps-argument · 14 before-after · 15 tabs-3 · 16 kpi-morph-a + 17 kpi-morph-b (together, in order) · 18 explore-cards (shared decks only).

  **Template order by deck type** (a starting point; drop what the story does not need):
  | deck | order |
  |---|---|
  | report / review | 19 · 22 · 20 · 02 · 24 · 04 · 11 · 12 · 37 |
  | startup pitch | 19 · 23 · 26 · 31 or 02 (traction) · 28 · 27 · 30 (business model) · 29 · 37 (the ask) |
  | consulting proposal | 19 · 22 · 23 · 34 or 11 (approach) · 33 · 29 · 30 · 31 · 32 · 37 |
  | thesis / research defence | 19 · 20 · 21 · 08 (background, gap) · 34 · 24 · 04 · 36 · 35 · 38 |
  | lecture / training | 19 · 20 · 21 · 13 · 25 or 03 · 12 · 38 |

## 4. Worked example (a complete 4-slide deck)

`deck.json`
```json
{ "title": "Q3 Sales Review", "footer": "Q3 Sales Review | Oct 2026", "output": "q3-review.html",
  "design": "consulting", "theme": "slate-rust", "motion": "corporate", "interactive": "live" }
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

`slides/04-next.html` (a live deck, so the argument is built with steps: each point appears on →, earlier ones dim, the conclusion comes last)
```html
<slide layout="title-content">
<ph name="kicker">Q4</ph>
<ph name="title">Three moves for Q4</ph>
<ph name="body"><div class="rows" data-steps="dim">
<div class="row"><span class="idx">01</span><div><h3>Keep enterprise outbound</h3><p class="small">It brought 60% of new accounts.</p></div></div>
<div class="row"><span class="idx">02</span><div><h3>Move SMB to self-serve</h3><p class="small">Sales time per SMB deal is 3× its value.</p></div></div>
<div class="row"><span class="idx">03</span><div><h3>Cut paid social by 30%</h3><p class="small">Lowest conversion of any channel.</p></div></div>
</div></ph>
<ph name="takeaway" data-step><b>Kesimpulan:</b> spend where the accounts come from.</ph>
</slide>
```

Then run `slideck build && slideck check --no-shot && slideck pdf`. `check` should print `~ slide 4 [title-content]: 4 langkah`, and the PDF shows slide 4 complete.

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
| `N blok teks berbentuk narasi (terpanjang 34 kata)` | descriptive sentences instead of points | rewrite each as a bold point + one line ≤ 15 words; move the story to `notes`. If the sentence is deliberate (conclusion, quote, highlight), put it in `takeaway`, `.quote`, `.callout` or mark it `data-prose` (`slide-craft.md` §2.2) |
| `isi 120 kata — terlalu banyak teks` | the body is over 90 words | cut to points, move detail to `notes`, or split the slide |
| `isi "body" hanya mengisi 55% tinggi areanya` | the content leaves the rest of the area empty (leftover space) | add substance, enlarge the visual, `.fill`, merge with another slide, or switch layout (`slide-craft.md` §2.4) |
| `connector: target tidak ketemu` | a connector's `#id` does not exist | fix the `id` / `from` / `to` |
| `tag komponen tidak dirender` / `mermaid tidak dirender` | an unknown tag or a syntax error | check the component syntax |
| `gambar gagal dimuat` | broken image path | fix `src` (relative to the deck, or a `data:` URI) |
| `N% piksel berubah dari baseline` | the look changed since the last `--update` | intended: `slideck check --update`; otherwise investigate |
| `deck.output tanpa .html` | `output` lacks `.html`; it was added | set `"output": "name.html"` |
| `design … melanggar N aturan` | the custom design breaks rules D1–D9 | fix per `docs/custom-design.md` |
| `frozen file berubah` | a framework file was edited | revert it; never edit framework files |
| `placeholder belum diisi: [Judul …]` | template text still in the slide | replace every `[…]`, including chart and diagram labels |
| `halaman PDF=N` | PDF page count (should be slides + notes + tab/swap state pages) | if it differs, rebuild and retry |
| `~ slide N: 3 langkah · tabs 3 keadaan …` | summary of the slide's interaction | check it matches what you intended |
| `slide N · keadaan "X"` | a tab/swap state printed as its own page | fix overflow there like on any slide |
| `N langkah di satu slide` | too many steps | split the slide or merge points |
| `anak tanpa data-label` / `butuh minimal 2 anak` | a swap/tabs state has no label, or there is only one state | add `data-label` to every child; give at least 2 |
| `… di deck "live"` | hover-only component, or buttons with no `data-step`, in a presented deck | use steps (`data-step` / `data-steps`) |
| `data-morph="x" tidak punya pasangan` | no element with the same name on the slide before or after | use the same name on both slides, or remove it |
| `data-morph … di dalam kotak berlatar` | morph is on text inside a card | move `data-morph` to the card |
| `slide interaktif (>40%)` | interaction on too many slides of a live deck | keep it for slides that build an argument |

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
- **Points, not prose:** every item is a bold point (2–6 words) plus one support line (≤ 15 words: number, cause or consequence). There are no descriptive paragraphs, a text block is ≤ 25 words and one sentence, and the body is ≤ 90 words. Background and story go to `notes` (`slide-craft.md` §2.2). A full sentence is fine, once per slide, as a conclusion (`takeaway`), a quote (`.quote` / `<blockquote>`), a highlighted statement (`.callout`), or another deliberate sentence marked `data-prose` (research question, thesis, mission). These are not counted.
- **Every content slide is full:** the content fills at least 70% of its area's height, with no stranded gap in the middle or at the bottom. Empty space is allowed only where it is designed: margins, the gaps between blocks, and the open space around one element on cover, section, big-number and quote slides. Never fill with filler text, decorative icons or repeated points (`slide-craft.md` §2.4).
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
  - On-click entrance animations become `data-step` (one click = one step). By-paragraph builds become `data-steps`.
- **PPTX export:** `slideck pptx [--out file.pptx]` exports editable shapes, text, tables and pictures, with fonts embedded.
  - Steps become on-click Fade animations, so the deck still builds step by step in PowerPoint.
  - The motion becomes the slide transition: corporate and cinematic → Fade, editorial → Wipe, keynote → Push, static → none.
  - Each tab/swap state becomes its own slide.
- **PDF export:** `slideck pdf [--out file.pdf] [--html file.html]` prints through headless Chrome using the shell's print stylesheet. Each slide is one 1920×1080 page; a slide with notes gets an extra notes page after it.
