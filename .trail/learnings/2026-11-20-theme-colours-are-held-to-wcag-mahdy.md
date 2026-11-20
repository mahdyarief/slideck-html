---
title: "Theme colours are held to WCAG AA by how each token is used, with scoped fixes for accents close to the dark surface"
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 92, tokens: 480210 }
id: l-81c19da1
scope: repo
status: active
src: agent
touches:
  - ".github/workflows/pages.yml"
  - AGENTS.md
  - FROZEN.json
  - README.md
  - build.js
  - core.css
  - examples/html/architectural-navy.html
  - examples/html/brutalist-navy.html
  - examples/html/campus-paper.html
  - examples/html/campus-slide.html
---

## Decided
- Theme tokens follow WCAG AA for how each token is used: 4.5:1 for normal text (body, --mut, --on-navy-mut, --teal-d, tags at 18px), 3:1 for large text (kicker 19px bold, big numbers, diagram titles) and for accent fills behind --on-teal text. slideck lint T3 checks these pairs, including on --grey (consulting slides sit on --grey, not --surface).
- When the accent is close to the dark surface (terracotta, campus-slide), no single --teal passes on both light and dark backgrounds. The theme sets --accent-on-dark and the build adds a kicker/idx rule scoped to that theme only, so the 19 designs are untouched.
- Light accents (gold, aqua) get --on-teal: var(--navy) rather than a darker brand colour.
- On dark panels, .cmd and the is-key .tag use a thin outline instead of a light tint: the tint pushed light text below 4.5:1.

## Tried and ruled out
- Mixing the accent toward --on-navy for code syntax colour on --navy: still fails in terracotta (its navy is rust). Code now uses bold + dim, not colour.

## Watch out
- A contrast audit that switches data-theme and measures immediately reads colours mid CSS-transition (old theme values). Disable transitions first, or wait.
- Chrome reports color-mix() results as color(srgb r g b) with 0-1 channels, not rgb().
- Optional theme tokens (--on-teal, --accent2, --on-accent2, --cover) must get defaults inside each [data-theme] scope; otherwise the deck theme's :root value leaks into the theme picked in the switcher.
- Text on SVG shapes (diagrams) needs the shape fill as background; elementsFromPoint can pick the wrong layer, so check those by eye.

In the code: build.js (OPTIONAL_TOKENS, accent-on-dark rule), lib/design-lint.js PAIRS, core.css pre.code / .cmd / .dg text.td.on, themes/*.css.
