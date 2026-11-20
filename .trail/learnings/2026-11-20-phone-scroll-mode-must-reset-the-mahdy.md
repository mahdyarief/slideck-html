---
title: "Phone scroll mode must reset the animation and step modes, or slide content stays hidden"
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 10, tokens: 20821 }
id: l-5b0087c7
scope: repo
status: active
src: agent
touches:
  - template.html
  - check.js
---

## Decided
- fit() calls modes() in the phone scroll branch too. It used to return before modes(), so html kept the desktop m-anim and m-steps classes in scroll mode. Every [data-m] unit then waited for an entrance animation that never runs (the slide never gets m-on in scroll mode), and data-step content stayed hidden. On phones only the kicker and title of each slide showed, which looked like "the font does not render".

## Watch out
- Fonts are inlined as base64 @font-face with font-display:swap, so a phone never needs them installed. When text looks missing on a device, check hidden elements first: count elements with an ancestor at opacity < 0.05 under phone emulation (CDP Emulation.setDeviceMetricsOverride 390×844, mobile:true, no reduced motion).
- Headless check.js runs at 1920×1080 with reduced motion, so it never exercises scroll mode or m-anim. Phone bugs need the live CDP check.
