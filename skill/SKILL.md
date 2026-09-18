---
name: slideck-html
description: Use when creating stable single-file HTML slide decks, weekly reporting slides, or reusing the frozen 1920x1080 slideck template system
---

# slideck-html

Single-file HTML deck framework. Frozen template + components, per-slide files, node build. Tiga dimensi dipisah: theme (warna+font) × layout (templates/ 12 pola) × content (slides/).

## Rule

- AI may only edit `slides/*.html` + `deck.json`. NEVER edit `template.html` or `components.css`.
- Reference files live in this skill folder: `template.html`, `components.css`, `build.js`, `templates/01-12.html`, `themes/*.css`, `motions/*.css`.

## Workflow (new deck)

1. Create work dir: `deck-<name>/` with `slides/`, copy `build.js` + `template.html` + `components.css` + `themes/` + `motions/` from this skill folder into it.
2. Write `deck.json`: `{"title":"...","footer":"...","output":"<name>.html","theme":"navy","motion":"corporate"}`.
3. Copy needed files from `templates/` to `slides/NN-name.html`, replace `[...]` placeholders only. Keep classes as-is.
4. Placeholders: `{{N}}`/`{{TOTAL}}` = slide numbers, `[Footer kiri]` = replaced from deck.json footer.
5. Run `node build.js` → `dist/<output>.html`. Open in browser. Revise only in `slides/`.

## Themes (5, dari frontend-slides STYLE_PRESETS)

| theme | Sumber | Cocok untuk |
|---|---|---|
| navy (default) | house-style 18 SEP | weekly report, formal |
| paper | Paper & Ink #12 | laporan editorial terang |
| botanical | Dark Botanical #4 | premium, keynote |
| swiss | Swiss Modern #11 | presisi minimal |
| neon | Neon Cyber #9 | techy, bukan formal |

Absorb: tiap theme hanya override `:root` token (8 warna + 2 font) — struktur `.card/.grid/.tag/table.t` tetap dari components.css sehingga stabil. JANGAN tambah theme tanpa test build.

## Motions (3, dari frontend-slides animation-patterns)

| motion | Rasa | Delay d1/d2/d3 |
|---|---|---|
| corporate (default) | subtle fast 300ms | 60/120/180ms |
| cinematic | slow fade+scale 1s | 150/300/450ms |
| playful | bouncy spring 550ms | 100/200/300ms |

Absorb: hanya `.reveal/.visible` timing — nav (fit/go/keyboard/click-zone/swipe) tetap frozen di template.html. `prefers-reduced-motion` dihormati.

## Templates (12 layouts)

01 cover-split-kpi · 02 title-cards-3 · 03 compare-2col · 04 table-detail (max 7 rows) · 05 mapping-2col · 06 scope-4box · 07 stat-full-navy · 08 rows-list · 09 blocker-2col · 10 quote-closing · 11 timeline · 12 checklist

Tidak diabsorb dari frontend-slides: Phase 1-2 discovery (tanya purpose/length/density + 3 style preview) — slideck untuk stabilitas report berulang, bukan eksplorasi gaya baru. Kalau butuh gaya baru, pakai frontend-slides dulu, lalu bekukan hasilnya jadi theme baru di sini.

## Constraints

- Stage 1920x1080 fixed, scaled to viewport. No responsive breakpoints inside slides.
- build.js: `components = components.css + themes/<theme>.css + motions/<motion>.css`, fallback ke navy/corporate bila nama salah.
- Tables max 7 rows per slide; overflow → split slide.
- Zero dependency: node stdlib only, no CDN/npm at runtime (fonts via Google Fonts link with system fallback).

## Mistakes

| Mistake | Fix |
|---|---|
| Editing template.html/components.css per deck | Copy verbatim; style changes go in slides/ inline style only |
| Editing dist/ output directly | Edit slides/ then rebuild |
| Cramming >7 table rows | Split into continuation slide |
| Theme baru tanpa test | Wajib `node build.js` + buka browser sebelum merge |
