# Motion and interaction

slideck-html animates a deck in three layers. You choose the first in `deck.json`; the other two come from attributes in your slides. None of it needs JavaScript from you.

1. **Motion** (`deck.json` `"motion"`): how one slide replaces the next, and how its content enters.
2. **Steps**: content that appears one click at a time.
3. **Interactive components**: swap, tabs, peek, focus group, hotspots. The viewer explores them with hover, focus or tap.

## Live or shared: decide first

Set it in `deck.json`; the build uses it to warn about components that do not fit.

```json
{ "interactive": "live" }
```

| | `"live"` (presented with a clicker) | `"shared"` (sent as a link, read alone) |
|---|---|---|
| steps (`data-step`, `data-steps`) | yes, the main tool | optional |
| swap / tabs | only with `data-step` (→ changes the state) | yes, with buttons |
| peek, focus group, hotspots, `data-hover` | no: the audience cannot hover | yes |
| share of interactive slides | up to ~40% | no limit |

Left unset, the build treats the deck as live for the "interaction on too many slides" warning, and stays silent about hover.

## Which component for which content

| content | use | template |
|---|---|---|
| an argument built point by point | `data-steps="dim"` + `<ph name="takeaway" data-step>` | `templates/13-steps-argument.html` |
| before → after | `.swap` | `14-before-after.html` |
| 2–4 views of one thing | `.tabs` | `15-tabs-3.html` |
| one key number, explained next | `data-morph` + `data-count` | `16-kpi-morph-a.html` + `17-kpi-morph-b.html` |
| summary cards with detail on demand | `.peek` in `.focus-group` | `18-explore-cards.html` |
| parts of an image | `.hotspots` | — |

When none fits, use no interaction. Motion already gives every slide a clean entrance.

## Principles

These rules keep the motion professional rather than decorative:

- **Motion follows reading order.** Kicker, title, then body, item by item. Nothing enters from a random direction.
- **One movement per element.** Each element fades with a small rise, a mask wipe or a scale settle. Nothing bounces, spins or loops.
- **It settles and stops.** Once a slide is in, nothing moves until you act.
- **Going back shows the slide finished.** Animation plays only when you move forward.
- **Direction means something.** → moves the new slide in from the right, ← from the left.
- **Content never depends on animation.** Print, PDF, PowerPoint, `check`, phone scroll mode, `prefers-reduced-motion` and edit mode all show the final state. If the scripts fail, everything is visible.

## 1. Motions

| motion | feel | use for |
|---|---|---|
| `corporate` (default) | quick rise (460 ms); the slide glides 36 px in the direction you move | reports, reviews, most decks |
| `cinematic` | slow fade and settle (1 s); the new slide zooms down from 103.5% | keynotes, launches, big statements |
| `editorial` | text lines wipe up through a mask; the new slide wipes in from the edge over the old one | stylised reports, research, magazine-style decks |
| `keynote` | crisp push (120 px) with a confident ease | pitch decks, product talks |
| `static` | no animation; steps and interactive components still work, instantly | accessibility-first decks, kiosk screens, recordings |

What happens automatically:

- **Choreography:** each slide's content is split into units in reading order: the kicker, title, rule, every card in a grid, every row, every list item. Each unit enters a little after the one before. Slides with many units use a shorter delay, so the whole slide is in within about a second.
- **Charts:** bars grow from the baseline, lines draw from left to right, and dots and value labels arrive after the line.
- **Morph:** see below.

### Writing your own motion

A motion is a CSS file of tokens on `:root`. Copy `motions/corporate.css` into the deck folder as `motions/<name>.css` and change the values:

```css
:root{
  --m-dur:460ms; --m-dur-out:220ms;           /* content enter / leave */
  --m-ease:cubic-bezier(.22,1,.36,1); --m-ease-in:cubic-bezier(.4,0,1,1);
  --m-dist:14px; --m-scale:1;                 /* how far units rise, start scale */
  --m-stagger:55ms; --m-start:140ms;          /* delay between units, delay before the first */
  --m-slide-dur:520ms; --m-slide-out:240ms;   /* slide transition */
  --m-slide-x:36px; --m-slide-scale:1;        /* slide travel and start scale */
  --m-morph-dur:620ms; --m-draw-dur:900ms; --m-count-dur:1200ms;
}
```

You can also redefine `@keyframes m-slide-in` and `m-slide-out`. `var(--m-dir)` is 1 when moving forward and -1 when moving back. Give each keyframe both `from` and `to` when the property cannot be interpolated to `none` (for example `clip-path`); see `motions/editorial.css`. Animate only `opacity`, `translate`, `scale`, `clip-path` and masks. Never animate layout properties (`width`, `top`, `margin`), and never colours: those belong to the theme.

A motion with `--m-dur:0ms` turns animation off, which is what `static` does.

## 2. Steps

| write | effect |
|---|---|
| `data-step` on any element | hidden until the next → / click / Space |
| `<ph name="takeaway" data-step>` | the same on a placeholder (any `data-*` on `<ph>` is passed through) |
| `data-steps` on a container | each child is one step, in order |
| `data-steps="dim"` | as above, and earlier steps dim to 36% so the current point stands out |
| `data-step="2"` | sets the order; elements with the same number appear together |

- → reveals the next step and moves to the next slide after the last step. ← hides the last step and goes back a slide when none are left.
- **Shift+→ / Shift+←** skip the steps and change slide directly.
- A hidden step keeps its space, so the layout never jumps as steps appear.
- Coming back to a slide with ← shows all its steps.

```html
<slide layout="title-content">
<ph name="title">Three moves for next quarter</ph>
<ph name="body"><div class="rows" data-steps="dim">
  <div class="row"><span class="idx">01</span><div><h3>Fix onboarding</h3></div></div>
  <div class="row"><span class="idx">02</span><div><h3>Raise prices on Pro</h3></div></div>
  <div class="row"><span class="idx">03</span><div><h3>Hire two engineers</h3></div></div>
</div></ph>
<ph name="takeaway" data-step><b>Takeaway:</b> onboarding first; it pays for the rest.</ph>
</slide>
```

## 3. Interactive components

Use these for content the audience explores, typically on a deck that is shared as a link and read alone. In a live talk, prefer steps.

### Swap: one place, several states

```html
<div class="swap">
  <div data-label="Before"><div class="card">…</div></div>
  <div data-label="After"><div class="card is-key">…</div></div>
</div>
```

The states are stacked in one grid cell, so the box is as tall as the tallest state and nothing below moves. A segmented control is built above it from the `data-label`s. Add `data-hover` to switch on hover as well. With `data-step` on the `.swap` there are no buttons: each → moves to the next state.

### Tabs

```html
<div class="tabs">
  <div data-label="Scope">…</div>
  <div data-label="Timeline">…</div>
  <div data-label="Risks">…</div>
</div>
```

The tab bar is built above the panels. It uses ARIA tab roles, and the tab buttons are reached with Tab and switched with Enter or Space. `data-hover` switches on hover; `data-step` makes → move through the tabs.

### Peek: detail on demand

```html
<div class="card peek">
  <div><h3>Speed</h3><p class="small">Hover for the detail</p></div>
  <div><h3>Speed</h3><p class="small">Median build time fell from 11 s to 1.4 s.</p></div>
</div>
```

The second child replaces the first on hover, keyboard focus or tap. A tap toggles it, so it works on touch screens.

### Focus group

Add `focus-group` to a grid (`class="grid3 focus-group"`). Hovering or focusing one child dims the others to 32%. Combine it with `peek` for explorable cards.

### Hotspots

```html
<div class="hotspots">
  <img src="dashboard.png" alt="Dashboard">
  <button class="hotspot" style="--x:28%;--y:35%"><b>Filters</b> stay as you left them</button>
</div>
```

Each pin's text becomes a tooltip with its own solid surface, so it stays readable over any image. It opens on hover, focus or tap.

### Count-up

`data-count` on an element whose text has a number: `<div class="kpi-num" data-count>1,204</div>`, `86%`, `Rp 4,8 M`. The number counts from 0 as the slide enters, keeping its prefix, suffix and decimals. The separators follow `deck.json` `lang` (`id`: `1.204,5`; `en`: `1,204.5`). Digits use tabular figures, so the width does not jitter.

### Morph

Give the same `data-morph="name"` to an element on two consecutive slides. Moving forward or back between them makes that element glide and resize from its old place to its new one, while the rest of the slide changes normally. Morph works best on a whole card or block, not on text inside a card whose background is still fading in. It uses the browser's View Transitions API; browsers without it get the normal slide transition.

## Final state and tools

Nothing a reader needs may exist only in an interaction.

| situation | what shows |
|---|---|
| `node pdf.js`, print (Ctrl+P) | every step, every slide in its final state, and **one extra page per additional tab/swap state**, right after its slide |
| `node check.js` | the same pages; each state page is checked for overflow and labelled `slide 5 · keadaan "After"` |
| `node pptx.js` | the same pages as slides; steps become on-click Fade animations; the motion becomes the slide transition |
| `deck.html?final` | everything revealed, in the browser |
| phone scroll mode, `prefers-reduced-motion`, edit mode (E) | everything visible, no animation |

`data-print="first"` or `data-print="last"` on a `.swap` / `.tabs` prints only that state, with no extra pages. Use it when the other states repeat the same content.

From a script: `window.slideckFinal()` puts the open deck in its final state and adds the state pages.

## Checking interaction (for people and agents)

- **Build warnings:**
  - more than 6 steps on a slide;
  - a swap/tabs with fewer than 2 states, or states without `data-label`;
  - hover-only components, or swap/tabs without `data-step`, in a `"live"` deck;
  - `data-count` without a number, or more than 3 on a slide;
  - a hotspot without `--x`/`--y`;
  - a `data-morph` with no partner on the slide before or after;
  - interaction on more than 40% of a non-shared deck.
- **`check.js`:**
  - prints a summary per interactive slide: `~ slide 4 [title-content]: 4 langkah · swap 2 keadaan`;
  - warns when `data-morph` sits inside a box with a background, which makes the morph look broken.
- **Addresses:**
  - `deck.html#4` opens slide 4 at step 0;
  - `#4.2` opens it with 2 steps revealed;
  - the address bar follows as you step, so a link always reopens the exact moment. Use it for screenshots of a step.

## PowerPoint

| direction | what happens |
|---|---|
| `node pptx.js` (slideck → pptx) | each step becomes one click: its shapes get an entrance "Fade" (the first on click, the rest "with previous"). Motion → transition: corporate/cinematic Fade, editorial Wipe, keynote Push, static none. Tab/swap states become extra slides. |
| `node import.js` (pptx → slideck) | on-click entrance animations become `data-step="N"` (N = click number); "with/after previous" effects join that click; by-paragraph builds become `data-steps`. Other animation types (emphasis, exit, motion paths) are ignored. |
