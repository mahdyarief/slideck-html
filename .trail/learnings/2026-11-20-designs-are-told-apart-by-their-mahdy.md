---
title: "Designs are told apart by their composition (cover, section, title layout), not by colour"
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 1, tokens: 887 }
id: l-c78a64f2
scope: repo
status: active
src: agent
touches:
  - core.css
  - site/build.js
---

## Decided
Each design now differs in composition, not just colour: its own cover (lay-title), section (lay-section), title placement and cards, written as a "SIGNATURE" block at the end of designs/<name>/components.css. The example deck (examples/slides) uses placeholder layouts with no inline styles, so the design controls everything.

## Tried and ruled out
Restyling cards and colours alone: the designs still looked alike because the old example templates carried inline styles (inline beats design CSS) and only campus-slide and lineart styled lay-title/lay-section.

## Watch out
- Some designs (dark-academia, spotlight, lesson) had no `.timeline{display:flex}`; it used to come from inline template styles. Every design must define its own horizontal timeline.
- Designs with a dark canvas (ribbon, keynote, dark-academia) get `.slide.dark`, so core makes card text light even inside light cards. Fix that in the design (`.card:not(.is-key)` text colour = ink/mut).
- A light cover on a dark slide needs high specificity, e.g. `.slide.dark:has(>.pad.lay-title) .ph-kicker .kicker`, to beat the theme's accent-on-dark rule.
- Don't hide text with opacity:0 (the WCAG audit counts it as ratio 1); use visibility:hidden. Don't absolutely position a placeholder (autofit reports it as overflowing).

In the code: designs/*/components.css (SIGNATURE block), core.css (.ph-aside>.card padding, .timeline .step.is-key text inherit), site/build.js shot() captures with animations off.
