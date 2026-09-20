# AGENTS.md — instructions for ANY AI agent given this repo URL

You are building slides with slideck-html. Follow these rules exactly.

## 1. Read first (in order)

1. This file (`AGENTS.md`).
2. `skills/slideck-html/SKILL.md` — full workflow, 10 designs, 5 themes, 3 motions, 12 templates.
3. `deck.json` — current deck config (title, footer, output, design, theme, motion).

## 2. Frozen vs editable

- FROZEN (never edit, copy verbatim): `template.html`, `build.js`, `pdf.js`, `designs/`, `themes/`, `motions/`, `templates/`, `assets/`.
- EDITABLE (only these): `slides/*.html` + `deck.json`.
- NEVER edit `dist/` — it is build output (regenerate with `node build.js`).

## 3. Build a deck

```bash
node build.js   # reads deck.json + slides/*.html → dist/<output>.html
node pdf.js     # dist/<output>.html → dist/<output>.pdf, one slide per page
```

- New deck: copy `templates/<n>-*.html` → `slides/NN-name.html`, replace `[...]` only, keep all classes.
- Placeholders: `{{N}}` / `{{TOTAL}}` auto slide numbers, `[Footer kiri]` auto from `deck.footer`.
- `deck.json` fields: `title`, `footer`, `output`, `design` (default|editorial|brutalist|geometric|architectural|ribbon|plate|campus|keynote|colloquium), `theme` (navy|paper|botanical|swiss|neon), `motion` (corporate|cinematic|playful).
- Skip a slide file without deleting it: prefix the filename with `_`.
- Verify: rebuild, open `dist/*.html` in browser, arrows navigate, no overflow.

## 4. Constraints

- Stage 1920×1080 fixed, scaled to viewport. No responsive breakpoints inside slides.
- Tables max 7 rows per slide; overflow → continuation slide.
- Designs own shape (structure, spacing, typography treatment) and style only through the shared token names; themes override only `:root` color+font tokens; motions only `.reveal` timing. A design never hardcodes a color — that is what lets any design work with any theme.
- Zero dependency: node stdlib only. Fonts are inlined base64 from `assets/fonts/` (no network at build or run time).
- Text on `--navy` uses `var(--on-navy)`; body text on light surfaces uses `var(--ink)`. Never hardcode a hex color.
- The build warns if a frozen file's hash differs from `FROZEN.json`. Regenerate deliberately with `node build.js --lock` only when you intentionally changed a frozen file.

## 5. Install as skill (optional)

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