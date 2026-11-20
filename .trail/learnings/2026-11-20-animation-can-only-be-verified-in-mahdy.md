---
title: "Animation can only be verified in a live CDP-driven Chrome, not the headless probe"
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 1, tokens: 813 }
id: l-a99e33b1
scope: repo
status: active
src: agent
touches:
  - lib/browser.js
  - template.html
  - core.css
---

## Decided
Motion v2 is only tested in a live Chrome driven over the DevTools protocol (--remote-debugging-port, Emulation.setEmulatedMedia prefers-reduced-motion=no-preference, real Input.dispatchKeyEvent, Page.captureScreenshot at timed points). The one-shot probe() in lib/browser.js cannot test animation.

## Tried and ruled out
- probe()/--dump-dom: headless Chrome reports prefers-reduced-motion: reduce, so the engine correctly turns animation off (html gets m-steps but not m-anim) and every frame looks finished.
- Testing hover components (peek, focus-group, hotspot) by hovering: headless reports (hover:none), so the @media (hover:hover) rules never apply. Test them with a click (.open) or keyboard focus instead.

## Watch out
- A slide keyframe that animates clip-path needs an explicit `to{clip-path:inset(0 0 0 0)}`. With only `from`, the browser cannot interpolate to `none`, so the wipe jumps at 50% and the new slide shows blank (its units still masked).
- Interactive controls must not take over ArrowLeft/ArrowRight: a presenter remote sends those, and after clicking a swap/tab button the deck got stuck. Buttons blur after a mouse click; keyboard users use Tab + Enter.

In the code: template.html (modes(), swapSlides, buildStacks), core.css MOTION v2 section, motions/editorial.css.
