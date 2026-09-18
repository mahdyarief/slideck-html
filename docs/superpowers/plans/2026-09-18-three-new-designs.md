# Three New Slide Designs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `geometric`, `architectural`, and `ribbon` as three distinct designs that reuse all 12 layouts and all five themes.

**Architecture:** Each design is a self-contained `designs/<name>/components.css` plus `design.json`, using the existing 16-token contract and shared selector vocabulary. Examples reuse `examples/slides/`; documentation and previews expose the expanded six-design catalog without changing build behavior.

**Tech Stack:** HTML, CSS, JSON, Node.js standard library, Chromium headless screenshots.

## Global Constraints

- Fixed 1920×1080 stage; no responsive layout rules inside slides.
- Keep `templates/` unchanged as the sole 12-layout catalog.
- Use only existing theme tokens for colors and fonts; literal colors are allowed only in each design's fallback `:root` declaration.
- No new dependencies, themes, motions, fonts, or build behavior.
- Every design must support navy, paper, botanical, swiss, and neon.
- Preserve footer and dense-content safe areas.

---

### Task 1: Implement the three design systems

**Files:**
- Create: `designs/geometric/components.css`
- Create: `designs/geometric/design.json`
- Create: `designs/architectural/components.css`
- Create: `designs/architectural/design.json`
- Create: `designs/ribbon/components.css`
- Create: `designs/ribbon/design.json`

**Interfaces:**
- Consumes: the 16-token contract and selector vocabulary from `designs/default/components.css`.
- Produces: three design names accepted by `deck.json.design` without template changes.

- [x] Copy the complete shared selector set into each new stylesheet and apply the approved visual thesis.
- [x] Keep all non-`:root` color declarations as `var(--token)` references.
- [x] Give geometric orbital markers/asymmetric corners, architectural frames/rails/drafting lines, and ribbon diagonal directional bands.
- [x] Add metadata with name, label, description, and recommended theme/motion.
- [x] Run a token and raw-color scan over all three stylesheets; expected result: all 16 tokens present and no literal color outside `:root`.

### Task 2: Add examples and verify the build matrix

**Files:**
- Create: `examples/geometric-navy/deck.json`
- Create: `examples/architectural-navy/deck.json`
- Create: `examples/ribbon-navy/deck.json`
- Generate: `examples/html/geometric-navy.html`
- Generate: `examples/html/architectural-navy.html`
- Generate: `examples/html/ribbon-navy.html`

**Interfaces:**
- Consumes: `examples/slides/*.html`, `build.js --root`, and the three design names from Task 1.
- Produces: ten discoverable example combinations built by `examples/build-all.js`.

- [x] Add three generic 12-slide example configs using `"slides": "../slides"`, navy, and the recommended motion.
- [x] Run `node build.js --lock` once after adding frozen design files.
- [x] Run `node examples/build-all.js`; expected result: ten successful outputs and no placeholder/frozen warnings.
- [x] Build a temporary matrix for every new design against all five themes; expected result: 15 successful builds.

### Task 3: Update catalog documentation and visual previews

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `skill/SKILL.md`
- Modify: `examples/README.md`
- Create: `assets/preview/design-geometric.png`
- Create: `assets/preview/design-architectural.png`
- Create: `assets/preview/design-ribbon.png`

**Interfaces:**
- Consumes: verified example HTML from Task 2.
- Produces: a six-design catalog with accurate configuration names and visual references.

- [x] Update every design count, enum, table, and directory description from three to six designs.
- [x] Expand the README comparison into two rows of three previews.
- [x] Capture representative 1280×720 screenshots from the three navy examples.
- [x] Inspect screenshots for clipping, overlap, contrast, and distinct silhouettes; revise CSS and rebuild if any issue is visible.
- [x] Confirm generic example copy and unchanged five-theme documentation.

### Task 4: Final verification and local skill synchronization

**Files:**
- Modify: `FROZEN.json`
- Sync locally: `~/.openclaude/skills/slideck-html/`

**Interfaces:**
- Consumes: all verified source, examples, docs, and previews.
- Produces: a reproducible repository state and matching installed skill.

- [x] Run `node build.js --lock`, then `node build.js`; expected result: clean default build with no warnings.
- [x] Re-run `node examples/build-all.js`; expected result: ten outputs.
- [x] Run `git diff --check` and inspect `git status --short`; expected result: only intended project changes plus this plan.
- [x] Copy the verified designs, docs used by the skill, themes, motions, templates, assets, and examples into the installed skill folder; exclude generated `dist/` and `examples/html/` there.
- [x] Compare repository and installed skill design directories byte-for-byte.
- [x] Commit implementation changes in one focused commit; do not push without explicit confirmation.
