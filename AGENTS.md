# AGENTS.md — instructions for ANY AI agent given this repo URL

You are building slides with slideck-html. Follow these rules exactly.

## 1. Read first (in order)
1. This file (`AGENTS.md`).
2. `skill/SKILL.md` — full workflow, 5 themes, 3 motions, 12 templates.
3. `deck.json` — current deck config (title, footer, output, theme, motion).

## 2. Frozen vs editable
- FROZEN (never edit, copy verbatim): `template.html`, `components.css`, `build.js`, `themes/`, `motions/`, `templates/`.
- EDITABLE (only these): `slides/*.html` + `deck.json`.
- NEVER edit `dist/` — it is build output.

## 3. Build a deck
```bash
node build.js   # reads deck.json + slides/*.html → dist/<output>.html
```
- New deck: copy `templates/<n>-*.html` → `slides/NN-name.html`, replace `[...]` only, keep all classes.
- Placeholders: `{{N}}`/`{{TOTAL}}` auto slide numbers, `[Footer kiri]` auto from `deck.footer`.
- `deck.json` fields: `title`, `footer`, `output`, `theme` (navy|paper|botanical|swiss|neon), `motion` (corporate|cinematic|playful).
- Verify: rebuild, open `dist/*.html` in browser, arrows navigate, no overflow.

## 4. Constraints
- Stage 1920×1080 fixed, scaled to viewport. No responsive breakpoints inside slides.
- Tables max 7 rows per slide; overflow → continuation slide.
- Themes override only `:root` tokens; motions only `.reveal` timing. Structure stays frozen.
- Zero dependency: node stdlib only. Fonts via Google Fonts link with system fallback.

## 5. Install as skill (optional)
```bash
mkdir -p ~/.openclaude/skills/slideck-html
cp -r skill/SKILL.md template.html components.css build.js themes motions templates ~/.openclaude/skills/slideck-html/
```
