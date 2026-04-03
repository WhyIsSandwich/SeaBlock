/**
 * Production map layout in **layout space**: pure depth→X and stacked Y per depth, then edge paths.
 * The host applies {@link translateProductionMapPathD} and a translate on positions for display normalization.
 * @module productionMapLayout
 */

export const PRODUCTION_MAP_MATERIAL_CARD_WIDTH = 120
export const PRODUCTION_MAP_RECIPE_CARD_WIDTH = 176
export const PRODUCTION_MAP_CARD_MIN_HEIGHT = 48
/** Looser sibling / layer spacing (overridable via options). */
export const PRODUCTION_MAP_GAP_X = 22
export const PRODUCTION_MAP_GAP_Y = 34

/**
 * Viewport width below which the production map uses narrow-stack UI (three graph columns do not fit).
 * @param {{ pad?: number, gapX?: number }} [options]
 * @returns {number}
 */
export function productionMapNarrowBreakpointPx(options = {}) {
  const pad = options.pad ?? 48
  const gapX = options.gapX ?? PRODUCTION_MAP_GAP_X
  const w = Math.max(PRODUCTION_MAP_MATERIAL_CARD_WIDTH, PRODUCTION_MAP_RECIPE_CARD_WIDTH)
  return 3 * (gapX + w) + pad
}

/** Max primary-axis layer index used for placement (cycles otherwise ratchet depth upward). */
export const PRODUCTION_MAP_LAYOUT_DEPTH_CAP_MAX = 48

/**
 * @param {number} nodeCount
 * @returns {number}
 */
export function layoutDepthCapForGraph(nodeCount) {
  return Math.min(PRODUCTION_MAP_LAYOUT_DEPTH_CAP_MAX, Math.max(0, nodeCount) + 5)
}

/**
 * @param {Map<string, number>} rawDepth
 * @param {number} cap
 * @returns {Map<string, number>}
 */
export function layoutDepthMap(rawDepth, cap) {
  const m = new Map()
  for (const [id, d] of rawDepth) {
    m.set(id, d < 0 ? d : Math.min(d, cap))
  }
  return m
}

/** @deprecated use material/recipe widths */
export const PRODUCTION_MAP_CARD_WIDTH = PRODUCTION_MAP_MATERIAL_CARD_WIDTH
/** @deprecated use estimateCardSizeForNode */
export const PRODUCTION_MAP_CARD_HEIGHT = 52

/**
 * Rough line count for a clamped label (matches CSS ~6.5px/char at 11px font).
 * @param {string} text
 * @param {number} maxLabelWidthPx
 * @param {number} charPx
 * @param {number} maxLines
 */
export function estimateWrappedLabelLines(text, maxLabelWidthPx, charPx = 6.5, maxLines = 3) {
  const s = text != null ? String(text) : ''
  if (!s.trim()) return 1
  const charsPerLine = Math.max(6, Math.floor(maxLabelWidthPx / charPx))
  let lines = 1
  let count = 0
  const words = s.split(/\s+/).filter(Boolean)
  for (const w of words) {
    if (w.length > charsPerLine) {
      lines += Math.ceil(w.length / charsPerLine)
      count = 0
    } else if (count + w.length + (count > 0 ? 1 : 0) > charsPerLine) {
      lines++
      count = w.length
    } else {
      count += w.length + (count > 0 ? 1 : 0)
    }
    if (lines >= maxLines) return maxLines
  }
  return Math.min(maxLines, lines)
}

/**
 * @param {object} node graph node with kind, displayName, name
 * @param {object} [options]
 * @returns {{ width: number, height: number }}
 */
export function estimateCardSizeForNode(node, options = {}) {
  const materialW = options.materialCardWidth ?? PRODUCTION_MAP_MATERIAL_CARD_WIDTH
  const recipeW = options.recipeCardWidth ?? PRODUCTION_MAP_RECIPE_CARD_WIDTH
  const lineH = options.labelLineHeight ?? 14
  const padY = options.cardPaddingY ?? 20
  const maxLabelLines = options.maxLabelLines ?? 3
  const iconSlot = 34

  if (node.kind === 'material') {
    const h = Math.max(PRODUCTION_MAP_CARD_MIN_HEIGHT, iconSlot + padY)
    return { width: materialW, height: h }
  }

  const labelInnerW = recipeW - iconSlot - 22
  const lines = estimateWrappedLabelLines(
    node.displayName || node.name,
    labelInnerW,
    options.charPx ?? 6.5,
    maxLabelLines
  )
  const h = Math.max(PRODUCTION_MAP_CARD_MIN_HEIGHT, padY + lines * lineH)
  return { width: recipeW, height: h }
}

/**
 * Shortest **hop count** from the focus on the **undirected** view of visible edges.
 * Directed relaxation used to ratchet to huge depths when closure edges form cycles; BFS is stable.
 * @param {Map<string, object>} nodes
 * @param {{ from: string, to: string }[]} edges
 * @param {string} focusId
 * @returns {Map<string, number>}
 */
export function computeProductionDepths(nodes, edges, focusId) {
  const depth = new Map()
  for (const id of nodes.keys()) {
    depth.set(id, -1)
  }
  if (!nodes.has(focusId)) {
    return depth
  }

  /** @type {Map<string, string[]>} */
  const adj = new Map()
  for (const id of nodes.keys()) {
    adj.set(id, [])
  }
  for (const e of edges) {
    const { from, to } = e
    if (!nodes.has(from) || !nodes.has(to)) continue
    adj.get(from).push(to)
    adj.get(to).push(from)
  }

  const q = [focusId]
  depth.set(focusId, 0)
  for (let qi = 0; qi < q.length; qi++) {
    const id = q[qi]
    const d = depth.get(id)
    for (const nb of adj.get(id) ?? []) {
      if (depth.get(nb) !== -1) continue
      depth.set(nb, d + 1)
      q.push(nb)
    }
  }

  return depth
}

/**
 * @param {string} nodeId
 * @param {Map<string, object>} nodes
 * @param {{ from: string, to: string }[]} edges
 * @returns {string[]}
 */
export function parentNodeIds(nodeId, nodes, edges) {
  const node = nodes.get(nodeId)
  if (!node) return []
  if (node.kind === 'material') {
    return edges.filter(e => e.to === nodeId && nodes.get(e.from)?.kind === 'recipe').map(e => e.from)
  }
  if (node.kind === 'recipe') {
    return edges.filter(e => e.to === nodeId && nodes.get(e.from)?.kind === 'material').map(e => e.from)
  }
  return []
}

/**
 * Per-depth sibling **Y**: optional **spine** row at `baseY` (one node per depth); others stack below.
 * @param {Map<string, { x: number, y: number, width: number, height: number }>} positions
 * @param {Map<string, number>} depthLayout
 * @param {number} gapY
 * @param {number} baseY
 * @param {Set<string> | null | undefined} spineNodeIds
 */
function assignStackedYByDepth(positions, depthLayout, gapY, baseY, spineNodeIds) {
  const byDepth = new Map()
  for (const [id, d] of depthLayout) {
    if (d < 0) continue
    if (!positions.has(id)) continue
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d).push(id)
  }
  for (const ids of byDepth.values()) {
    ids.sort((a, b) => a.localeCompare(b))
    let spineId = null
    if (spineNodeIds && spineNodeIds.size > 0) {
      for (const id of ids) {
        if (spineNodeIds.has(id)) {
          spineId = id
          break
        }
      }
    }
    if (spineId) {
      const sp = positions.get(spineId)
      if (sp) {
        sp.y = baseY
        const hSp = sp.height ?? PRODUCTION_MAP_CARD_MIN_HEIGHT
        let cursor = baseY + hSp + gapY
        for (const id of ids) {
          if (id === spineId) continue
          const p = positions.get(id)
          if (!p) continue
          const h = p.height ?? PRODUCTION_MAP_CARD_MIN_HEIGHT
          p.y = cursor
          cursor += h + gapY
        }
      }
    } else {
      let cursor = baseY
      for (const id of ids) {
        const p = positions.get(id)
        if (!p) continue
        const h = p.height ?? PRODUCTION_MAP_CARD_MIN_HEIGHT
        p.y = cursor
        cursor += h + gapY
      }
    }
  }
}

/**
 * @param {Map<string, object>} nodes
 * @param {object} options
 */
function computeNodeSizes(nodes, options) {
  const m = new Map()
  for (const [id, node] of nodes) {
    const base = estimateCardSizeForNode(node, options)
    const extra = options.getExtraCardHeight?.(node) ?? 0
    m.set(id, { width: base.width, height: base.height + extra })
  }
  return m
}

function maxDimension(sizes, dim) {
  let m = 0
  for (const s of sizes.values()) {
    m = Math.max(m, s[dim])
  }
  return m || (dim === 'width' ? PRODUCTION_MAP_MATERIAL_CARD_WIDTH : PRODUCTION_MAP_CARD_MIN_HEIGHT)
}

/**
 * @param {Map<string, object>} nodes
 * @param {number} dCap
 * @returns {Map<string, number>|null}
 */
function depthLayoutFromEmbeddedTree(nodes, dCap) {
  let minD = Infinity
  for (const n of nodes.values()) {
    const d = n.layoutDepth
    if (!Number.isInteger(d)) return null
    minD = Math.min(minD, d)
  }
  if (!Number.isFinite(minD)) return null
  const m = new Map()
  for (const [id, n] of nodes) {
    const d = n.layoutDepth
    const shifted = d - minD
    if (shifted < 0) return null
    m.set(id, Math.min(shifted, dCap))
  }
  return m
}

/**
 * Pure layout in **layout space**: same inputs always yield the same positions.
 *
 * **X**: `baseX + layoutDepth × (gapX + maxCardWidth)`.
 * **Y**: at each depth, nodes are **stable-sorted by id** and stacked with `gapY`, unless
 * `spineNodeIds` is set—then the spine node at each depth uses `baseY` and siblings stack below.
 *
 * @param {Map<string, object>} nodes
 * @param {{ from: string, to: string }[]} edges
 * @param {string} focusId
 * @param {object} [options]
 * @param {Set<string>} [options.spineNodeIds] path ids forming the selected spine (top row per column)
 * @param {number} [options.baseX] origin X for depth 0 (alias: anchorX)
 * @param {number} [options.layoutDepthCap] override auto cap from graph size
 * @param {(node: object) => number} [options.getExtraCardHeight] optional extra height (px) per node for host UI (e.g. mobile recipe lines)
 * @returns {{ positions: Map<string, { x: number, y: number, width: number, height: number }>, contentBounds: { minX: number, minY: number, maxX: number, maxY: number } }}
 */
export function computeProductionMapLayout(nodes, edges, focusId, options = {}) {
  const gapX = options.gapX ?? PRODUCTION_MAP_GAP_X
  const gapY = options.gapY ?? PRODUCTION_MAP_GAP_Y
  const baseY = options.baseY ?? 48
  const baseX = options.baseX ?? options.anchorX ?? 48

  const sizes = computeNodeSizes(nodes, options)
  const layerStrideX = gapX + maxDimension(sizes, 'width')

  const dCap =
    options.layoutDepthCap != null ? options.layoutDepthCap : layoutDepthCapForGraph(nodes.size)
  const embedded = depthLayoutFromEmbeddedTree(nodes, dCap)
  const depthLayout =
    embedded ??
    layoutDepthMap(computeProductionDepths(nodes, edges, focusId), dCap)
  const positions = new Map()

  const depthSorted = [...depthLayout.entries()]
    .filter(([, d]) => d >= 0)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))

  for (const [id, d] of depthSorted) {
    const sz = sizes.get(id) || { width: PRODUCTION_MAP_MATERIAL_CARD_WIDTH, height: PRODUCTION_MAP_CARD_MIN_HEIGHT }
    const x = baseX + d * layerStrideX
    positions.set(id, { x, y: 0, width: sz.width, height: sz.height })
  }

  assignStackedYByDepth(positions, depthLayout, gapY, baseY, options.spineNodeIds)

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + p.width)
    maxY = Math.max(maxY, p.y + p.height)
  }
  if (!Number.isFinite(minX)) {
    minX = 0
    minY = 0
    maxX = PRODUCTION_MAP_MATERIAL_CARD_WIDTH
    maxY = PRODUCTION_MAP_CARD_MIN_HEIGHT
  }

  const pad = options.pad ?? 32
  return {
    positions,
    contentBounds: {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad
    }
  }
}

/** Minimum clear gap along X to use left/right ports; else top/bottom (same column / overlap). */
const PRODUCTION_MAP_FLOW_X_EPS = 2

/**
 * Ports on card **edges**: **left/right** when there is a clear horizontal gap (flow along +X on desktop).
 * `from` entirely left of `to` → exit right / enter left; the reverse → exit left / enter right.
 * If rects overlap in X, use top/bottom by vertical order.
 * @param {{ x: number, y: number, width: number, height: number }} from
 * @param {{ x: number, y: number, width: number, height: number }} to
 */
function edgePortsForRects(from, to) {
  const axc = from.x + from.width / 2
  const bxc = to.x + to.width / 2
  const ay = from.y + from.height / 2
  const by = to.y + to.height / 2

  const fromRight = from.x + from.width
  const fromBottom = from.y + from.height
  const toRight = to.x + to.width
  const toBottom = to.y + to.height

  const eps = PRODUCTION_MAP_FLOW_X_EPS
  if (fromRight <= to.x - eps) {
    return { x1: fromRight, y1: ay, x2: to.x, y2: by, horizontal: true }
  }
  if (toRight <= from.x - eps) {
    return { x1: from.x, y1: ay, x2: toRight, y2: by, horizontal: true }
  }

  if (ay <= by) {
    return { x1: axc, y1: fromBottom, x2: bxc, y2: to.y, horizontal: false }
  }
  return { x1: axc, y1: from.y, x2: bxc, y2: toBottom, horizontal: false }
}

/**
 * Edge paths between card rects (geometry-based; depth is along +X from the focus).
 * @param {Map<string, { x: number, y: number, width: number, height: number }>} positions
 * @param {{ from: string, to: string, kind?: string }[]} edges
 * @param {Map<string, object> | null} [nodes] reserved for future edge styling; tree strokes are neutral in the host
 * @returns {{ key: string, d: string, kind: string, stroke?: string | null }[]}
 */
export function computeProductionEdgePaths(positions, edges, _nodes = null) {
  const out = []
  for (const e of edges) {
    const { from, to, kind = 'tree' } = e
    const a = positions.get(from)
    const b = positions.get(to)
    if (!a || !b) continue

    const p = edgePortsForRects(a, b)
    let d
    if (p.horizontal) {
      const mid = (p.x1 + p.x2) / 2
      d = `M ${p.x1} ${p.y1} C ${mid} ${p.y1} ${mid} ${p.y2} ${p.x2} ${p.y2}`
    } else {
      const mid = (p.y1 + p.y2) / 2
      d = `M ${p.x1} ${p.y1} C ${p.x1} ${mid} ${p.x2} ${mid} ${p.x2} ${p.y2}`
    }
    out.push({ key: `${from}\0${to}`, d, kind, stroke: null })
  }
  return out
}

/**
 * Shift SVG path `d` produced by {@link computeProductionEdgePaths} by `(ox, oy)` (same as display norm on card `left`/`top`).
 * Only `M` / `C` commands with numeric coordinates are supported (matches this module’s edge paths).
 * @param {string} d
 * @param {number} ox
 * @param {number} oy
 * @returns {string}
 */
export function translateProductionMapPathD(d, ox, oy) {
  if (ox === 0 && oy === 0) return d
  const tokens = d.trim().split(/\s+/)
  const out = []
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (t === 'M' || t === 'C') {
      out.push(t)
      i++
      const count = t === 'M' ? 2 : 6
      for (let k = 0; k < count; k++) {
        const n = Number(tokens[i + k])
        const isX = k % 2 === 0
        out.push(String(isX ? n + ox : n + oy))
      }
      i += count
    } else {
      i++
    }
  }
  return out.join(' ')
}

/**
 * Full **layout-space** frame: positions, padded bounds, and edge paths (before host display normalization).
 * @param {Map<string, object>} nodes
 * @param {{ from: string, to: string, kind?: string }[]} edges
 * @param {string} focusId
 * @param {object} [options] passed to {@link computeProductionMapLayout}
 * @returns {{
 *   positions: Map<string, { x: number, y: number, width: number, height: number }>,
 *   contentBounds: { minX: number, minY: number, maxX: number, maxY: number },
 *   edgePaths: { key: string, d: string, kind: string, stroke?: string | null }[]
 * }}
 */
export function computeProductionMapFrame(nodes, edges, focusId, options = {}) {
  const { positions, contentBounds } = computeProductionMapLayout(nodes, edges, focusId, options)
  const edgePaths = computeProductionEdgePaths(positions, edges, nodes)
  return { positions, contentBounds, edgePaths }
}
