# Slide craft: substance first, then a premium layout

This guide is for the agent (or person) writing the deck. `SKILL.md` covers the syntax; this covers **what to put on each slide and how to make it look designed**, not just filled in. The design and theme give you a premium look for free, but only if the content uses them well.

The order is always **storyline → slide plan → write → build → look → polish**. Don't start writing HTML before the storyline exists.

---

## 1. Storyline before slides

### 1.1 Find the one message
Write one sentence: *"After this deck, the audience should believe / decide / do ___."* Every slide must serve it. If a slide doesn't, cut it or move it to an appendix.

### 1.2 Pick a structure

| Deck | Structure (one line = one slide or section) |
|---|---|
| **Weekly / monthly report** | Cover → headline numbers → what moved and why (1–3 slides) → issues / blockers → next steps → ask |
| **Management / client recommendation** | Cover → the answer up front → situation → complication → 2–4 supporting arguments (one slide each) → options compared → recommendation + ask → appendix |
| **Pitch** | Cover → problem → why now → solution → how it works → traction / proof → market → business model → team → ask |
| **Lecture / training** | Cover → learning goals → agenda → per topic: concept → example → check question → summary → exercise |
| **Research seminar** | Cover → research question → why it matters → prior work (1 slide) → method → results (1 per finding) → limitations → conclusion → future work |
| **Project / proposal** | Cover → background → objective → scope → approach / timeline → team → budget / risks → decision needed |

### 1.3 Write the titles first
Write **every slide title as a full-sentence takeaway**, then read the titles alone, top to bottom. They must tell the whole story. This is the single biggest quality lever.

| ❌ Topic title (empty) | ✅ Action title (says the point) |
|---|---|
| Revenue | Revenue grew 18%, driven by enterprise |
| Survey results | 3 in 4 students want recorded lectures |
| Timeline | Launch is on track for 3 March; testing is the risk |
| Methodology | We compared 4 models on the same 12k-sample test set |
| Next steps | We need budget approval by Friday to keep the March date |

Rules for titles:
- **One claim** per title. Specific: it contains a number, a direction or a decision.
- **≤ 2 lines** at the design's title size (about 60–70 characters). Shorter is better.
- The **kicker** above the title is the section label (`Q3 REVIEW`, `FINDING 2`). The title is the claim.
- Cover and section slides are the exception: a short noun phrase is fine there.

### 1.4 Plan slide by slide
Before writing HTML, produce a plan with one row per slide:

```
NN | layout | kicker | action title | proof (what the body shows) | takeaway (so-what)
03 | title-content | TREND | Aug spike came from the promo, not organic growth | bar chart Jul–Sep 2025 vs 2026 | Without the promo, growth was 6%
```

For decks over 8 slides, show the plan to the user and confirm it before building. It's far cheaper to fix the storyline than finished slides.

---

## 2. Substance: what goes in the body

The body **proves the title**. Nothing else belongs there.

### 2.1 Density: speaking or reading?
Ask, or infer from the use:

| | Speaker-led (presented live) | Reading-first (sent, read alone) |
|---|---|---|
| Ideas per slide | 1 | 1 (with more support) |
| Body text | ≤ 30 words; 1–3 bullets | ≤ 80 words; 3–6 bullets, or cards / table |
| Visual | one big chart, number or image | chart + 2–3 annotations, or a table |
| Detail | goes in speaker `notes` | on the slide, plus a takeaway band |
| Slide count | more slides, fewer words | fewer slides, self-contained |

If content exceeds the mode, **split the slide; never shrink it**. `check` flags autofit below 0.75 as "too much".

### 2.2 Make content concrete
- **Numbers beat adjectives:** "grew 18% (from $3.6M to $4.2M)", not "grew strongly". Always give the unit, the period and a comparison (vs last period, target or benchmark).
- **Name the source** of any external number in `.small` text under the chart or table: `Source: BPS 2025, n = 1,204`.
- **Bullets are parallel:** all start the same way (all verbs, or all nouns), each ≤ 2 lines, nested at most 2 levels. Use bold for the key word, not whole sentences.
- **No filler:** cut "In this slide we will…", "It is important to note…", "Overview".
- **One emphasis per slide:** one accent card, one highlighted number, one bold phrase. If everything is highlighted, nothing is.
- **Takeaway band** (`<ph name="takeaway"><b>Kesimpulan:</b> …</ph>`): use it on analysis slides for the so-what in one sentence. Don't repeat the title; add the consequence. Skip it on cover, section and agenda slides.
- **Speaker notes** (`notes="…"`): what you'd *say*. That means the story, transitions and extra detail, about 80–200 words for speaker-led decks. Write spoken language, not slide text.
- **Never invent facts.** If the user gave no data, use obviously marked placeholders (`[angka]`, `TBD`) and tell the user which slides need real figures.

### 2.3 Choose the visual from the content

| Your content is… | Use | Not |
|---|---|---|
| one headline number | **big stat** recipe (dark slide, `.stat-big`) | a chart with one bar |
| 2–4 key numbers | **KPI cards** (`.grid3` / `.grid4` of `.card` + `.kpi-num` / `.kpi-lab`) | a bullet list of numbers |
| change over time | `<chart type="line">` (many points) or `bar` (≤ 12 periods) | pie |
| part of a whole, ≤ 5 parts | `<chart type="doughnut">` with `center` | pie with 9 slices |
| ranking / many categories | `<chart type="hbar">`, sorted largest first | vertical bar with long labels |
| two things compared | `comparison` layout (before/after, us/them, option A/B) | one long bullet list |
| 3 options / pillars / features | **three cards** (`.grid3`), one marked `.accent` if recommended | 3 paragraphs |
| a process / phases / roadmap | `.timeline`, or chevron `<shape>`s, or a Mermaid `flowchart LR` | numbered paragraphs |
| a mapping / transformation | `.map` (from → to with `.arrow`) | a table |
| exact values to look up | `table.t`, ≤ 7 rows, `td.n` for numbers | a chart nobody can read values from |
| a status list / done–todo | `ul.checklist` | plain bullets |
| a strong quote / principle | `.quote` on a `section` or `title-only` slide | quote buried in bullets |
| a photo / screenshot | `picture-caption` layout | an image squeezed into a card |
| 3–8 steps or rules in order | `.rows` with `.idx` numbers, the critical one `.is-key` | a numbered paragraph |
| evidence + what to decide | `content-aside` layout: chart or table left, dark panel with the decision right | the decision as a footnote |
| before / after a change | `.bands` (stacked, label left) | two paragraphs |
| one striking number + its reasons | `.hero` (`.stat-big` left, `.rows` card right) | a big number alone with reasons on the next slide |
| a warning, caveat or note | `.callout.warn` / `.callout` with an icon | red text in a bullet |
| many short items (systems, tags, skills) | `.chips` | a 12-line bullet list |
| overlap of 2–3 ideas | `<diagram type="venn">` | three bullet lists |
| prioritising (impact × effort, risk × likelihood) | `<diagram type="matrix">` with `x:` / `y:` axes and `key` on the winning quadrant | a ranked list |
| a repeating loop | `<diagram type="cycle">` | a timeline that ends |
| drop-off between stages | `<diagram type="funnel">` with the counts, `key` on the leakiest stage | a bar chart of stages |
| layers / hierarchy / foundations | `<diagram type="pyramid">` | nested bullets |
| a maturity level / spectrum, "where we are" | `<diagram type="scale">` with `key` on the current stop | a sentence |

**Highlight one thing.** Every slide with several equal items (cards, rows, steps, chips, quadrants) should mark the one that matters: `.is-key` on HTML items, `key` on a `<diagram>`. One per slide; two is already noise.

**Icons** support a label, they never replace it. Use one icon per card or row, the same tone across a row, and skip icons rather than pick one that doesn't fit the meaning.

**Charts:** the title states the insight (not "Chart of sales"); keep one series dominant; label values (default on); no legend for a single series (`legend="off"`); size to the placeholder (≈1720×600 full width, ≈820×560 in a column).

---

## 3. Premium layout

The design supplies the polish. These rules make sure your content doesn't fight it.

1. **Vary the rhythm.** Never use the same layout three times in a row. A good 10-slide flow: cover → KPI cards → chart → comparison → section → cards → timeline → table → big stat → closing.
2. **Use dark slides as punctuation:** the cover, section breaks, and one big-stat or quote moment. Don't use them for routine content. One dark slide every 4–6 slides is plenty.
3. **Section dividers** (`section` layout) every 4–6 slides in decks over 10 slides. They give the audience a breath and a map.
4. **Leave white space.** A half-empty slide with one strong element looks premium; a full slide looks like a document. Don't add elements to fill space.
5. **One focal point.** Decide where the eye lands first: the big number, the highlighted card, or the chart's key bar. Everything else is quieter (`.small`, `--mut`).
6. **Keep grids honest:** 2, 3 or 4 equal cards. Every card in a row has the same structure (number + label, or title + 2 lines). Never 5+ text cards in a row.
7. **Align to the design.** Don't add inline `style` for margins, colours or sizes; the design already set them. If something looks off, it's usually too much content, not too little styling.
8. **Images:** use real ones (product shots, photos, diagrams the user gave). No stock-photo filler. See §3.1.
9. **Consistency:** one design, one theme, one motion per deck. Same kicker style throughout (all caps, short).

### 3.1 Images that never break the slide

Put image files in `<deck>/images/` and reference them relatively (`src="../images/x.png"` from `slides/`). The build **embeds every image as base64** into the single `.html`, and writes its real width and height so the space is reserved before it loads. Internet URLs are not embedded and trigger a warning; download the file instead.

Where you put an image decides how it behaves. All of these are handled by `core.css`, so you never need inline sizes:

| Where | Behaviour | Use for |
|---|---|---|
| `<ph name="picture">` (picture-caption) | **fills** the whole picture area, cropped to fit (`cover`); add `class="contain"` to show the whole image instead | photos, product shots, hero images |
| directly in a placeholder (`body`, `left`, `right`, `caption`) | **fits the remaining space**: shrinks big images, never enlarges small ones, never crops; text above or below it keeps its size | screenshots, diagrams, charts as images |
| `<div class="gallery">` with 2–4 `<img>` or `<figure><img><figcaption>` | equal 4:3 tiles in one row, cropped to fill | photo sets, before/after, examples |
| inside a `.card` | a 16:10 banner on top of the card, cropped, so every card in a row lines up | feature cards with a picture |
| `<img class="icon">` (in a card or anywhere) | 72×72, whole image, never cropped | logos, icons |
| loose on a slide (no placeholder) | placed in the content area under the title, whole image | rare; prefer a placeholder |

Rules:
- Always write `alt="…"` (accessibility; the build warns without it).
- Prefer PNG/JPG/WebP/SVG. Keep files under ~2 MB (the build warns above that). Export screenshots at about 1600–2000 px wide, enough for a 1920 stage.
- Crop or choose the image for its slot. A portrait photo in a landscape slot is cropped by `cover`, so use `class="contain"` or pick a different layout if the whole image matters.
- One image per placeholder, unless you use `.gallery`.

**Recipe: picture + message**
```html
<slide layout="picture-caption">
<ph name="picture"><img src="../images/new-dashboard.png" alt="New finance dashboard"></ph>
<ph name="title">Finance now runs the monthly close from one screen</ph>
<ph name="caption">Rolled out to 4 teams in September; close time fell from 6 days to 3.</ph>
</slide>
```

**Recipe: gallery**
```html
<slide layout="title-content">
<ph name="kicker">SITE VISIT</ph>
<ph name="title">All three warehouses now use the new racking</ph>
<ph name="body"><div class="gallery">
<figure><img src="../images/jakarta.jpg" alt="Jakarta warehouse"><figcaption>Jakarta · done Aug</figcaption></figure>
<figure><img src="../images/surabaya.jpg" alt="Surabaya warehouse"><figcaption>Surabaya · done Sep</figcaption></figure>
<figure><img src="../images/medan.jpg" alt="Medan warehouse"><figcaption>Medan · done Oct</figcaption></figure>
</div></ph>
</slide>
```

**Recipe: screenshot beside the explanation**
```html
<slide layout="two-content">
<ph name="kicker">HOW IT WORKS</ph>
<ph name="title">Approvals move from email to one queue</ph>
<ph name="left"><ul class="bul"><li>Requests arrive in one list</li><li>One click to approve or return</li><li>Every decision is logged</li></ul></ph>
<ph name="right"><img src="../images/queue.png" alt="Approval queue screen"></ph>
</slide>
```

### What makes a deck look AI-made (avoid)
- Every slide is title + 5 bullets.
- Generic titles: "Introduction", "Overview", "Key Points", "Conclusion".
- Six identical cards, each with an emoji and a three-word label.
- Numbers without a unit, period or comparison; made-up precision ("87.3%") with no source.
- A takeaway band that repeats the title.
- A dark background on every slide, or accent colour on everything.
- Text squeezed by autofit to fit. Split instead.

---

## 4. Recipes

Copy and adapt. They work with every design and theme. Replace the text, and keep the classes.

**Cover**
```html
<slide layout="title">
<ph name="kicker">SALES · Q3 2026</ph>
<ph name="title">Q3 Sales Review</ph>
<ph name="subtitle">Regional performance and Q4 priorities · 14 Oct 2026</ph>
</slide>
```

**Agenda**
```html
<slide layout="title-content">
<ph name="kicker">AGENDA</ph>
<ph name="title">Four things to decide today</ph>
<ph name="body"><ol class="bul"><li>Where Q3 growth came from</li><li>Why SMB churn is rising</li><li>Two options for Q4 budget</li><li>The ask: approval by Friday</li></ol></ph>
</slide>
```

**KPI cards** (2–4 headline numbers, one highlighted)
```html
<slide layout="title-content">
<ph name="kicker">HEADLINE</ph>
<ph name="title">Growth came from new accounts, not price</ph>
<ph name="body"><div class="grid3">
<div class="card"><div class="kpi-num">$4.2M</div><div class="kpi-lab">Revenue · +18% vs Q3 2025</div></div>
<div class="card accent"><div class="kpi-num">312</div><div class="kpi-lab">New accounts · 2× target</div></div>
<div class="card"><div class="kpi-num">2.1%</div><div class="kpi-lab">Monthly churn · flat</div></div>
</div></ph>
<ph name="takeaway"><b>Kesimpulan:</b> keep investing in acquisition; pricing can wait until Q1.</ph>
</slide>
```

**Big stat** (one number, dark punctuation slide)
```html
<slide layout="section" dark>
<ph name="kicker">THE ONE NUMBER</ph>
<ph name="title"><span class="stat-big">57%</span></ph>
<ph name="subtitle">of revenue now comes from enterprise, up from 41% a year ago</ph>
</slide>
```

**Insight chart**
```html
<slide layout="title-content" notes="Point at August: the promo week explains almost the whole spike.">
<ph name="kicker">TREND</ph>
<ph name="title">August spike came from the promo, not organic growth</ph>
<ph name="body"><chart type="bar" width="1720" height="560" prefix="$" unit="k">
labels: Jul | Aug | Sep
2025: 1180 | 1240 | 1150
2026: 1310 | 1560 | 1330
</chart><p class="small">Source: finance ledger, monthly gross revenue</p></ph>
<ph name="takeaway"><b>Kesimpulan:</b> without the promo, growth was about 6%, so plan Q4 on that.</ph>
</slide>
```

**Two options compared**
```html
<slide layout="comparison">
<ph name="kicker">Q4 BUDGET</ph>
<ph name="title">Option B reaches the target with half the risk</ph>
<ph name="left-head"><span class="tag">OPTION A · PAID ADS</span></ph>
<ph name="left"><ul class="bul"><li><b>$400k</b> spend</li><li>Fast: results in 4 weeks</li><li>Stops when spend stops</li></ul></ph>
<ph name="right-head"><span class="tag">OPTION B · PARTNERS</span></ph>
<ph name="right"><ul class="bul"><li><b>$220k</b> spend</li><li>Slower: 8–10 weeks</li><li>Compounds after Q4</li></ul></ph>
<ph name="takeaway"><b>Kesimpulan:</b> choose B, and keep $50k of ads as a safety net for December.</ph>
</slide>
```

**Three pillars** (options, features, principles)
```html
<slide layout="title-content">
<ph name="kicker">STRATEGY</ph>
<ph name="title">Three moves for 2027</ph>
<ph name="body"><div class="grid3">
<div class="card"><span class="tag">01</span><h3>Own enterprise</h3><p class="small">Dedicated team for the top 50 accounts.</p></div>
<div class="card accent"><span class="tag">02</span><h3>Self-serve SMB</h3><p class="small">Move sub-$5k deals to the online flow.</p></div>
<div class="card"><span class="tag">03</span><h3>Partner channel</h3><p class="small">Three resellers in new regions by Q2.</p></div>
</div></ph>
</slide>
```

**Process / roadmap**
```html
<slide layout="title-content">
<ph name="kicker">ROADMAP</ph>
<ph name="title">Launch is on track for 3 March; testing is the risk</ph>
<ph name="body"><div class="timeline">
<div class="step"><div class="dot"></div><h3>Design</h3><p class="small">Done · Nov</p></div>
<div class="step"><div class="dot"></div><h3>Build</h3><p class="small">On track · Dec–Jan</p></div>
<div class="step"><div class="dot"></div><h3>Test</h3><p class="small">At risk · Feb</p></div>
<div class="step"><div class="dot"></div><h3>Launch</h3><p class="small">3 March</p></div>
</div></ph>
<ph name="takeaway"><b>Kesimpulan:</b> add one QA engineer in February to protect the date.</ph>
</slide>
```

**Detail table** (≤ 7 rows)
```html
<slide layout="title-content">
<ph name="kicker">BY REGION</ph>
<ph name="title">Jakarta and Surabaya carry 70% of growth</ph>
<ph name="body"><table class="t"><tr><th>Region</th><th>Q3 revenue</th><th>Growth</th></tr>
<tr><td>Jakarta</td><td class="n">$1.9M</td><td class="n">+24%</td></tr>
<tr><td>Surabaya</td><td class="n">$0.9M</td><td class="n">+21%</td></tr>
<tr><td>Bandung</td><td class="n">$0.7M</td><td class="n">+9%</td></tr>
<tr><td>Medan</td><td class="n">$0.4M</td><td class="n">+4%</td></tr>
<tr><td>Others</td><td class="n">$0.3M</td><td class="n">−2%</td></tr>
</table></ph>
</slide>
```

**Quote** (centred, attribution under it)
```html
<slide layout="section">
<ph name="kicker">CUSTOMER VOICE</ph>
<ph name="title">“We stopped exporting to Excel. The dashboard is the meeting now.”</ph>
<ph name="subtitle">Head of Finance, a 400-person logistics client</ph>
</slide>
```

**Closing with the ask**
```html
<slide layout="section" dark>
<ph name="kicker">DECISION NEEDED</ph>
<ph name="title">Approve Option B by Friday 18 Oct</ph>
<ph name="subtitle">Owner: Sales Ops · Budget: $220k · First review: 15 Nov</ph>
</slide>
```

**Numbered steps, one highlighted** (`.rows`)
```html
<slide layout="title-content">
<ph name="kicker">ONBOARDING</ph>
<ph name="title">Four onboarding steps; the data import decides retention</ph>
<ph name="body"><div class="rows">
<div class="card"><span class="idx">01</span><h3>Create account</h3><p class="small">Short form, email verified in 2 minutes.</p></div>
<div class="card"><span class="idx">02</span><h3>Choose a plan</h3><p class="small">Three plans compared on one screen.</p></div>
<div class="card is-key"><span class="idx">03</span><h3>Import first data</h3><p class="small">62% of users who finish this stay past month one.</p></div>
<div class="card"><span class="idx">04</span><h3>Invite the team</h3><p class="small">3 invites per new account on average.</p></div>
</div></ph>
</slide>
```
Swap `<span class="idx">` for `<icon name="target" badge/>` to make icon rows; add `class="rows cols2"` for 6–8 short items.

**Evidence + decision panel** (`content-aside`)
```html
<slide layout="content-aside">
<ph name="kicker">FINDING</ph>
<ph name="title">Shipping costs rose 14%, mostly on routes outside Java</ph>
<ph name="body"><chart type="bar" height="460">
labels: Jan, Feb, Mar, Apr, May, Jun
Java: 100, 102, 101, 104, 103, 105
Outside Java: 100, 106, 109, 113, 116, 121
</chart></ph>
<ph name="aside"><icon name="bulb"/><h3>To decide</h3><ul><li>Consolidate the Makassar warehouse</li><li>Renegotiate 3 courier contracts</li></ul></ph>
<ph name="takeaway"><b>Kesimpulan:</b> outside-Java routes explain 80% of the increase.</ph>
</slide>
```

**Before / after** (`.bands`)
```html
<ph name="body"><div class="bands">
<div class="card"><span class="tag">BEFORE</span><h3>Requester → Manager → Finance → Director → Archive</h3><p class="small">5 steps, 6 working days, 2 on paper.</p></div>
<div class="card accent"><span class="tag">AFTER</span><h3>Requester → Manager → Finance (auto-approved under $700)</h3><p class="small">3 steps, 1.5 working days, all digital.</p></div>
</div><p class="source">Source: approval system logs, Jan–Jun 2026.</p></ph>
```

**Hero number + reasons** (`.hero`)
```html
<ph name="body"><div class="hero">
<div><span class="stat-big">3×</span><h3>more complaints about response time</h3><p class="small">than about price, across 1,240 tickets.</p></div>
<div class="card"><div class="rows">
<div><span class="idx">01</span><h3>Slow responses</h3><p class="small">Median 19 h against a 4 h target.</p></div>
<div><span class="idx">02</span><h3>Limited export</h3><p class="small">Requested by 312 customers.</p></div>
</div></div>
</div></ph>
```

**Warning, note, labelled box, chips**
```html
<div class="callout warn"><icon name="alert" badge tone="accent2" size="32"/><div><b>Warning:</b> full backup before 22:00; the migration cannot be undone after step 3.</div></div>
<div class="callout"><icon name="info" badge size="32"/><div><b>Note:</b> read-only mode for 40 minutes.</div></div>
<div class="boxed"><span class="box-label">Emergency contact</span><p class="small">Infrastructure on call 24 h during the window.</p></div>
<div class="chips"><span>Billing</span><span>Reports</span><span class="is-key">Payments</span><span>CRM</span></div>
```

**Concept diagrams** (`<diagram>`; sizes default to the full body width)
```html
<diagram type="matrix" key="2">
Big bets: high impact, high effort
Quick wins: high impact, low effort; do now
Fill-ins: low impact, low effort
Avoid: low impact, high effort
x: Effort
y: Impact
</diagram>

<diagram type="funnel" key="3">
Visitors 48,000: from ads and search
Sign-ups 6,200: 12.9% of visitors
Active trial 1,900: only 31% try the core feature
Paid 610: 32% of trials
</diagram>

<diagram type="scale" key="3">
Initial: undocumented
Repeatable: depends on people
Defined: written and used
Measured: metrics per step
Optimised: continuous improvement
from: Low
to: High
</diagram>
```
`venn` (2–3 sets + `overlap:`), `cycle` (3–6 steps + `center:`) and `pyramid` (2–6 layers, top first) use the same line format.

**Business and research slides:**
- market size: `<diagram type="nested">` with `TAM:` / `SAM:` / `SOM:` lines, plus a `.source` line with the calculation;
- positioning map: `<diagram type="positioning">` with `Name: x y` (0–100) and `x: Low | High`;
- schedule: `<diagram type="gantt">` with `periods: Jan | Feb …` and `Task: 2-4` lines;
- team: `.people`; pricing: `.tiers` with one `.card.is-key`; competition: `table.t` with `td.yes` / `td.no` and our column `.is-key`; references: `ol.refs`; clients: `.logos`.

Ready-made versions are templates 19–38; SKILL.md lists them by purpose and gives an order per deck type. A working deck with every block and diagram is in `examples/components/`.

### 4.x Steps and interaction: when they earn their place
Motion already gives every slide a clean entrance. Add interaction only when it changes how the content is understood. The reference is docs/motion.md.

- **Live talk** (`"interactive": "live"`): use steps to stop the audience from reading ahead. Build an argument with `data-steps="dim"` (3–4 points) and end with `<ph name="takeaway" data-step>`. A slide that is only read aloud needs no steps.
- **Shared link** (`"interactive": "shared"`): let the reader dig. Use `.tabs` for 2–4 views of one thing, `.peek` cards for detail on demand, and `.hotspots` on a screenshot.
- **Before/after:** `.swap` keeps both states in the same place, so the change itself is what the eye sees. Copy template 14.
- **One number, then why:** `data-morph` on the KPI card in two slides in a row, with `data-count` on the first. Copy templates 16 and 17.
- **Never:**
  - a step on every slide;
  - more than 6 steps;
  - hover in a live talk;
  - a tab whose content means nothing without the others (each state prints as its own page);
  - `data-count` on more than 3 numbers.
- **Check:**
  - `slideck check` prints `~ slide N: …` for each interactive slide: compare it with your plan;
  - open `dist/<deck>.html#N.k` to see slide N after k steps;
  - the PDF must still read complete.

---

## 5. Look, then polish (required)

A deck isn't done when it builds. It's done when you've **looked at it** and fixed what you saw.

1. `slideck build`, then `slideck check`. Without `--no-shot`, this also writes contact sheets of every slide to `<deck>/.slideck-check/current/<deck>-N.png` (12 slides per sheet).
2. **Open the sheets and look.** If you can read images, read the PNGs; otherwise open `dist/<output>.html`.
3. Write down the **3 worst problems**. Typical ones:
   - a title wraps to 3 lines;
   - a slide is a wall of text;
   - two slides in a row look the same;
   - a chart is too small or its insight isn't visible;
   - a card row is uneven;
   - a slide is empty because a placeholder was missing;
   - a takeaway repeats the title.
4. Fix them (rewrite or split content first, layout second), rebuild, and look again.
5. Do **at least 2 rounds**, until you can't find 3 problems worth fixing.

### Done gate: from tool output, never claimed
Report "done" only when **the tool output shows it**:
- `slideck build` prints no `x` line;
- `slideck check` prints `Semua lolos.`;
- `slideck pdf` shows `halaman PDF` = slides + notes pages + tab/swap state pages, if a PDF was asked for;
- for interactive slides, the `~` lines of `slideck check` match the steps and components you planned.

Never write "passed" or "looks good" without having run the command in this session and seen that output. If something can't pass, say which slide and why.
