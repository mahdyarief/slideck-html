---
title: "Slides must fill their content area; check warns below 70% and .fill stretches the last block"
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 33, tokens: 220577 }
id: l-aa3c2e6e
scope: repo
status: active
src: agent
touches:
  - ".claude-plugin/plugin.json"
  - FROZEN.json
  - build.js
  - examples/html/architectural-navy.html
  - examples/html/brutalist-navy.html
  - examples/html/campus-paper.html
  - examples/html/campus-slide.html
  - examples/html/colloquium-paper.html
  - examples/html/components.html
  - examples/html/consulting-slate-rust.html
---

## Decided
- Content slides must fill at least 70% of each content placeholder's height (body, left, right, aside). check.js measures the union of the placeholder's children against its padded box and prints a `!` warning, not an error, so existing decks don't fail. Cover, section, blank and picture-caption are exempt because open space is designed there.
- `.fill` stretches the last block to the remaining height. The build wraps placeholder content in `.bul`, so the CSS targets both `.ph>.fill` and `.ph>.bul>.fill` (the `.bul` grows via `:has(>.fill)`). A first version with only `.ph>.fill` silently did nothing.
- The guidance replaced the old "a half-empty slide looks premium" rule: the user wants dense slides. White space is allowed only when designed (margins, gaps, the open field around one large element).

## Watch out
- At introduction the built-in examples and templates produce about 260 fill warnings. They are sparse by design of the old guidance, not a false positive.
- `.fill` on thin content just makes hollow cards and silences the warning. The guide tells agents to add substance first and use fill only from about 60–70% fill.
