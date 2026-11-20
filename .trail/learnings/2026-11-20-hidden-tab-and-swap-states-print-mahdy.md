---
title: "Hidden tab and swap states print as extra pages, and interaction is verified through text output"
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 23, tokens: 191543 }
id: l-2cff93be
scope: repo
status: active
src: agent
touches:
  - template.html
  - lib/interactive-lint.js
  - check.js
  - lib/ooxml.js
  - skills/slideck-html/SKILL.md
  - docs/motion.md
  - deck.json
  - pptx.js
  - lib/pptx-read.js
  - pdf.js
---

## Decided
- Content hidden inside interaction must never be lost in exports. Each extra state of a .swap/.tabs is printed as its own page: slideckFinal() (used by pdf ?final, check, pptx) and beforeprint clone the slide once per extra state (.m-copy, data-copy-of, data-state). layoutAll() fits every .deck-stage>.slide, so state pages get autofit and check reports their overflow. data-print="first|last" opts out.
- Agents cannot watch animation, so interaction is verified through text: build warnings (lib/interactive-lint.js, regex on rendered slide HTML), check.js "~" summary lines per slide, and #N.k deep links for screenshots of a step.
- deck.json "interactive": "live" | "shared" drives the warnings. A live deck may not use hover-only components or button-only swaps/tabs. The ">40% interactive slides" rule skips shared decks.
- PowerPoint: steps ↔ on-click entrance Fade (pptx.js maps the template's sl._steps groups to item.step; lib/ooxml.js writes p:timing; lib/pptx-read.js readSteps parses mainSeq click groups for import). Verified by opening the file in real PowerPoint through COM (PowerPoint.Application, TimeLine.MainSequence.Count).

## Watch out
- pdf.js counts expected pages as slides + notes + state pages (counted statically with directChildren). Keep the counts in sync if the copy rule changes.
- check.js numbers slides by original order (copies use data-copy-of), not DOM index.
- In check.js PROBE_JS is a JS template literal: a regex there needs doubled backslashes.
