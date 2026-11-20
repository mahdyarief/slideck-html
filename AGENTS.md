# AGENTS.md — instructions for ANY AI agent given this repo URL

You are building slides with slideck-html. Follow these rules exactly.

## 1. Read first (in order)

1. This file (`AGENTS.md`).
2. `skills/slideck-html/SKILL.md` — full workflow, 19 designs, 10 themes, 3 motions, 12 templates.
3. `deck.json` — current deck config (title, footer, output, design, theme, motion).

## 2. Frozen vs editable

- FROZEN (never edit, copy verbatim): `template.html`, `core.css`, `build.js`, `pdf.js`, `pptx.js`, `import.js`, `check.js`, `bin/`, `lib/`, `layouts/`, `designs/`, `themes/`, `motions/`, `templates/`, `assets/`.
- EDITABLE (only these): `slides/*.html` + `deck.json`, plus a custom design or theme in the **deck** folder (`<deck>/designs/<name>/`, `<deck>/themes/<name>.css`). Create them with `node bin/slideck.js new-design|new-theme <name> --from <built-in>`, follow `docs/custom-design.md`, and check with `node bin/slideck.js lint`.
- NEVER edit `dist/` — it is build output (regenerate with `node build.js`).

## 3. Build a deck

```bash
node build.js   # reads deck.json + slides/*.html → dist/<output>.html
node pdf.js     # dist/<output>.html → dist/<output>.pdf, one slide per page
```

- New deck, preferred: write `slides/NN-name.html` as `<slide layout="title|section|title-content|two-content|comparison|title-only|content-caption|picture-caption|content-aside|blank" [dark] [notes="..."]>` with `<ph name="...">` placeholders (names per layout in SKILL.md). Empty placeholders are dropped.
- Or copy `templates/<n>-*.html` → `slides/NN-name.html`, replace `[...]` only, keep all classes.
- Visuals, drawn at build time as SVG and coloured by the theme:
  - `<chart type="bar|hbar|line|area|pie|doughnut">` with `labels: …` / `Series: …` lines;
  - `<diagram type="venn|matrix|cycle|funnel|pyramid|scale">` with one `Title: description` line per item (`key: N` highlights one);
  - `<icon name="target" [badge] [tone="accent2|navy|soft"]>` line icons (names in SKILL.md);
  - layout blocks in any design: `.rows`, `.is-key`, `.bands`, `.hero`, `.with-aside`, `.callout`, `.boxed`, `.chips`, `.source` (SKILL.md §3);
  - `<shape type="…">text</shape>` and `<connector from="#a" to="#b">`;
  - `<pre class="mermaid">flowchart LR …</pre>`.
- PowerPoint: `node import.js file.pptx --root <dir>` (pptx → slides), `node pptx.js` (built deck → editable .pptx).
- Placeholders: `{{N}}` / `{{TOTAL}}` auto slide numbers, `[Footer kiri]` auto from `deck.footer`.
- `deck.json` fields: `title`, `footer`, `output`, `design` (default|editorial|brutalist|geometric|architectural|ribbon|plate|campus|keynote|colloquium|lesson|spotlight|dark-academia|consulting|scholar|organic|minimal|campus-slide|lineart), `theme` (navy|paper|botanical|swiss|neon|slate-rust|petrol-gold|terracotta|parchment-gold|campus-slide), `motion` (corporate|cinematic|playful).
- Optional `data-notes="..."` on a `<section class="slide">` adds speaker notes: hidden on screen, printed as their own page after that slide by `node pdf.js`.
- Skip a slide file without deleting it: prefix the filename with `_`.
- Verify: rebuild, then `node check.js`. It exits 1 on overflow that autofit could not fix, broken components, or pixel changes from the baseline; `--update` accepts intended changes. Open `dist/*.html#N` to look at slide N. The built deck has a theme dropdown (top-right) that swaps palettes at runtime without a rebuild.

## 4. Constraints

- Stage 1920×1080 fixed, scaled to viewport. No responsive breakpoints inside slides.
- Tables max 7 rows per slide; overflow → continuation slide. Autofit shrinks overflowing text down to 0.55 scale, but `check.js` warns below 0.75 — cut content instead of relying on it.
- Designs own shape (structure, spacing, typography treatment) and style only through the shared token names; themes override only `:root` color+font tokens; motions only `.reveal` timing. A design never hardcodes a color — that is what lets any design work with any theme.
- Zero dependency: node stdlib only. Fonts are inlined base64 from `assets/fonts/` (no network at build or run time); every theme has its own bundled OFL pair. `deck.json` `fonts`: `theme` (default) | `all` | `none`. `node pptx.js` embeds the same fonts into the .pptx.
- `<ph name="takeaway">` (title-content, two-content, comparison, title-only, content-caption) adds a conclusion band under the content; start it with `<b>Kesimpulan:</b>`.
- Theme tokens beyond the core set: `--accent2` / `--on-accent2` (second accent, e.g. the campus-slide footer bar) and `--cover` (cover background; text on it is `--on-navy`).
- Text on `--navy` uses `var(--on-navy)`; body text on light surfaces uses `var(--ink)`. Never hardcode a hex color.
- The build warns if a frozen file's hash differs from `FROZEN.json`. Regenerate deliberately with `node build.js --lock` only when you intentionally changed a frozen file.

## 5. Install as skill (optional)

Install from the marketplace (auto-updates with the repo):

```
/plugin marketplace add mahdyarief/slideck-html
/plugin install slideck-html@slideck-html
```

Or install as a skill folder: clone the whole repo (the skill needs every tool and asset) and put `SKILL.md` at its top level:

```bash
git clone https://github.com/mahdyarief/slideck-html.git ~/.claude/skills/slideck-html
cp ~/.claude/skills/slideck-html/skills/slideck-html/SKILL.md ~/.claude/skills/slideck-html/SKILL.md
```

When installed either way, write the user's deck (`deck.json` + `slides/`) in their project folder, never in the plugin or skill folder, and run the tools by full path from there. See README "Use as a Claude Code plugin".