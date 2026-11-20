---
title: "Old reveal animation class is always neutralized, so no design can blank its slides in final, edit or static mode"
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 57, tokens: 153045 }
id: l-8ce774ac
scope: repo
status: active
src: agent
touches:
  - ".claude-plugin/plugin.json"
  - AGENTS.md
  - FROZEN.json
  - README.md
  - build.js
  - check.js
  - core.css
  - designs/editorial/design.json
  - designs/keynote/design.json
  - designs/organic/design.json
---

## Decided
- The old motion-v1 .reveal class is always neutral (html .slide .reveal → visible) in core.css, not only under html.m-anim. Motion v2 animates content through [data-m], so nothing needs .reveal hidden any more. When it was scoped to m-anim, the spotlight and dark-academia designs went blank in ?final, edit mode and the static motion: they hide .reveal but, unlike the other 17 designs, have no `.visible .reveal{opacity:1}` rule.

## Watch out
- Local headless Chrome reports prefers-reduced-motion, and template.html then forces .reveal visible. That hid this bug locally and in check.js, while the CI thumbnails (site/build.js, Linux Chrome without reduced motion) came out blank. Test final-mode visibility in the live CDP-driven Chrome, which has no reduced motion, for example by counting elements under an ancestor with opacity < 0.05.
