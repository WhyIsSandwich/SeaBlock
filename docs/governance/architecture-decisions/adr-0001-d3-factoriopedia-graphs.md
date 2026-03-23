# ADR 0001: D3 for Factoriopedia graph viewports (research map and similar)

## Status

Accepted — 2026-03-22

## Context

The Factoriopedia research map (`docs/.vitepress/components/FactoriopediaTechTreeModal.vue`) renders a prerequisite graph with HTML cards and an SVG edge layer. The layout is computed in plain JavaScript (`src/utils/researchMapLayout.js`) so we can unit-test closure, ranks, and routing without a rendering dependency.

We still need **viewport affordances** (pan, zoom, predictable gesture handling) and may later explore **layered graph layout** (e.g. Sugiyama-style) for wide or dense graphs.

## Decision

1. **Use modular D3 packages** (for example `d3-zoom`, `d3-selection`) imported by name so bundlers can tree-shake unused code. Avoid importing the full `d3` umbrella in application code unless a specific need arises.

2. **Pan/zoom** is implemented with `d3-zoom` on a **viewport host element** (HTML `div` with `overflow: hidden` and a bounded `max-height`). The graph content (SVG + absolutely positioned cards) lives in an inner layer whose **CSS `transform`** matches the zoom transform (`translate` + `scale`, `transform-origin: 0 0`). This keeps edges and cards aligned without moving the whole modal.

3. **Wheel zoom vs. panel scroll**: the viewport’s wheel filter requires **Ctrl or Cmd** so normal wheel gestures still scroll the modal panel. Drag pans the graph; touch uses D3’s default handling on the viewport (`touch-action: none` on the host).

4. **Layout**: `computeResearchMapLayout` uses **`d3-dag`** (`graphConnect` + **`sugiyama`** with **`layeringLongestPath().topDown(false)`** so the selected technology sits at the bottom). Horizontal placement is whatever Sugiyama’s decross/coord produce; rows in the UI list left-to-right by computed `centerX`. The standalone **`technologyLayoutOrder`** helper remains for tests and any future sort override but is not applied to the Sugiyama result today. The modal shows the **full** graph (no vertical tier windowing); pan/zoom handles large maps.

## Consequences

- **Positive**: Smaller custom gesture code, well-tested behavior for zoom constraints, and a clear place to add pinch/zoom or programmatic “fit” later.
- **Positive**: Vue keeps ownership of data and markup; D3 owns the interaction controller on a single ref target.
- **Risk**: Mixing Vue-rendered DOM with D3 must stay disciplined: we apply zoom to a **wrapper** transform and do not let D3 mutate Vue-managed sibling trees outside that wrapper.
- **Non-goals**: This ADR does **not** claim parity with Factorio’s in-game research UI ordering or zoom behavior; the wiki map is an explanatory visualization with its own rules (documented in the modal hint and layout tests).

## References

- `src/composables/useD3GraphZoom.js` — viewport binding and CSS transform helper.
- `src/utils/researchMapLayout.js` — layout and edge routing.
