# Three New Designs for slideck-html

## Goal

Add three visually distinct designs—`geometric`, `architectural`, and `ribbon`—without changing the shared 12-layout HTML catalog, theme token contract, motion files, or deck authoring workflow.

The collection grows from three to six designs. Every new design must work with all five themes because its CSS uses only the existing shared tokens.

## Scope

### In scope

- Add `designs/geometric/`, `designs/architectural/`, and `designs/ribbon/`.
- Give each design a complete `components.css` and `design.json`.
- Add one navy example deck for each design, reusing `examples/slides/`.
- Build all examples and add one preview image per new design.
- Update `README.md`, `AGENTS.md`, `skill/SKILL.md`, and `examples/README.md` from three to six designs.
- Regenerate `FROZEN.json` after intentional frozen-file changes.
- Synchronize the installed `slideck-html` skill after verification.

### Out of scope

- No new layouts or changes to files under `templates/`.
- No new theme tokens, themes, motions, fonts, or external dependencies.
- No refactor of duplicated base CSS in existing designs.
- No new frozen-lock, token-contract, metadata, or contrast validators. Those audit findings remain follow-up work.
- No build behavior changes unless a compatibility defect is discovered during verification.

## Architecture

The existing load order remains unchanged:

1. `designs/<name>/components.css`
2. `themes/<name>.css`
3. `motions/<name>.css`

Each design provides fallback values for the existing 16-token contract, then styles the same class vocabulary used by all shared templates. Theme CSS overrides the fallback tokens at runtime. The new design CSS must contain no literal color values outside its fallback `:root` declaration.

The shared selectors remain:

- typography: `.kicker`, `h1.title`, `h1.serif`, `.quote`, `.small`, `.bul`
- structure: `.pad`, `.grid2`, `.grid3`, `.grid4`, `.card`, `.card.accent`
- data: `.kpi-num`, `.kpi-lab`, `table.t`, `.map`, `.timeline`, `.checklist`
- chrome: `.rule`, `.tag`, `.foot`, `.stat-big`
- motion fallback: `.reveal`, `.visible`, `.d1`, `.d2`, `.d3`

## Visual Systems

### Geometric Orbit (`geometric`)

**Role:** expressive keynote, launch, and creative-strategy decks.

**Visual thesis:** overlapping circles, discs, clipped planes, and asymmetric modular blocks create a recognizable composition while preserving readable content zones.

**Component treatment:**

- generous asymmetric spacing with a wider content-to-decoration relationship
- cards with alternating corner geometry rather than uniformly rounded cards
- circular or orbital markers for KPI, timeline, checklist, and map transitions
- thick accent rules and layered token-colored pseudo-elements
- display typography remains bold and compact; body copy stays neutral
- decorative geometry must stay behind content and never reduce text contrast

### Architectural Frame (`architectural`)

**Role:** consulting, architecture, planning, and executive-review decks.

**Visual thesis:** perimeter frames, side rails, indexed modules, and measured grid lines produce a formal drawing-board character without copying the brutalist treatment.

**Component treatment:**

- inset perimeter framing and a narrow visual rail created with pseudo-elements
- compact labels, indexed tags, and measured spacing
- cards rendered as framed modules with restrained corner treatment and no hard shadow
- tables, mappings, and timelines use drafting-line hierarchy
- titles remain mixed case and precise, differentiating this design from brutalist uppercase
- content must not overlap the rail or footer safe area

### Dynamic Ribbon (`ribbon`)

**Role:** pitches, product stories, and transformation narratives.

**Visual thesis:** diagonal ribbons, strong full-width bands, and oversized type create directional movement and a cinematic silhouette.

**Component treatment:**

- diagonal accents made with pseudo-elements and token colors
- cards and map columns use angled edge details while preserving rectangular text boxes
- timelines read as directional bands rather than dots on a neutral line
- tags and rules become compact ribbon labels
- large type and high contrast establish hierarchy; body text remains within current density limits
- decorative bands must use `overflow:hidden` containment and remain non-interactive

## Compatibility Rules

Each new design must:

1. define every selector required by the 12 templates;
2. use the existing token names for all colors and fonts;
3. preserve fixed-stage behavior and avoid responsive breakpoints;
4. preserve footer, table, and dense-layout safe areas;
5. support all theme palettes, including dark `botanical` and `neon` surfaces;
6. preserve reduced-motion behavior supplied by the shell and motion layer;
7. avoid changing template markup or requiring design-specific classes.

## Examples and Documentation

Add these examples:

- `examples/geometric-navy/deck.json`
- `examples/architectural-navy/deck.json`
- `examples/ribbon-navy/deck.json`

Each points to `../slides`, contains all 12 shared layouts, and uses generic example copy. `examples/build-all.js` discovers them automatically.

Add preview images:

- `assets/preview/design-geometric.png`
- `assets/preview/design-architectural.png`
- `assets/preview/design-ribbon.png`

The README design comparison expands to six designs without changing the five-theme comparison.

## Verification

Verification is complete only when:

1. `node build.js --lock` succeeds after the frozen design files are added;
2. `node build.js` succeeds without frozen-file or placeholder warnings;
3. `node examples/build-all.js` builds all ten example combinations;
4. all three new 12-slide navy examples render without clipping or overlap;
5. representative non-navy builds confirm each new design accepts every theme token set;
6. screenshots at 1280×720 visibly distinguish all six designs;
7. the installed skill copy matches the verified repository files;
8. `git status` contains only intended source, output, documentation, and preview changes.

## Acceptance Criteria

- The design count is six: default, editorial, brutalist, geometric, architectural, ribbon.
- The same 12 template files remain the sole layout catalog.
- No new design hardcodes presentation colors outside fallback token definitions.
- Each new design has a unique compositional silhouette, not merely different radius, borders, or fonts.
- Existing deck configurations continue to build unchanged.
- Documentation, examples, frozen lock, previews, and installed skill are synchronized.
