---
title: "Layout blocks reuse each design's card and tag; concept diagrams are build-time SVG"
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 1, tokens: 767 }
id: l-3c46acc7
scope: repo
status: active
src: agent
touches:
  - core.css
---

## Decided
- New layout blocks (rows, bands, hero, side panel, callouts, chips) are wrappers around the design's own `.card`, `.tag` and `h3`, not new boxes with their own look. That way they match all 19 designs without per-design CSS; a design may restyle them (lineart sets radius 0, outline highlight).
- Concept diagrams (venn, matrix, cycle, funnel, pyramid, scale) are drawn at build time as SVG like charts, not via Mermaid, because Mermaid has no such types and PPTX export already handles any inline SVG as a vector picture.
- Icons are our own 24x24 stroke paths, not a copied icon set, to stay zero-dependency with no licence questions.

## Watch out
- Text next to an icon or number inside `.rows` / `.callout` must be wrapped in an element: these are CSS grids, so a loose `<b>` becomes its own grid cell and breaks the row.
- A highlighted card (`.is-key`) with an icon badge: the icon colour rule must skip icons inside `.ico-badge`, otherwise the icon takes the badge colour and disappears.

In the code: core.css (DIAGRAM … SUMBER sections), lib/diagram.js, lib/icon.js, layouts/content-aside.html, designs/lineart/, examples/components/.
