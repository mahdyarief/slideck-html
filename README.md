# slideck-html

Stable single-file HTML slide decks. Frozen template + per-slide files + `node build.js` (stdlib only, zero dependency).

Stage fixed **1920×1080**, scaled to viewport. Three dimensions separated: **theme** (color+font) × **layout** (12 templates) × **content** (`slides/`).

## For AI agents: read this first

If you were given this repo URL and asked to make slides, do exactly this:

1. **Read** `AGENTS.md` (rules), then `skill/SKILL.md` (workflow + themes + motions + templates).
2. **Never edit** `template.html` or `components.css`. Edit only `slides/*.html` + `deck.json`.
3. **New deck:** copy `templates/<n>-*.html` → `slides/NN-name.html`, replace `[...]` placeholders only, keep classes.
4. **Build:** `node build.js` → `dist/<output>.html`. Open in browser to verify.
5. **Tables max 7 rows** per slide — overflow goes to a continuation slide.

## Quickstart (human)

```bash
git clone https://github.com/mahdyarief/slideck-html.git
cd slideck-html
node build.js            # builds dist/contoh-deck.html from slides/
# new deck: edit deck.json (title/footer/output/theme/motion), put slides in slides/, run node build.js
```

## Layout

```
template.html      FROZEN shell ({{TITLE}} {{COMPONENTS}} {{SLIDES}} + nav JS)
components.css     FROZEN structure (cards, grids, tables, timeline, checklist…)
build.js           node stdlib: slides/*.html → dist/<output>.html
deck.json          title, footer, output, theme, motion
themes/            navy (default) · paper · botanical · swiss · neon  (:root overrides only)
motions/           corporate (default) · cinematic · playful  (.reveal timing only)
templates/         12 copy-paste layouts with [...] placeholders
slides/            YOUR content (only dir you + AI edit)
dist/              build output (never edit)
skill/SKILL.md     agent skill file (install: copy skill/ → ~/.openclaude/skills/slideck-html/)
examples/          sample decks
```

## Themes & motions

`deck.json`: `"theme": "navy" | "paper" | "botanical" | "swiss" | "neon"`, `"motion": "corporate" | "cinematic" | "playful"`. Build inlines `components.css + themes/<t>.css + motions/<m>.css`. Wrong name → fallback + warning.

## Install as AI skill

```bash
mkdir -p ~/.openclaude/skills/slideck-html
cp -r skill/SKILL.md template.html components.css build.js themes motions templates ~/.openclaude/skills/slideck-html/
```

## License

MIT.
