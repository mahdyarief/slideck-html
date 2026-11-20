# Custom designs and themes

slideck-html ships 19 designs and 10 themes. You can add your own **inside your deck folder** without touching the package. They are picked up by `build.js`, checked against the rules below on every build, and travel with your deck.

```
my-deck/
├── deck.json            "design": "acme", "theme": "acme-blue"
├── slides/
├── designs/acme/        your design   (components.css + design.json)
├── themes/acme-blue.css your theme    (:root tokens only)
├── motions/…            optional, same shape as the built-in motions/
└── fonts/               optional, your own font files + fonts.json
```

A deck-local design, theme or motion with the same name as a built-in one replaces it for that deck.

## Quick start

```bash
slideck new-design acme --from consulting   # copy a built-in design as a starting point
slideck new-theme acme-blue --from navy     # copy a built-in theme
# edit designs/acme/components.css and themes/acme-blue.css
# set "design": "acme", "theme": "acme-blue" in deck.json
slideck lint                                # check the rules
slideck build && slideck check              # render + overflow/pixel check
```

Without the npm CLI, use `node <slideck-html>/bin/slideck.js new-design …` and so on.

Always start from the built-in design that is closest to what you want. A design has to style about 25 classes, and copying one gets every class right from the start.

## Design vs theme: who owns what

| Layer | File | Owns | Never touches |
|---|---|---|---|
| **Design** | `designs/<name>/components.css` | Shape: layout, spacing, type scale, borders, radius, shadows, decoration | Colour values, the stage size, the shell UI |
| **Theme** | `themes/<name>.css` | Colour and font tokens in one `:root{…}` block | Selectors, layout |
| **Motion** | `motions/<name>.css` | `.reveal` timing | Everything else |

That split is what lets **any design work with any theme**. A design that hard-codes a colour breaks every theme except one, and the theme switcher in the built deck shows it immediately.

## The token contract

A design styles everything through these custom properties. A theme must define all of the required ones.

| Token | Meaning | Rule |
|---|---|---|
| `--surface` | slide / page background | light in most themes |
| `--ink` | main text (titles, body) on `--surface` / `--grey` / `--mint` | contrast ≥ 4.5 |
| `--mut` | secondary text (captions, footer, sources) | contrast ≥ 4.5 on `--surface` and `--grey` |
| `--grey` | panel / card surface | |
| `--navy` | the main **dark** surface (cover, stat panels, dark slides) | must be dark |
| `--on-navy` | text on `--navy` and on `--cover` | contrast ≥ 4.5 |
| `--on-navy-mut` | secondary text on `--navy` and `--cover` | contrast ≥ 4.5 |
| `--teal` | accent fill (bars, dots, rules) and large accent text (kickers, big numbers) | contrast ≥ 3 on `--surface`, `--grey`, `--navy`, `--cover` |
| `--teal-d` | accent used **as small text** (tags, table heads, links) | contrast ≥ 4.5 on `--surface`, `--grey`, `--mint`, `--tag-bg` |
| `--mint` | soft accent surface | |
| `--accent-line` | border of an accented card | |
| `--tag-bg` | background of the `.tag` pill | |
| `--line` | hairlines | |
| `--accent2` / `--on-accent2` | second accent and the text on it (optional; default `--teal-d`) | contrast ≥ 4.5 |
| `--cover` | cover background (optional; default `--navy`); its text is `--on-navy` | contrast ≥ 4.5 |
| `--font-d` / `--font-s` | display (sans) / serif font stacks | end with a generic family |
| `--ease` | easing curve | |

`core.css` also provides `--c1`…`--c6` (chart series), derived from the tokens above. The minimums follow WCAG 2.x AA for how each token is used: 4.5:1 for normal text, 3:1 for large text (≥ 24px, or ≥ 18.66px bold) and for accent fills.

Need another colour? Derive it from tokens. The theme then still controls it:

```css
.badge{background:color-mix(in srgb,var(--teal) 18%,var(--surface));color:var(--teal-d)}
.card{box-shadow:0 10px 30px color-mix(in srgb,var(--ink) 12%,transparent)}
:root{--panel-edge:color-mix(in srgb,var(--navy) 35%,var(--line))}   /* your own token: allowed when derived */
```

## Design rules (checked by `slideck lint` and on every build)

A rule marked **error** stops the build of a deck that uses the design. A **warn** only prints.

| Code | Level | Rule | Why |
|---|---|---|---|
| D1 | error | The folder has `components.css`. | |
| D2 | error | `design.json` is valid JSON with `name` equal to the folder name (`a-z 0-9 -`), plus `label` and `description`. `canvas` is `"dark"` or `"light"` if set. `recommended.theme` / `.motion` must exist (a missing `recommended` only warns). | Name lookup, the design list, agent guidance |
| D3 | error | No selectors for the shell UI (`.deck-controls`, `.deck-stage`, `.deck-viewport`, `.progress`, `.deck-theme-switcher`, `.slide-notes`, `#bar`, `#pg`, `#stage`, `#theme-btn`, `#theme-list`, `.dts-*`, `.cn-h`, `.cn-l`). No `@page` or `@font-face`. On `html` / `body`, only `font-family` and `-webkit-font-smoothing`. | The shell owns navigation, print and fonts |
| D4 | error | `.slide{…}` may not set its size or stacking: `width`, `height`, `position` (except `relative`), `inset`, `top/left/…`, `display`, `visibility`, `opacity`, `transform`, `z-index`, `transition`. `background` and `padding` are fine. | The stage is fixed at 1920×1080 and scaled by the shell |
| D5 | error | No fixed colours: no hex, `rgb()`, `hsl()` or colour names in colour properties or custom properties. Exception: fallback values for **contract** tokens inside `:root`, which the theme always overrides. A plain black or white `rgba()` in a shadow only warns. | Any design × any theme |
| D6 | error | Every `var(--x)` is a contract or core token, or a custom property the design defines itself. | A typo becomes a silent transparent / black |
| D7 | error | No `@import` and no `url(http…)`; inline assets as `data:` URIs. | Build and deck stay offline and single-file |
| D8 | warn | No `font-size` below 18px. | The stage is 1920 px wide; under 18 px is unreadable when projected |
| D9 | error / warn | Must style the core classes: `.pad .kicker .title .card .bul .small .foot .tag .kpi-num .kpi-lab .t` (error). Should style `.rule .quote .timeline .checklist .map .mapcol .arrow .grid2 .grid3` (warn). | The layouts and templates use them |

## Theme rules

| Code | Level | Rule |
|---|---|---|
| T1 | error | The file is only `:root{…}`: no other selectors. |
| T2 | error | Every required token is present. A missing `--accent2`, `--on-accent2` or `--cover` only warns. |
| T3 | error / warn | Contrast pairs from the token table (WCAG AA). Text pairs that need 4.5:1 but are below 3:1 are errors; other misses are warnings. `--navy` must be dark. Colours must be hex or `rgb()` so they can be checked. |
| T4 | warn | `--font-d` ends with a generic family (`sans-serif`, `serif`, `system-ui`, …). |

## Classes a design styles

Copy the full list from `designs/default/components.css`. That file is the reference implementation, about 60 lines. The groups:

- **Frame:** `.pad` (slide padding; the layouts put their grid on it), `.foot` (footer, absolutely positioned at the bottom).
- **Type:** `.kicker`, `h1.title` (+ `h1.serif`), `.bul`, `.small`, `.quote`, `.stat-big` (text on `--navy`).
- **Blocks:** `.card` (+ `.card.accent`), `.tag`, `.rule`, `.kpi-num` / `.kpi-lab`, `.grid2` / `.grid3` / `.grid4`.
- **Diagrams:** `.map` / `.mapcol` / `.arrow`, `.timeline .step .dot`, `.checklist li`.
- **Table:** `table.t th`, `table.t td`, `td.n` (right-aligned numbers).
- **Dark slides:** `<slide dark>` and design canvases on `--navy` get `.slide.dark` / `.on-dark`. `core.css` already switches the common text to `--on-navy`. Add overrides for anything of your own that sits on dark.

**Shared blocks you get for free.** `core.css` also styles `.rows`, `.idx`, `.is-key`, `.bands`, `.hero`, `.with-aside`, `.callout`, `.boxed`, `.chips`, `.source`, icons (`.ico`, `.ico-badge`) and `<diagram>` SVGs (`.dg`) from tokens, and builds them on top of your `.card`, `.tag` and `h3`, so they already match your design. You may restyle them (e.g. `border-radius:0` for a sharp design, an outline instead of a fill on `.card.is-key`); keep the structure (grid columns, which child is the marker) intact. See `designs/lineart/components.css` for an example.

Don't redefine the placeholder grid (`.pad.lay-*`, `.ph-*`). It lives in `core.css`, and `pptx.js` / `check.js` rely on it. Adjust spacing through `.pad` padding and the type scale instead.

## design.json

```json
{
  "name": "acme",
  "label": "Acme Report",
  "description": "Company report: white canvas, thick accent rule under titles, square cards. For monthly management reports.",
  "recommended": { "theme": "acme-blue", "motion": "corporate" },
  "canvas": "light"
}
```

`canvas` is optional. Without it, the build detects a dark design from `.slide{background:var(--navy)}`, and charts and shapes then use their light-on-dark variants.

## Fonts for a custom theme

- **Bundled fonts:** name a bundled family in `--font-d` / `--font-s` (for example `'Inter'`, `'IBM Plex Sans'`, `'Crimson Pro'`; see `assets/fonts/fonts.json`). The build embeds it automatically.
- **Your own fonts:** put WOFF / TTF / OTF files in `<deck>/fonts/` with a `fonts.json` keyed by theme name. Only use fonts whose licence allows embedding (OFL is fine). They are embedded in the HTML and in the `.pptx`.

```json
{ "acme-blue": [
  { "file": "acme-sans-400.woff", "family": "Acme Sans", "weight": "400" },
  { "file": "acme-sans-700.woff", "family": "Acme Sans", "weight": "700" }
] }
```

- **No font file:** fonts that are not embedded fall back to the generic family at the end of the stack.

## Checklist before you use it

1. `slideck lint`: no errors.
2. `slideck build`, then open `dist/<output>.html` and arrow through every slide.
3. Use the theme dropdown (top-right) to try several themes. If something looks wrong in one theme, a colour is probably fixed or a token is used for the wrong job.
4. `slideck check`: no overflow. Run `--update` once to save a pixel baseline for future changes.
5. `slideck pdf` and `slideck pptx`, if you hand those out.

## Contributing a design to slideck-html itself

Put it in `designs/<name>/` in the repo and add a sample in `examples/`. Then run `node build.js --lock`, `npm run lint` and `npm run examples`. Built-in designs are frozen: they are hash-locked in `FROZEN.json`.
