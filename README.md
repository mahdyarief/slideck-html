# slideck-html

**Slides you write as HTML. One file you can send anywhere.**

Write one small HTML file per slide, run one command, and get a polished 1920×1080 deck as a single offline `.html` file, plus PDF and editable PowerPoint. Zero dependencies (Node's standard library only). Made for people and for AI agents.

**See it live: [slideck.nimb.us.ci](https://slideck.nimb.us.ci/)** — the page is itself a slideck-html deck. It shows every design and theme, the visuals, and a short tutorial. (Bahasa Indonesia: [slideck.nimb.us.ci/id](https://slideck.nimb.us.ci/id/).)

[![npm](https://img.shields.io/npm/v/slideck-html)](https://www.npmjs.com/package/slideck-html) ![zero dependency](https://img.shields.io/badge/dependencies-0-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

```bash
npm install -g slideck-html
slideck init my-deck && cd my-deck
slideck build        # → dist/deck.html
```

## What you get

- **One self-contained file.** Fonts, CSS, scripts and your images are embedded. It opens by double-click, works offline and prints one slide per page.
- **19 designs × 10 themes × 5 motions.** A design sets the shape (layout, spacing, typography, cover), a theme sets colours and fonts, and any design works with any theme. The built deck has a theme menu that recolours it live.
- **Motion and interaction.** Slides glide in the direction you move, content enters in reading order, charts draw themselves and numbers count up. Step-by-step builds, before/after swaps, tabs, hover details and morphing elements, with no JavaScript to write. PDF prints every step and every tab/swap state; PowerPoint keeps the steps as click animations.
- **Placeholder layouts** like PowerPoint (`title`, `two-content`, `comparison`, `content-aside`, …) with autofit that shrinks overflowing text.
- **Visuals drawn at build time as SVG** and coloured by the theme: charts, concept diagrams (venn, matrix, cycle, funnel, pyramid, scale, TAM/SAM/SOM, positioning map, Gantt), 46 line icons, shapes and connectors, Mermaid flowcharts. No network, no extra libraries.
- **PDF and PowerPoint.** `slideck pdf` prints one slide per page (with speaker notes pages). `slideck pptx` writes native, editable PowerPoint objects with the fonts embedded. `slideck import` turns a `.pptx` into slides.
- **Quality checks.** `slideck check` reports overflow, broken components and pixel changes against a baseline; it exits 1, so it can gate CI. Every theme is held to WCAG AA contrast.
- **Web publishing.** Phone-friendly scroll mode, page metadata and share image, copy-to-clipboard command blocks.

## Quickstart

Requirements: Node.js 18+. Chrome, Edge or Chromium for PDF, PPTX export and `check` (set `CHROME_PATH` if it isn't found).

```bash
npm install -g slideck-html          # or run without installing: npx slideck-html <command>
slideck init my-deck && cd my-deck   # deck.json + slides/ + .gitignore
slideck list                         # pick a design and theme, set them in deck.json
slideck build                        # → dist/deck.html
slideck check                        # overflow + visual check
slideck pdf                          # → dist/deck.pdf
slideck pptx                         # → dist/deck.pptx
```

A slide is a small HTML file in `slides/`:

```html
<slide layout="two-content">
<ph name="kicker">Q3 REPORT</ph>
<ph name="title">Revenue beat the target in three of four quarters</ph>
<ph name="left"><ul><li>Strongest quarter since launch</li><li>Churn fell to 2.1%</li></ul></ph>
<ph name="right"><chart type="bar">
labels: Q1, Q2, Q3, Q4
Target: 70, 80, 85, 95
Actual: 64, 83, 88, 97
</chart></ph>
</slide>
```

and `deck.json` picks the look:

```json
{ "title": "Q3 Report", "footer": "Acme | Q3 2026", "output": "deck.html",
  "design": "consulting", "theme": "slate-rust", "motion": "corporate" }
```

| Command | Does |
|---|---|
| `slideck init [dir]` | new deck: `deck.json` + sample slides + `.gitignore` |
| `slideck build` | `slides/*.html` → `dist/<output>.html` |
| `slideck pdf` / `slideck pptx` | export the built deck |
| `slideck import talk.pptx` | PowerPoint → `slides/*.html` |
| `slideck check [--update]` | overflow report + pixel regression |
| `slideck new-design` / `new-theme <name> --from <built-in>` | start your own design or theme in the deck folder |
| `slideck lint [--all]` | check custom designs and themes against the rules |
| `slideck list` · `slideck path` | available designs/themes/motions · where the package lives |

Every command works on the current folder or on `--root <dir>`. On Windows PowerShell, use `slideck.cmd` if the script policy blocks `slideck`.

## Use with AI agents

**Claude Code plugin:**

```
/plugin marketplace add mahdyarief/slideck-html
/plugin install slideck-html@mahdyarief
```

Then ask in plain words, e.g. *"make a 10-slide deck about our Q3 results, consulting design, slate-rust theme, and export a PDF"*. The agent writes `deck.json` + `slides/` in your project folder and runs the tools from the plugin. Update with `/plugin marketplace update mahdyarief`.

**Any other agent:** give it this repo URL. It reads [`AGENTS.md`](AGENTS.md) (rules) and then [`skills/slideck-html/SKILL.md`](skills/slideck-html/SKILL.md) (full workflow). The short version: edit only `slides/*.html` and `deck.json`, never the framework files; build with `node build.js`; verify with `node check.js`.

## Documentation

| Read | For |
|---|---|
| [skills/slideck-html/SKILL.md](skills/slideck-html/SKILL.md) | the complete reference: layouts and placeholder names, every design and theme, charts, diagrams, icons, layout blocks, export |
| [docs/slide-craft.md](docs/slide-craft.md) | what to put on slides: storyline, action titles, density, choosing charts, copy-paste recipes |
| [docs/motion.md](docs/motion.md) | motions, step-by-step builds and interactive components (swap, tabs, peek, hotspots, morph) |
| [docs/custom-design.md](docs/custom-design.md) | building your own design or theme: token contract, rules (D1–D9, T1–T4), checklist |
| [AGENTS.md](AGENTS.md) | the rules an AI agent follows in this repo |
| [examples/](examples/) | one demo deck built across design × theme combinations (`node examples/build-all.js`) |

## Repository layout

```
bin/slideck.js     CLI
build.js           slides/*.html → one dist/<output>.html
pdf.js · pptx.js   exports (headless Chrome)
import.js          .pptx → slides
check.js           overflow + pixel regression
template.html      deck shell: navigation, autofit, theme menu, print
core.css           components shared by every design
lib/               layout, chart, diagram, icon, shape, flowchart, pptx and font engines
layouts/           placeholder layouts for <slide layout="…">
designs/ themes/ motions/   the looks (design = shape, theme = colour + font, motion = transitions + choreography)
templates/         38 copy-paste slide templates (report, pitch, proposal, research); filled versions in examples/templates/
assets/fonts/      bundled OFL fonts, inlined at build time
skills/            the agent skill
site/              source of slideck.nimb.us.ci (itself a slideck-html deck)
examples/          demo decks
```

The framework files are frozen: `FROZEN.json` holds their hashes and the build warns when one changes. After an intentional change, run `node build.js --lock`.

## Contributing

```bash
git clone https://github.com/mahdyarief/slideck-html.git && cd slideck-html
node examples/build-all.js          # build every example
node bin/slideck.js lint --all      # design and theme rules
node check.js --examples            # overflow + pixel check (--update to accept intended changes)
node site/build.js                  # build the landing page into _site/
```

## License

MIT — see [LICENSE](LICENSE).
