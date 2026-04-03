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

## Production map (Factoriopedia details pane)

The **production map** (`docs/.vitepress/components/ProductionMapHost.vue`) reuses the same **pan/zoom** stack (`useD3GraphZoom`, Ctrl/Cmd + wheel, inner transform layer) but **does not** use `d3-dag` / Sugiyama for node positions.

**Entry**: The map is **not** embedded in the details scroll area. `DetailsPane.vue` shows an **“Open production map”** control for **item**, **fluid**, and **recipe** entries and hosts `ProductionMapHost` in a **modal** (Teleport to `body`, backdrop + Esc to close, large viewport). This keeps the details pane readable while giving the graph a dedicated canvas.

**Layout**: `ProductionMapHost` calls **`computeProductionMapFrame`** in `src/utils/productionMapLayout.js`, which is a **pure design-space** pipeline for the current visible graph: **`computeProductionMapLayout`** sets **X** as **`baseX + columnIndex × (gapX + maxCardWidth)`**, where **`columnIndex`** is each node’s embedded **`layoutDepth` minus the graph minimum** (so recipe-root maps can use negative raw depths for “product side” without breaking placement). **Y** defaults to **stable-sorting node ids** at each depth with **`gapY`**; when **`spineNodeIds`** is passed, nodes on the **selected path** share **`baseY`** across columns (top row) and other nodes in that depth stack **below** the spine node. **`computeProductionEdgePaths`** emits SVG `d` in the **same layout space**. The host stores **`layoutPositions`** and **`layoutEdgePaths`**, applies a **locked** display normalization (`ox, oy` = shift so the first bbox’s min corner aligns after focus reset) to card **left/top**, and shifts path **`d`** with **`translateProductionMapPathD`**. After a spine-changing click, **`computeTranslateForSpineTerminal`** (`src/utils/productionMapViewport.js`) pans so the **spine terminal** (deepest selected node) is **centered horizontally**, with **vertical** pan keeping the **graph top** to a small margin (not vertically centered); **`animateTransformTo`** in **`useD3GraphZoom`** ease-out animates that transform. After a **focus change** (new item/fluid/recipe selection), the host **resets zoom** and runs the same centering against **`__pm_root__`** so the **root card** starts **horizontally centered** and **top-aligned** in the viewport. Siblings remain reachable by manual pan. Card **widths** stay fixed per kind; **heights** are estimated from wrapped recipe labels.

**Graph model**: `buildProductionTreeGraph` builds an **expansion tree** only (stable path ids). **Item/fluid focus** is a **material** root: **direct children** use **`r…`** (right chain: recipes that **produce** this material, then **ingredients** and further **producer** recipes only) and **`l…`** (left chain: recipes that **consume** it as an **ingredient**, then **products** and further **consumer** recipes only). Deeper segments use numeric `0000`, `…`. Each node carries **`flowDir: 'left'|'right'`** so expansion never mixes directions on a chain. **Recipe focus** is a **recipe** root at **`layoutDepth` 0**: **`r…`** = **ingredients**, **`l…`** = **products**. The **spine** is a single **ancestor path** to the **spine terminal** (deepest selected node). **`expandedPathsForSpineTerminal`** keeps **expansion** to **prefix paths of that spine only** so **sibling** branches show as **leaves** (parent expanded, off-spine children not); choosing a new terminal clears deep expansion on other branches. A material root can still show **both** **`r…`** and **`l…`** at the first hop when the focus is expanded; walking deeper follows one chosen spine. Cycles appear as **new instances** when the user expands again. **`markRepeatMaterialNodes`** uses **min-shifted** `layoutDepth` for “earlier column”.

**Default expansion**: when the map opens for a new selection (or when `organizedData` arrives after the selection), the **focus node** is expanded automatically if it has children under the filter (**producers and/or consumers** for a material; **ingredients and/or products** for a recipe). **Reset expansion** returns to that default and resets the **spine** to the focus node.

**Edges**: Only **tree** edges from expansion (**recipe → material** product, **material → recipe** ingredient). Tree edges use a **single neutral** stroke in the host (no per-ingredient coloring).

**Interaction** (distinct from the icon grid’s tap-to-select):

- **Selected path**: tap (touch) or single click sets the **spine terminal** to that node (or steps up to its parent when clicking the spine); expansion is **recomputed** to that spine only (`expandedPathsForSpineTerminal`); the spine row is highlighted on cards.
- **Open in Factoriopedia**: double-click (pointer) or **long-press** (touch, ~520ms with movement cancel).
- **Science filter**: recipe and material visibility follows the same `sciencePackVisibility` / `isObjectVisible` rules as the details sections.

**Zoom vs node clicks**: d3-zoom registers `mousedown` and `touchstart` on the viewport. Cards stop those events from **bubbling** (`@mousedown.stop`, `@touchstart.stop`), and the host passes a **`zoomFilter`** so d3 ignores targets inside **`[data-production-map-card]`**. That prevents pan from stealing the synthetic **click** used for expand. **Wheel** is not stopped on cards so **Ctrl/Cmd + wheel** still zooms when the cursor is over a node.

**Viewport after expand/collapse**: when the spine changes, the host **animates** pan to **center the spine terminal horizontally** and **top-align** the graph (see above); users pan manually for off-spine siblings or distant branches.

**Motion**: cards use short **CSS transitions** on `top` and `left` when positions change; SVG edge paths update immediately (no path morph in v1).

**Data**: `src/utils/productionMapGraph.js` builds the expansion tree from `organizedData`, with caps; repeat materials are annotated for UI only.

## References

- `src/composables/useD3GraphZoom.js` — viewport binding, CSS transform helper, optional `zoomFilter`, `alignLayerPointToClient`, `animateTransformTo`, `clientToLayerContent`.
- `src/utils/researchMapLayout.js` — research map layout and edge routing.
- `src/utils/productionMapLayout.js` — `computeProductionMapFrame`, depth cap, deterministic depth→X and per-depth Y stack, `translateProductionMapPathD`, edge paths.
- `src/utils/productionMapViewport.js` — `computeTranslateForSpineTerminal`, `clampProductionMapTranslateY` (legacy helper, optional).
- `src/utils/productionMapGraph.js` — production map graph queries and visibility.
