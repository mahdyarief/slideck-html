---
title: Slides use bold points with one short support line; check warns on narrative paragraphs and wordy slides
author: Mahdy
date: 2026-11-20
branch: main
cost: { minutes: 17, tokens: 25021 }
id: l-2a91d7d8
scope: repo
status: active
src: agent
touches:
  - check.js
  - docs/slide-craft.md
  - skills/slideck-html/SKILL.md
---

## Decided
- Slides carry points with a short support line, never descriptive narrative. check.js warns (`!`, not an error) on content slides when:
  - a text block (p, li, leaf card div) is over 25 words;
  - a block has 2+ sentences and is over 12 words;
  - the body totals over 90 words.

  Narrative belongs in speaker notes.
- Deliberate long sentences are allowed: the user wants conclusions, quotes and highlighted statements to stay full sentences. They are exempt, about one per slide: takeaway ("Kesimpulan"), .quote / blockquote, .callout, and any element marked data-prose (research question, thesis, mission). References, tables, source lines, titles, kickers and subtitles are also not counted.
- The "fill the slide" rule (density) and this rule must be read together. Empty space is fixed with more points, numbers and bigger visuals, never with longer sentences. The guide says so explicitly, so the two warnings don't push agents toward prose.

## Watch out
- The thresholds were calibrated on the built-in examples, landing and templates: none produce a narrative warning. Only the features deck trips the word total (97 and 105 words). The 12-word two-sentence rule is what catches short two-sentence explanations in a bullet.
