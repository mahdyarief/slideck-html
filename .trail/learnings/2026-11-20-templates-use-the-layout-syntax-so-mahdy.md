---
title: "Templates use the layout syntax so designs apply, and any bracketed word left in a slide is flagged as an unfilled placeholder"
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 28, tokens: 234431 }
id: l-45cffd4f
scope: repo
status: active
src: agent
touches:
  - lib/diagram.js
  - core.css
  - docs/slide-craft.md
  - build.js
  - skills/slideck-html/SKILL.md
---

## Decided
- Every template uses the <slide layout> syntax with no inline style. The old 01–12 forced navy backgrounds and font sizes inline, so the chosen design never applied to them. The file numbers 01–12 are kept so old agent instructions still resolve. 19–38 add the slide types common in reports, pitches, proposals and research defences. SKILL.md lists them by purpose, with an order per deck type.
- Unfilled-placeholder rule: any [text] containing at least two letters in the slide text counts as unfilled. That includes chart and diagram labels, because SVG text is not stripped. Comments, pre, code, script, style and textarea are stripped. [1] and [2–4] (citations), [sic] and [Footer kiri] are allowed. The old rule only matched a fixed word list (KICKER, Judul…), so [Nilai 1] or [Tahap 1] slipped through. Because numeric-only placeholders are invisible to this rule, every template placeholder contains a word.
- The new blocks (.people, .tiers, td.yes/.no, ol.refs, .logos) live in core.css, not in each design. That way all 19 designs get them without failing design-lint's REQUIRED list. The new diagram types (nested, positioning, gantt) live in lib/diagram.js and reuse the existing .dg classes (q, l1–l5, k, dot, ln).

## Watch out
- Designs style ol li::before and ::marker. .refs needs `.slide .refs>li::before` with width, background and border reset, or the design's marker replaces [n].
- Example content must not use real people's names or unverifiable citations. The references in examples/components are real works only.
