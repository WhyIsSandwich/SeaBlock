import { graphConnect, layeringLongestPath, shapeRect, sugiyama, tweakShape } from 'd3-dag'

import { isHiddenFactorioPrototype } from './factorioPrototypeVisibility.js'
import { buildObstacleRects, polylineIntersectsAnyObstacle } from './researchMapObstacles.js'
import { verticesFromOrthogonalSvgPath } from './researchMapPathParse.js'

/**
 * Layout tuning for the Factoriopedia research map: adjust these for wider tiers, sparser rows, or
 * more room for orthogonal edges ({@link computeResearchMapLayout}).
 */
/** Card width in FactoriopediaTechTreeModal (matches CSS .techCard). */
export const RESEARCH_MAP_CARD_WIDTH = 96
/** Vertical gap between tier rows in the modal (matches absolute card positioning). */
export const RESEARCH_MAP_ROW_GAP = 34
/** Approximate card height for layout (icon + title + science strip). */
export const RESEARCH_MAP_CARD_HEIGHT = 114
/**
 * Minimum horizontal gap between adjacent card edges after compaction (px).
 * Larger values widen the tree and leave more room between columns for orthogonal edges.
 */
export const RESEARCH_MAP_MIN_CENTER_GAP = 32
/**
 * Abstract spacing between direct prerequisites of the selected tech (rank 1). Kept at 1 so tiers
 * near the goal stay tight; extra horizontal spread toward the roots comes from
 * {@link abstractCompactMinGapForRank} during compaction.
 */
export const RESEARCH_MAP_RANK1_SIBLING_SPACING = 1
/**
 * Extra minimum abstract gap at the highest sink ranks (furthest from the goal). Rank 1 uses gap 1;
 * rank maxRank uses 1 + this value. Matches in-game feel: compact near the selected technology, airy
 * toward prerequisite roots.
 */
export const RESEARCH_MAP_RANK_COMPACT_EXTRA = 0.85

/** Content padding around the laid-out graph bbox (px); SVG/cards share one origin after normalization). */
export const RESEARCH_MAP_PAD = 12

/**
 * Single pixel model for Sugiyama `nodeSize` / `gap` and DOM cards — keep in sync with
 * {@link docs/.vitepress/components/FactoriopediaTechTreeModal.vue} (card width/height inline styles).
 *
 * **Coordinate spaces:** `sugiyama()` + `tweakShape` produce a dag whose `node.x` / `node.y` and
 * `GraphLink#points` live in **dag space** (before `RESEARCH_MAP_PAD` and min-bbox normalization).
 * All **visible** geometry (cards, ports, edge `y1`/`y2`/`midY`) comes from `nodeLayouts` in
 * **layout space** (subtract modal `offsetY` when routing). Edge routing must not treat dag Y as
 * authoritative; `link.points` may still inform **X** waypoints along a gutter.
 *
 * DOM: use the same `cardWidth` / `cardHeight` for absolutely positioned cards as for `nodeSize` above.
 */
export const RESEARCH_MAP_LAYOUT_PIXELS = Object.freeze({
  pad: RESEARCH_MAP_PAD,
  cardWidth: RESEARCH_MAP_CARD_WIDTH,
  cardHeight: RESEARCH_MAP_CARD_HEIGHT,
  rowGap: RESEARCH_MAP_ROW_GAP,
  minCenterGap: RESEARCH_MAP_MIN_CENTER_GAP
})

/**
 * @param {Record<string, object>} technologies
 * @param {string} targetName
 * @returns {Set<string>}
 */
export function collectVisiblePrerequisiteClosure(technologies, targetName) {
  const nodes = new Set()
  if (!technologies?.[targetName] || isHiddenFactorioPrototype(technologies[targetName])) {
    return nodes
  }

  function collect(name) {
    if (nodes.has(name)) return
    const t = technologies[name]
    if (!t || isHiddenFactorioPrototype(t)) return
    nodes.add(name)
    for (const p of t.prerequisites || []) {
      if (!technologies[p]) continue
      if (isHiddenFactorioPrototype(technologies[p])) continue
      collect(p)
    }
  }
  collect(targetName)
  return nodes
}

/**
 * All technologies required before `techName` (recursive prerequisites), not including `techName`.
 * Uses shared `memo` when provided to speed batch layout.
 */
export function transitivePrerequisitesUp(
  technologies,
  techName,
  memo = new Map(),
  visiting = new Set()
) {
  if (memo.has(techName)) return memo.get(techName)
  if (visiting.has(techName)) {
    return new Set()
  }
  visiting.add(techName)
  const out = new Set()
  for (const p of technologies[techName]?.prerequisites || []) {
    if (!p) continue
    out.add(p)
    const sub = transitivePrerequisitesUp(technologies, p, memo, visiting)
    for (const x of sub) out.add(x)
  }
  visiting.delete(techName)
  memo.set(techName, out)
  return out
}

/**
 * Direct prerequisites minus those implied by another direct prerequisite (in-game style).
 * If P and Q are both listed and Q requires P transitively, the edge to P is redundant; only Q is kept.
 */
export function effectivePrerequisites(technologies, techName, memo = new Map()) {
  const direct = [...(technologies[techName]?.prerequisites || [])].filter(Boolean)
  if (direct.length <= 1) return direct

  const redundant = new Set()
  for (const p of direct) {
    for (const q of direct) {
      if (p === q) continue
      const beforeQ = transitivePrerequisitesUp(technologies, q, memo)
      if (beforeQ.has(p)) {
        redundant.add(p)
        break
      }
    }
  }
  return direct.filter(p => !redundant.has(p))
}

/**
 * Sort key aligned with Factorio prototype `Order` (lexicographic `order` string, default `""`, then name):
 * @see https://lua-api.factorio.com/latest/types/Order.html
 *
 * Does **not** apply forum “list view” rules (science packs, research cost, etc.)—those target the flat
 * research list, not proven for the technology **tree** graph.
 *
 * @param {string} a — technology id
 * @param {string} b — technology id
 * @param {Record<string, { order?: string }>} technologies
 */
export function technologyLayoutOrder(a, b, technologies) {
  const oa = String(technologies[a]?.order ?? '')
  const ob = String(technologies[b]?.order ?? '')
  const c = oa.localeCompare(ob)
  if (c !== 0) return c
  return a.localeCompare(b)
}

/**
 * Sink rank: rank(goal)=0; rank(n)=1+max(rank(d)|d dependent of n in subgraph).
 */
export function computeSinkRanks(nodes, dependents, target, technologies = {}) {
  const rankMemo = new Map()
  function longestRankToTarget(n, visiting = new Set()) {
    if (n === target) {
      rankMemo.set(n, 0)
      return 0
    }
    if (rankMemo.has(n)) return rankMemo.get(n)
    if (visiting.has(n)) return 0
    visiting.add(n)
    const deps = dependents.get(n) || []
    let r = 0
    if (deps.length > 0) {
      r = 1 + Math.max(...deps.map(d => longestRankToTarget(d, visiting)))
    }
    visiting.delete(n)
    rankMemo.set(n, r)
    return r
  }
  for (const n of nodes) longestRankToTarget(n)

  let maxRank = 0
  const byRank = new Map()
  for (const n of nodes) {
    const r = rankMemo.get(n) ?? 0
    if (r > maxRank) maxRank = r
    if (!byRank.has(r)) byRank.set(r, [])
    byRank.get(r).push(n)
  }
  for (const arr of byRank.values()) {
    arr.sort((a, b) => technologyLayoutOrder(a, b, technologies))
  }
  return { rankOf: rankMemo, maxRank, byRank }
}

/** Dependents with rank exactly one less than parent (toward sink). */
export function childrenTowardSink(n, rankOf, dependents, technologies = {}) {
  const r = rankOf.get(n) ?? 0
  if (r <= 0) return []
  const want = r - 1
  const out = []
  for (const d of dependents.get(n) || []) {
    if ((rankOf.get(d) ?? -1) === want) out.push(d)
  }
  out.sort((a, b) => technologyLayoutOrder(a, b, technologies))
  return out
}

/**
 * All proper descendants of `n` toward the sink: follow edges n→d where d lists n as a prerequisite,
 * only when rank(d) < rank(n) (strictly toward the goal). Stays inside `nodes`.
 */
export function collectDescendantsTowardSink(n, nodes, rankOf, dependents) {
  const out = new Set()
  const rn = rankOf.get(n) ?? 0
  if (rn <= 0) return out

  const stack = []
  for (const d of dependents.get(n) || []) {
    const rd = rankOf.get(d) ?? -1
    if (rd < rn && rd >= 0 && nodes.has(d)) stack.push(d)
  }
  while (stack.length > 0) {
    const d = stack.pop()
    if (!nodes.has(d)) continue
    const rd = rankOf.get(d) ?? -1
    if (rd < 0) continue
    if (out.has(d)) continue
    out.add(d)
    for (const e of dependents.get(d) || []) {
      const re = rankOf.get(e) ?? -1
      if (re < rd && re >= 0) stack.push(e)
    }
  }
  return out
}

/**
 * Design coordinates: abstract center `x` (unitless) and sink `rank` → row `y` are computed here.
 * Pixel conversion happens in `computeResearchMapLayout`; Vue only applies visibility slice offsets.
 *
 * Rank 0 = goal at x=0. Rank 1 = spread direct prerequisites (tight unit spacing).
 * Rank ≥ 2: each node’s x is the midpoint of min/max abstract x over **all** descendants toward the sink
 * (full subtree footprint). If that set is empty, x falls back to the midpoint of direct prerequisites’ x
 * so sources and odd branches do not collapse on the goal column.
 *
 * @param {Map<string, string[]>} [effectiveByName] — optional `effectivePrerequisites` per node (same as
 *   `computeResearchMapLayout`); when set, rank-1 slots and midpoint fallbacks match drawn edges.
 */
export function assignAbstractCenterX(
  nodes,
  rankOf,
  maxRank,
  byRank,
  dependents,
  target,
  technologies,
  effectiveByName = null
) {
  const x = new Map()
  const s = RESEARCH_MAP_RANK1_SIBLING_SPACING
  const memo = new Map()

  function effectiveListFor(name) {
    if (effectiveByName?.has(name)) {
      return effectiveByName.get(name) || []
    }
    return effectivePrerequisites(technologies, name, memo).filter(p => nodes.has(p))
  }

  x.set(target, 0)

  if (maxRank >= 1) {
    const prereqs = effectiveListFor(target).filter(p => (rankOf.get(p) ?? -1) === 1)
    prereqs.sort((a, b) => technologyLayoutOrder(a, b, technologies))
    const nPr = prereqs.length
    for (let i = 0; i < nPr; i++) {
      x.set(prereqs[i], s * (i - (nPr - 1) / 2))
    }
  }

  for (let r = 2; r <= maxRank; r++) {
    const layer = [...(byRank.get(r) || [])]
    layer.sort((a, b) => technologyLayoutOrder(a, b, technologies))
    for (const n of layer) {
      const desc = collectDescendantsTowardSink(n, nodes, rankOf, dependents)
      const xs = []
      for (const d of desc) {
        const v = x.get(d)
        if (typeof v === 'number' && !Number.isNaN(v)) xs.push(v)
      }
      if (xs.length > 0) {
        let lo = xs[0]
        let hi = xs[0]
        for (let i = 1; i < xs.length; i++) {
          if (xs[i] < lo) lo = xs[i]
          if (xs[i] > hi) hi = xs[i]
        }
        x.set(n, (lo + hi) / 2)
      } else {
        const direct = effectiveListFor(n).filter(p => nodes.has(p))
        const px = []
        for (const p of direct) {
          const v = x.get(p)
          if (typeof v === 'number' && !Number.isNaN(v)) px.push(v)
        }
        if (px.length > 0) {
          let lo = px[0]
          let hi = px[0]
          for (let i = 1; i < px.length; i++) {
            if (px[i] < lo) lo = px[i]
            if (px[i] > hi) hi = px[i]
          }
          x.set(n, (lo + hi) / 2)
        } else {
          x.set(n, 0)
        }
      }
    }
  }

  return x
}

/**
 * Overlap resolution only: sort by x and push each node right **only** when it would be closer than
 * `minGap` to the previous center. Does not shrink large intentional gaps between clusters.
 */
export function compactLayerCenters(names, x, minGap) {
  if (names.length <= 1) return
  const sorted = [...names].sort((a, b) => (x.get(a) ?? 0) - (x.get(b) ?? 0))
  let prev = x.get(sorted[0]) ?? 0
  for (let i = 1; i < sorted.length; i++) {
    const id = sorted[i]
    const cur = x.get(id) ?? 0
    const need = prev + minGap
    if (cur < need) {
      x.set(id, need)
    }
    prev = x.get(id) ?? need
  }
}

/**
 * Minimum abstract center-to-center gap after compaction for one sink-rank layer.
 * Rank 0 = goal; rank 1 = direct prerequisites (tight); rank maxRank = roots (widest).
 *
 * @param {number} rank — sink rank (0 = selected tech)
 * @param {number} maxRank
 * @param {number} [compactExtra] — defaults to {@link RESEARCH_MAP_RANK_COMPACT_EXTRA}
 */
export function abstractCompactMinGapForRank(
  rank,
  maxRank,
  compactExtra = RESEARCH_MAP_RANK_COMPACT_EXTRA
) {
  if (maxRank <= 1) return 1
  const span = maxRank - 1
  const t = span > 0 ? (rank - 1) / span : 0
  const u = Math.max(0, Math.min(1, t))
  return 1 + compactExtra * u
}

/**
 * Convert abstract units to pixel center X (1 unit = one minimum slot width).
 */
export function abstractToPixelCenterX(abstractX, unitWidth) {
  return abstractX * unitWidth
}

/** Default cap used only for non-direct descendants (depth >= 2). */
export const RESEARCH_MAP_NON_DIRECT_DESCENDANT_BUDGET = 40

function getVisibleTechnologies(technologies) {
  const out = {}
  for (const [name, tech] of Object.entries(technologies || {})) {
    if (!tech || isHiddenFactorioPrototype(tech)) continue
    out[name] = tech
  }
  return out
}

function buildEffectivePrereqIndex(technologies) {
  const memo = new Map()
  const effectiveByName = new Map()
  for (const name of Object.keys(technologies || {})) {
    effectiveByName.set(name, effectivePrerequisites(technologies, name, memo))
  }
  return effectiveByName
}

function buildDependentsFromEffective(technologies, effectiveByName) {
  const dependents = new Map()
  for (const name of Object.keys(technologies || {})) {
    for (const p of effectiveByName.get(name) || []) {
      if (!technologies[p]) continue
      if (!dependents.has(p)) dependents.set(p, [])
      dependents.get(p).push(name)
    }
  }
  for (const list of dependents.values()) {
    list.sort((a, b) => technologyLayoutOrder(a, b, technologies))
  }
  return dependents
}

function collectRawDirectDescendants(technologies, targetName) {
  const out = new Set()
  for (const [name, tech] of Object.entries(technologies || {})) {
    if (!tech || name === targetName) continue
    if ((tech.prerequisites || []).includes(targetName)) {
      out.add(name)
    }
  }
  return out
}

function computeDescendantDepths(targetName, dependents) {
  const depthOf = new Map()
  const byDepth = new Map()
  const queue = [{ name: targetName, depth: 0 }]
  depthOf.set(targetName, 0)
  byDepth.set(0, [targetName])
  while (queue.length > 0) {
    const { name, depth } = queue.shift()
    for (const d of dependents.get(name) || []) {
      const nextDepth = depth + 1
      const prev = depthOf.get(d)
      if (prev !== undefined && prev <= nextDepth) continue
      depthOf.set(d, nextDepth)
      if (!byDepth.has(nextDepth)) byDepth.set(nextDepth, [])
      byDepth.get(nextDepth).push(d)
      queue.push({ name: d, depth: nextDepth })
    }
  }
  for (const [depth, names] of byDepth.entries()) {
    const unique = [...new Set(names)]
    byDepth.set(depth, unique)
  }
  return { depthOf, byDepth }
}

function selectDescendantWindowNodes(targetName, byDepth, rawDirectDescendants, nonDirectBudget) {
  const included = new Set([targetName])
  const includedDepths = new Set([0])
  const directVisible = new Set()
  const depth1 = byDepth.get(1) || []
  let totalRenderedDescendants = 0
  for (const name of depth1) {
    included.add(name)
    includedDepths.add(1)
    totalRenderedDescendants += 1
    if (rawDirectDescendants.has(name)) directVisible.add(name)
  }

  const maxDepth = Math.max(0, ...byDepth.keys())
  for (let depth = 2; depth <= maxDepth; depth++) {
    const row = byDepth.get(depth) || []
    if (row.length === 0) continue
    // Row-window rule: keep whole row only if cumulative descendants stay <= budget.
    if (totalRenderedDescendants + row.length > nonDirectBudget) break
    for (const name of row) {
      included.add(name)
      if (rawDirectDescendants.has(name)) directVisible.add(name)
    }
    includedDepths.add(depth)
    totalRenderedDescendants += row.length
  }

  const hiddenDirect = [...rawDirectDescendants].filter(name => !directVisible.has(name))
  return {
    includedNodes: included,
    includedDepths,
    hiddenDirectDescendants: hiddenDirect,
    visibleDirectDescendants: [...directVisible],
    totalRenderedDescendants
  }
}

function collectAncestorClosure(technologies, targetName) {
  const nodes = new Set()
  if (!technologies?.[targetName]) return nodes
  function visit(name) {
    if (nodes.has(name)) return
    const tech = technologies[name]
    if (!tech) return
    nodes.add(name)
    for (const p of tech.prerequisites || []) {
      if (!technologies[p]) continue
      visit(p)
    }
  }
  visit(targetName)
  return nodes
}

function computeAncestorDepths(technologies, targetName) {
  const depthOf = new Map([[targetName, 0]])
  const queue = [targetName]
  while (queue.length > 0) {
    const name = queue.shift()
    const d = depthOf.get(name) ?? 0
    for (const p of technologies[name]?.prerequisites || []) {
      if (!technologies[p]) continue
      const next = d + 1
      const prev = depthOf.get(p)
      if (prev !== undefined && prev <= next) continue
      depthOf.set(p, next)
      queue.push(p)
    }
  }
  return depthOf
}

/**
 * @param {Record<string, object>} technologies
 * @param {string} targetName
 * @param {object} [options]
 * @param {number} [options.cardWidth]
 * @param {number} [options.rowGap]
 * @param {number} [options.cardHeight]
 * @param {number} [options.minCenterGap] — px gap between adjacent card edges (horizontal gap for d3-dag sugiyama)
 * @param {number} [options.pad] — content padding around graph bbox (px); defaults to {@link RESEARCH_MAP_PAD}
 * @param {number} [options.rankCompactExtra] — unused by {@link computeResearchMapLayout} (kept for API compatibility); abstract compaction still uses it in tests/helpers
 */
export function computeResearchMapLayout(technologies, targetName, options = {}) {
  const cardWidth = options.cardWidth ?? RESEARCH_MAP_CARD_WIDTH
  const rowGap = options.rowGap ?? RESEARCH_MAP_ROW_GAP
  const cardHeight = options.cardHeight ?? RESEARCH_MAP_CARD_HEIGHT
  const minCenterGap = options.minCenterGap ?? RESEARCH_MAP_MIN_CENTER_GAP
  const nonDirectDescendantBudget =
    options.nonDirectDescendantBudget ?? RESEARCH_MAP_NON_DIRECT_DESCENDANT_BUDGET

  const visibleTechnologies = getVisibleTechnologies(technologies)
  if (!visibleTechnologies[targetName]) {
    return null
  }

  const target = targetName
  const effectiveByNameAll = buildEffectivePrereqIndex(visibleTechnologies)
  const dependentsAll = buildDependentsFromEffective(visibleTechnologies, effectiveByNameAll)
  const rawDirectDescendants = collectRawDirectDescendants(visibleTechnologies, target)
  const ancestorNodes = collectAncestorClosure(visibleTechnologies, target)
  const ancestorDepthOf = computeAncestorDepths(visibleTechnologies, target)
  const { depthOf, byDepth } = computeDescendantDepths(target, dependentsAll)
  const descendantBudget = Math.max(0, nonDirectDescendantBudget)
  const windowSelection = selectDescendantWindowNodes(
    target,
    byDepth,
    rawDirectDescendants,
    descendantBudget
  )
  const nodes = new Set([...ancestorNodes, ...windowSelection.includedNodes])
  if (!nodes.has(target)) return null

  const effectiveByName = new Map()
  for (const name of nodes) {
    const effective = effectiveByNameAll.get(name) || []
    effectiveByName.set(
      name,
      effective.filter(p => nodes.has(p))
    )
  }

  const edgeSet = new Set()
  const edges = []
  for (const name of nodes) {
    for (const p of effectiveByName.get(name) || []) {
      const key = `${p}\0${name}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        edges.push([p, name])
      }
    }
  }

  const dependents = new Map()
  for (const name of nodes) {
    for (const p of effectiveByName.get(name) || []) {
      if (!dependents.has(p)) dependents.set(p, [])
      dependents.get(p).push(name)
    }
  }
  for (const list of dependents.values()) {
    list.sort((a, b) => technologyLayoutOrder(a, b, visibleTechnologies))
  }

  const descendantDepthOf = new Map()
  let maxDescDepth = 0
  for (const name of nodes) {
    const d = depthOf.get(name) ?? 0
    descendantDepthOf.set(name, d)
    if (d > maxDescDepth) maxDescDepth = d
  }

  const rankOf = new Map()
  const byRank = new Map()
  let maxRank = 0
  for (const name of nodes) {
    const ancestorDepth = ancestorDepthOf.get(name)
    const descendantDepth = descendantDepthOf.get(name) ?? 0
    const signedLevel = ancestorDepth !== undefined ? ancestorDepth : -descendantDepth
    const rank = signedLevel + maxDescDepth
    rankOf.set(name, rank)
    if (!byRank.has(rank)) byRank.set(rank, [])
    byRank.get(rank).push(name)
    if (rank > maxRank) maxRank = rank
  }
  for (const list of byRank.values()) {
    list.sort((a, b) => technologyLayoutOrder(a, b, visibleTechnologies))
  }

  const pad = options.pad ?? RESEARCH_MAP_PAD
  const rowHeight = cardHeight + rowGap

  /** @type {Map<string, { id: string, rank: number, centerX: number, top: number, width: number, height: number, left: number }>} */
  const nodeLayouts = new Map()
  let width = 1
  let totalHeight = 1
  let minXBBox = 0
  /** @type {object | null} */
  let dag = null
  /** @type {{ minLX: number, minTY: number, pad: number } | null} */
  let dagBBox = null

  if (edges.length === 0) {
    const cx = pad + cardWidth / 2
    const top = pad
    nodeLayouts.set(target, {
      id: target,
      rank: 0,
      centerX: cx,
      top,
      width: cardWidth,
      height: cardHeight,
      left: cx - cardWidth / 2
    })
    width = Math.max(1, cardWidth + pad * 2)
    totalHeight = Math.max(1, cardHeight + pad * 2)
    minXBBox = 0
  } else {
    dag = graphConnect()(edges)
    const nodeSizeTuple = /** @type {const} */ ([cardWidth, cardHeight])
    const layoutOp = sugiyama()
      .layering(layeringLongestPath().topDown(false))
      .nodeSize(nodeSizeTuple)
      .gap([minCenterGap, rowGap])
      /** Truncate links at rectangle bounds — populates {@link GraphLink#points} for rendering. */
      .tweaks([tweakShape(nodeSizeTuple, shapeRect)])
    layoutOp(dag)

    let minLX = Infinity
    let maxRX = -Infinity
    let minTY = Infinity
    let maxBY = -Infinity
    for (const n of dag.nodes()) {
      const cx = n.x
      const top = n.y - cardHeight / 2
      const left = cx - cardWidth / 2
      const right = cx + cardWidth / 2
      const bottom = n.y + cardHeight / 2
      if (left < minLX) minLX = left
      if (right > maxRX) maxRX = right
      if (top < minTY) minTY = top
      if (bottom > maxBY) maxBY = bottom
    }
    if (!Number.isFinite(minLX)) minLX = 0
    if (!Number.isFinite(maxRX)) maxRX = cardWidth
    if (!Number.isFinite(minTY)) minTY = 0
    if (!Number.isFinite(maxBY)) maxBY = cardHeight

    width = Math.max(1, Math.ceil(maxRX - minLX + pad * 2))
    totalHeight = Math.max(1, Math.ceil(maxBY - minTY + pad * 2))
    minXBBox = minLX
    dagBBox = { minLX, minTY, pad }

    for (const n of dag.nodes()) {
      const id = String(n.data)
      const cx = n.x - minLX + pad
      const top = n.y - cardHeight / 2 - minTY + pad
      const r = rankOf.get(id) ?? 0
      nodeLayouts.set(id, {
        id,
        rank: r,
        centerX: cx,
        top,
        width: cardWidth,
        height: cardHeight,
        left: cx - cardWidth / 2
      })
    }

    let minNodeTop = Infinity
    let maxNodeBottom = -Infinity
    for (const nl of nodeLayouts.values()) {
      if (nl.top < minNodeTop) minNodeTop = nl.top
      if (nl.top + nl.height > maxNodeBottom) maxNodeBottom = nl.top + nl.height
    }
    if (Number.isFinite(minNodeTop) && Number.isFinite(maxNodeBottom)) {
      totalHeight = Math.max(1, Math.ceil(maxNodeBottom - minNodeTop + pad * 2))
    }
  }

  const rowsTopToBottom = []
  for (let r = maxRank; r >= 0; r--) {
    const names = [...(byRank.get(r) || [])]
    names.sort((a, b) => {
      const la = nodeLayouts.get(a)
      const lb = nodeLayouts.get(b)
      const xa = la?.centerX ?? 0
      const xb = lb?.centerX ?? 0
      if (xa !== xb) return xa - xb
      return a.localeCompare(b)
    })
    rowsTopToBottom.push({
      layerIndex: r,
      names
    })
  }

  return {
    target,
    technologies: visibleTechnologies,
    nodes,
    edges,
    maxRank,
    rankOf,
    byRank,
    rowsTopToBottom,
    nodeLayouts,
    dag,
    dagBBox,
    contentWidth: width,
    contentHeight: totalHeight,
    descendantWindow: {
      nonDirectBudget: nonDirectDescendantBudget,
      budgetAfterDirect: Math.max(0, nonDirectDescendantBudget - (byDepth.get(1)?.length || 0)),
      rawDirectDescendants: [...rawDirectDescendants].sort((a, b) => a.localeCompare(b)),
      visibleDirectDescendants: [...windowSelection.visibleDirectDescendants].sort((a, b) =>
        a.localeCompare(b)
      ),
      hiddenDirectDescendants: [...windowSelection.hiddenDirectDescendants].sort((a, b) =>
        a.localeCompare(b)
      ),
      renderedDepths: [...windowSelection.includedDepths].sort((a, b) => a - b),
      depthOf: Object.fromEntries([...descendantDepthOf.entries()]),
      totalRenderedDescendants: windowSelection.totalRenderedDescendants
    },
    layoutConstants: {
      cardWidth,
      rowGap,
      cardHeight,
      rowHeight,
      pad,
      minXShift: -minXBBox + pad
    }
  }
}

/** Preferred vertical offset between parallel edge “lanes” in the gutter between adjacent tiers (px). */
export const RESEARCH_MAP_EDGE_GUTTER_LANE_PX = 4
/** Upper cap when the gutter is tall — lanes need not spread beyond this (px). */
export const RESEARCH_MAP_EDGE_GUTTER_LANE_MAX_PX = 16
/**
 * Keep staggered midY lines inside the gutter: at least this margin from parent bottom / child top (px).
 */
export const RESEARCH_MAP_EDGE_GUTTER_MARGIN_PX = 4
/**
 * Minimum vertical run along the port column after leaving the parent bottom or before entering the child
 * top, so the first/last bend is not flush with the card edge (keeps ports visually distinct).
 */
export const RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX = 6

/**
 * Lane spacing for edges that share the same rank-pair gutter: fits within `(y2 - y1)` with margins,
 * compresses when many parallels would overflow. When the gutter is tall, spacing stays at the preferred
 * step (capped by {@link RESEARCH_MAP_EDGE_GUTTER_LANE_MAX_PX}) rather than stretching to fill the gap.
 *
 * @param {number} gutterHeight — `y2 - y1` (child top minus parent bottom), same units as layout
 * @param {number} parallelEdgeCount — edges in the same (fromRank, toRank) bucket
 * @param {{ gutterLanePx?: number, gutterLaneMaxPx?: number, gutterMarginPx?: number }} [options]
 */
export function computeGutterLaneSpacingPx(gutterHeight, parallelEdgeCount, options = {}) {
  const base = options.gutterLanePx ?? RESEARCH_MAP_EDGE_GUTTER_LANE_PX
  const maxL = options.gutterLaneMaxPx ?? RESEARCH_MAP_EDGE_GUTTER_LANE_MAX_PX
  const margin = options.gutterMarginPx ?? RESEARCH_MAP_EDGE_GUTTER_MARGIN_PX
  const n = parallelEdgeCount
  if (!Number.isFinite(gutterHeight) || gutterHeight <= 0 || n <= 1) return base
  const maxSpread = Math.max(0, gutterHeight - 2 * margin)
  const raw = maxSpread / (n - 1)
  if (raw >= base) return Math.min(maxL, base)
  return Math.min(maxL, raw)
}

/** @param {{ centerX?: number } | undefined} layout */
function layoutCenterX(layout) {
  const x = layout?.centerX
  return typeof x === 'number' && !Number.isNaN(x) ? x : 0
}

/** Sink rank gap `rank(from) − rank(to)` for one edge (1 = adjacent tier, larger = skip tiers). */
function sinkRankGap(it) {
  return (it.a.rank ?? 0) - (it.b.rank ?? 0)
}

/**
 * X coordinate where an edge leaves the bottom of a parent card: in-game, one edge uses the center;
 * multiple edges split the middle 50% of the card width (25%–75%) evenly (e.g. n=2 → 37.5% and 62.5%).
 *
 * @param {{ centerX: number, width: number, left?: number }} fromLayout
 * @param {number} outgoingIndex — 0 .. outgoingCount - 1 (after sorting exits by destination x in {@link computeRoutedOrthogonalPaths})
 * @param {number} outgoingCount — number of edges leaving this parent in the visible graph
 */
export function parentEdgeExitX(fromLayout, outgoingIndex, outgoingCount) {
  const w = fromLayout.width
  const left = typeof fromLayout.left === 'number' ? fromLayout.left : fromLayout.centerX - w / 2
  if (outgoingCount <= 1) return fromLayout.centerX
  return left + w * (0.25 + (2 * outgoingIndex + 1) / (4 * outgoingCount))
}

/**
 * X coordinate where an edge meets the top of a child card: same rule as {@link parentEdgeExitX}
 * (center for one incoming edge; multiple edges split the middle 50% of the card width).
 *
 * @param {{ centerX: number, width: number, left?: number }} toLayout
 * @param {number} incomingIndex — 0 .. incomingCount - 1 (after sorting entries by source x in {@link computeRoutedOrthogonalPaths})
 * @param {number} incomingCount — number of edges entering this child in the visible graph
 */
export function childEdgeEntryX(toLayout, incomingIndex, incomingCount) {
  return parentEdgeExitX(toLayout, incomingIndex, incomingCount)
}

/**
 * Map a sibling’s center X into the middle 50% of a card edge (same band as {@link parentEdgeExitX})
 * **proportionally** to [minCenter, maxCenter]. Use when several edges share a node so attachment
 * points follow where neighbors sit horizontally (reduces long diagonal orthogonal legs when dependents
 * are all on one side of a prerequisite, or prerequisites on one side of a dependent).
 *
 * @param {{ centerX: number, width: number, left?: number }} cardLayout
 * @param {number} peerCenterX — center X of the connected node (child when exiting parent, parent when entering child)
 * @param {number} minPeerCenterX
 * @param {number} maxPeerCenterX
 */
export function attachmentXMappedToPeerSpan(
  cardLayout,
  peerCenterX,
  minPeerCenterX,
  maxPeerCenterX
) {
  const w = cardLayout.width
  const left = typeof cardLayout.left === 'number' ? cardLayout.left : cardLayout.centerX - w / 2
  const span = maxPeerCenterX - minPeerCenterX
  const t = span < 1e-9 ? 0.5 : (peerCenterX - minPeerCenterX) / span
  const u = Math.max(0, Math.min(1, t))
  return left + w * (0.25 + u * 0.5)
}

/**
 * Orthogonal polyline in content coordinates: bottom center of `from` to top center of `to`.
 */
export function researchMapEdgePath(fromLayout, toLayout) {
  if (!fromLayout || !toLayout) return ''
  const x1 = fromLayout.centerX
  const y1 = fromLayout.top + fromLayout.height
  const x2 = toLayout.centerX
  const y2 = toLayout.top
  const midY = (y1 + y2) / 2
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`
}

/**
 * Same geometry as `researchMapEdgePath` but with an explicit horizontal-segment Y (staggered lanes)
 * and optional exit X on the parent (defaults to card center).
 *
 * When `midY` equals the child top `y2`, emits a bracket with a horizontal run **below** the child top
 * (then short vertical into the port) so lines do not share one bend on the card edge. Multi-tier skips use
 * {@link researchMapEdgePathRowBoundariesOnly} instead.
 *
 * @param {{ portStubMinPx?: number }} [options]
 */
export function researchMapEdgePathWithMidY(fromLayout, toLayout, midY, options = {}) {
  if (!fromLayout || !toLayout) return ''
  const stubMin = options.portStubMinPx ?? RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX
  const x1 = typeof options.fromX === 'number' ? options.fromX : fromLayout.centerX
  const y1 = fromLayout.top + fromLayout.height
  const x2 = typeof options.toX === 'number' ? options.toX : toLayout.centerX
  const y2 = toLayout.top
  if (Math.abs(midY - y2) < 1e-6) {
    return researchMapEdgePathBracketChildRowOnly(x1, y1, x2, y2, stubMin)
  }
  const g = y2 - y1
  let my = midY
  if (g >= 2 * stubMin) {
    my = Math.min(Math.max(midY, y1 + stubMin), y2 - stubMin)
  }
  return `M ${x1} ${y1} L ${x1} ${my} L ${x2} ${my} L ${x2} ${y2}`
}

/**
 * Gutter path with **horizontal-first** main leg: stub down from parent port, run horizontally toward the
 * child column, then vertical to `midY` and into the port. Use when the vertical-first path would pass
 * through another card (see {@link pickMidYOrthogonalPathAvoidingObstacles}).
 *
 * @param {number} fromX
 * @param {number} toX
 * @param {number} y1 — parent bottom
 * @param {number} y2 — child top
 * @param {number} midY — gutter lane (clamped like {@link researchMapEdgePathWithMidY})
 * @param {{ portStubMinPx?: number }} [options]
 */
export function researchMapEdgePathMidYHorizontalFirst(fromX, toX, y1, y2, midY, options = {}) {
  const stubMin = options.portStubMinPx ?? RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX
  if (Math.abs(midY - y2) < 1e-6) {
    return researchMapEdgePathBracketChildRowOnly(fromX, y1, toX, y2, stubMin)
  }
  const g = y2 - y1
  let my = midY
  if (g >= 2 * stubMin) {
    my = Math.min(Math.max(midY, y1 + stubMin), y2 - stubMin)
  }
  if (g < 2 * stubMin || stubMin <= 0) {
    if (Math.abs(fromX - toX) < 1e-9) {
      return `M ${fromX} ${y1} L ${fromX} ${y2}`
    }
    return `M ${fromX} ${y1} L ${toX} ${y1} L ${toX} ${my} L ${toX} ${y2}`
  }
  const yExit = y1 + stubMin
  return `M ${fromX} ${y1} L ${fromX} ${yExit} L ${toX} ${yExit} L ${toX} ${my} L ${toX} ${y2}`
}

/** @param {object[]} obstacles — from {@link buildObstacleRects} */
function pickMidYOrthogonalPathAvoidingObstacles(fromL, toL, fromX, toX, midY, obstacles, options) {
  const vh = researchMapEdgePathWithMidY(fromL, toL, midY, {
    fromX,
    toX,
    portStubMinPx: options.portStubMinPx
  })
  if (!obstacles?.length) return vh
  const y1 = fromL.top + fromL.height
  const y2 = toL.top
  const hv = researchMapEdgePathMidYHorizontalFirst(fromX, toX, y1, y2, midY, options)
  const vhVerts = verticesFromOrthogonalSvgPath(vh)
  const hvVerts = verticesFromOrthogonalSvgPath(hv)
  const vhHit = polylineIntersectsAnyObstacle(vhVerts, obstacles)
  const hvHit = polylineIntersectsAnyObstacle(hvVerts, obstacles)
  if (!vhHit) return vh
  if (!hvHit) return hv
  return vh
}

/**
 * Child-row-only routing: vertical from parent port, horizontal below child top, vertical into port.
 * @param {number} stubMin
 */
function researchMapEdgePathBracketChildRowOnly(x1, y1, x2, y2, stubMin) {
  const g = y2 - y1
  if (g <= 0) return ''
  if (g < 2 * stubMin || stubMin <= 0) {
    return `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`
  }
  const yExit = y1 + stubMin
  const yRun = y2 - stubMin
  return `M ${x1} ${y1} L ${x1} ${yExit} L ${x1} ${yRun} L ${x2} ${yRun} L ${x2} ${y2}`
}

/**
 * Orthogonal path with bends **only** on the parent row (`y1`) and child row (`y2`): horizontal on the
 * parent from `fromX` toward a spine, vertical through the tier gap (no bend mid-connector), horizontal on
 * the child row to `toX`. Uses a midpoint spine so both rows carry part of the horizontal run (in-game
 * `[` / `]` style without a gutter midpoint).
 *
 * @param {number} fromX
 * @param {number} toX
 * @param {number} y1 — parent bottom (content coords)
 * @param {number} y2 — child top
 * @param {number} [stubMin] — min vertical stub from each port; default {@link RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX}
 */
export function researchMapEdgePathRowBoundariesOnly(
  fromX,
  toX,
  y1,
  y2,
  stubMin = RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX
) {
  const g = y2 - y1
  if (stubMin <= 0 || g < 2 * stubMin) {
    if (Math.abs(fromX - toX) < 1e-9) {
      return `M ${fromX} ${y1} L ${fromX} ${y2}`
    }
    const midX = (fromX + toX) / 2
    return `M ${fromX} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${toX} ${y2}`
  }
  const yP = y1 + stubMin
  const yC = y2 - stubMin
  if (Math.abs(fromX - toX) < 1e-9) {
    return `M ${fromX} ${y1} L ${fromX} ${yP} L ${fromX} ${yC} L ${fromX} ${y2}`
  }
  const midX = (fromX + toX) / 2
  return `M ${fromX} ${y1} L ${fromX} ${yP} L ${midX} ${yP} L ${midX} ${yC} L ${toX} ${yC} L ${toX} ${y2}`
}

/**
 * Routing inputs shared by {@link computeRoutedOrthogonalPaths} and {@link computeDagLinkSvgPaths}
 * (per-edge ports, staggered gutter `midY`, bucket key).
 *
 * @typedef {object} RoutedEdgeItem
 * @property {string} from
 * @property {string} to
 * @property {{ centerX: number, top: number, height: number, width: number, left?: number, rank?: number }} a — parent layout
 * @property {{ centerX: number, top: number, height: number, width: number, left?: number, rank?: number }} b — child layout
 * @property {number} y1 — parent bottom Y (layout space after `offsetY`)
 * @property {number} y2 — child top Y
 * @property {number} baseMid — `(y1+y2)/2` before lane staggering
 * @property {string} bucketKey — `"{rf}-{rt}"` sink ranks
 * @property {number} fromX — exit X on parent card
 * @property {number} toX — entry X on child card
 * @property {number} midY — horizontal gutter lane centerline (adjacent ranks)
 */

/**
 * Shared attachment + gutter-lane prep for {@link computeRoutedOrthogonalPaths} and {@link computeDagLinkSvgPaths}.
 *
 * @param {Array<[string, string]>} edges
 * @param {Map<string, object>} nodeLayouts
 * @param {number} offsetY
 * @param {{ gutterLanePx?: number, gutterLaneMaxPx?: number, gutterMarginPx?: number, portStubMinPx?: number }} [options]
 * @returns {RoutedEdgeItem[]}
 */
export function buildRoutedEdgeItems(edges, nodeLayouts, offsetY, options = {}) {
  const items = []
  for (const [from, to] of edges) {
    const a = nodeLayouts.get(from)
    const b = nodeLayouts.get(to)
    if (!a || !b) continue
    const y1 = a.top + a.height - offsetY
    const y2 = b.top - offsetY
    const baseMid = (y1 + y2) / 2
    const rf = a.rank ?? 0
    const rt = b.rank ?? 0
    const bucketKey = `${rf}-${rt}`
    items.push({ from, to, a, b, y1, y2, baseMid, bucketKey })
  }

  const byFrom = new Map()
  for (const it of items) {
    if (!byFrom.has(it.from)) byFrom.set(it.from, [])
    byFrom.get(it.from).push(it)
  }
  const byTo = new Map()
  for (const it of items) {
    if (!byTo.has(it.to)) byTo.set(it.to, [])
    byTo.get(it.to).push(it)
  }

  /**
   * When peer centers share one column (`max − min` below this), proportional mapping collapses to the
   * card center for every edge — use index-based slots ({@link parentEdgeExitX} / {@link childEdgeEntryX})
   * instead so bundles still fan across the middle 50% (fixes funnel / stacked-prereq visuals).
   */
  const peerCenterColocatedEpsPx = 2

  /**
   * Exit/entry ports sort by sink rank gap first (`rank(from) − rank(to)`), then peer X. When a node has
   * mixed gap tiers, reserve distinct slot connectors across the full set (prevents reusing one connector
   * for multiple edges). With a single gap tier, keep proportional attachment mapping.
   */
  for (const group of byFrom.values()) {
    group.sort((p, q) => {
      const gp = sinkRankGap(p)
      const gq = sinkRankGap(q)
      if (gp !== gq) return gp - gq
      const dx = layoutCenterX(p.b) - layoutCenterX(q.b)
      if (dx !== 0) return dx
      return p.to.localeCompare(q.to)
    })
    const fromL = { ...group[0].a, top: group[0].a.top - offsetY }
    const gapCount = new Set(group.map(sinkRankGap)).size
    if (group.length > 1 && gapCount > 1) {
      // Mixed gap tiers: reserve unique connector slots across all outgoing edges.
      for (let i = 0; i < group.length; i++) {
        group[i].fromX = parentEdgeExitX(fromL, i, group.length)
      }
      continue
    }
    const minCx = Math.min(...group.map(x => layoutCenterX(x.b)))
    const maxCx = Math.max(...group.map(x => layoutCenterX(x.b)))
    const spanCx = maxCx - minCx
    const colocated = group.length > 1 && spanCx < peerCenterColocatedEpsPx
    for (let i = 0; i < group.length; i++) {
      const it = group[i]
      it.fromX = colocated
        ? parentEdgeExitX(fromL, i, group.length)
        : attachmentXMappedToPeerSpan(fromL, layoutCenterX(it.b), minCx, maxCx)
    }
  }
  for (const group of byTo.values()) {
    group.sort((p, q) => {
      const gp = sinkRankGap(p)
      const gq = sinkRankGap(q)
      if (gp !== gq) return gp - gq
      const dx = layoutCenterX(p.a) - layoutCenterX(q.a)
      if (dx !== 0) return dx
      return p.from.localeCompare(q.from)
    })
    const toL = { ...group[0].b, top: group[0].b.top - offsetY }
    const gapCount = new Set(group.map(sinkRankGap)).size
    if (group.length > 1 && gapCount > 1) {
      for (let i = 0; i < group.length; i++) {
        group[i].toX = childEdgeEntryX(toL, i, group.length)
      }
      continue
    }
    const minPx = Math.min(...group.map(x => layoutCenterX(x.a)))
    const maxPx = Math.max(...group.map(x => layoutCenterX(x.a)))
    const spanPx = maxPx - minPx
    const colocated = group.length > 1 && spanPx < peerCenterColocatedEpsPx
    for (let i = 0; i < group.length; i++) {
      const it = group[i]
      it.toX = colocated
        ? childEdgeEntryX(toL, i, group.length)
        : attachmentXMappedToPeerSpan(toL, layoutCenterX(it.a), minPx, maxPx)
    }
  }

  // midY lanes: ascending |fromX - toX| (short horizontal runs / nearly vertical edges first). Smaller
  // span → higher segment in the gutter; larger span (sources far from target in x) → lower segment
  // (closer to the child row), so horizontals nest without crossing when X attachments are ordered.

  const byBucket = new Map()
  for (const it of items) {
    if (!byBucket.has(it.bucketKey)) byBucket.set(it.bucketKey, [])
    byBucket.get(it.bucketKey).push(it)
  }

  for (const group of byBucket.values()) {
    group.sort((p, q) => {
      const hp = Math.abs(p.fromX - p.toX)
      const hq = Math.abs(q.fromX - q.toX)
      const dh = hp - hq
      if (Math.abs(dh) > 1e-9) return dh
      const mp = (p.fromX + p.toX) / 2
      const mq = (q.fromX + q.toX) / 2
      const dm = mp - mq
      if (Math.abs(dm) > 1e-9) return dm
      const dx = p.toX - q.toX
      if (Math.abs(dx) > 1e-9) return dx
      const fx = p.fromX - q.fromX
      if (Math.abs(fx) > 1e-9) return fx
      return p.from !== q.from ? p.from.localeCompare(q.from) : p.to.localeCompare(q.to)
    })
    const n = group.length
    const gutterH = Math.min(...group.map(it => it.y2 - it.y1))
    const lanePx = computeGutterLaneSpacingPx(gutterH, n, options)
    const stubMin = options.portStubMinPx ?? RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX
    for (let i = 0; i < n; i++) {
      const it = group[i]
      const lane = n === 1 ? 0 : i - (n - 1) / 2
      it.midY = it.baseMid + lane * lanePx
      const g = it.y2 - it.y1
      if (stubMin > 0 && g >= 2 * stubMin) {
        it.midY = Math.min(Math.max(it.midY, it.y1 + stubMin), it.y2 - stubMin)
      } else if (g > 0 && g < 2 * stubMin) {
        it.midY = it.y1 + g / 2
      }
    }
  }

  return items
}

/**
 * Build SVG path `d` strings from d3-dag {@link GraphLink#points} (after {@link tweakShape}). The first/last
 * dag points are exit/entry on card edges; we **replace** those with manual ports from
 * {@link buildRoutedEdgeItems} (`fromX` / `toX` / `y1` / `y2`, sibling-aware like before).
 *
 * **Axes:** Staggered gutter **`midY`** values (from {@link buildRoutedEdgeItems}) are the **Y** axis for the
 * horizontal part of the route — that spacing is what separates parallel edges in a bucket. From
 * `link.points` we use **`pts.slice(1, -1)` for X only** (layout-space after `dagBBox`). Interior **Y** from
 * d3 is ignored: the spine runs at this edge’s `midY`, and vertical segments connect parent/child ports to
 * that lane, so regardless of how high or low d3 placed interior points, the adjusted path still meets the
 * gutter line and then the child port in order.
 *
 * The polyline is **orthogonalized** (vertical-then-horizontal elbows only). Falls back to manual paths when
 * `link.points` is missing.
 *
 * @param {object} dag — laid-out graph from {@link graphConnect} + {@link sugiyama} with `tweakShape`
 * @param {Array<[string, string]>} edges
 * @param {Map<string, object>} nodeLayouts
 * @param {number} offsetY
 * @param {{ minLX: number, minTY: number, pad: number }} dagBBox
 * @param {Map<string, number>} _rankOf — reserved (API parity with callers that pass layout ranks)
 * @param {number} _maxRank
 * @param {{ gutterLanePx?: number, gutterLaneMaxPx?: number, gutterMarginPx?: number, portStubMinPx?: number, obstacleMarginPx?: number }} [options] —
 *   `obstacleMarginPx` inflates other cards when testing whether an edge segment passes through them.
 */
export function computeDagLinkSvgPaths(
  dag,
  edges,
  nodeLayouts,
  offsetY,
  dagBBox,
  _rankOf,
  _maxRank,
  options = {}
) {
  const stubMin = options.portStubMinPx ?? RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX
  const obstacleMargin = options.obstacleMarginPx ?? 0
  const items = buildRoutedEdgeItems(edges, nodeLayouts, offsetY, options)
  const byKey = new Map(items.map(it => [`${it.from}\0${it.to}`, it]))
  const { minLX, pad } = dagBBox
  const out = []

  for (const [from, to] of edges) {
    const it = byKey.get(`${from}\0${to}`)
    if (!it) continue
    const obstacles = buildObstacleRects(nodeLayouts, offsetY, from, to, obstacleMargin)
    const rankGap = (it.a.rank ?? 0) - (it.b.rank ?? 0)
    const y1 = it.y1
    const y2 = it.y2
    const fromL = { ...it.a, top: it.a.top - offsetY }
    const toL = { ...it.b, top: it.b.top - offsetY }

    let link = null
    for (const l of dag.links()) {
      if (String(l.source.data) === from && String(l.target.data) === to) {
        link = l
        break
      }
    }

    if (!link?.points?.length) {
      const path =
        rankGap > 1
          ? researchMapEdgePathRowBoundariesOnly(it.fromX, it.toX, y1, y2, stubMin)
          : pickMidYOrthogonalPathAvoidingObstacles(
              fromL,
              toL,
              it.fromX,
              it.toX,
              it.midY,
              obstacles,
              options
            )
      out.push({ from, to, path })
      continue
    }

    const pts = link.points

    /** `midY` = gutter Y; `slice(1,-1)` → X waypoints only (see {@link computeDagLinkSvgPaths} doc). */
    if (Math.abs(it.midY - y2) < 1e-6) {
      const path = pickMidYOrthogonalPathAvoidingObstacles(
        fromL,
        toL,
        it.fromX,
        it.toX,
        y2,
        obstacles,
        options
      )
      out.push({ from, to, path })
      continue
    }
    const innerLx = pts.length > 2 ? pts.slice(1, -1).map(p => p[0] - minLX + pad) : []
    const xs = collapseXsMonotonicInGutter(it.fromX, it.toX, innerLx)
    let vertices = [
      [it.fromX, y1],
      [xs[0], it.midY]
    ]
    for (let i = 1; i < xs.length; i++) {
      vertices.push([xs[i], it.midY])
    }
    vertices.push([it.toX, y2])
    vertices = dedupeConsecutiveVertices(vertices, 1e-3)
    const orthogonal = buildOrthogonalPolylineThroughVertices(vertices)
    let pathStr = pointsToSvgPath(orthogonal)
    if (polylineIntersectsAnyObstacle(orthogonal, obstacles)) {
      const hvPath = researchMapEdgePathMidYHorizontalFirst(
        it.fromX,
        it.toX,
        y1,
        y2,
        it.midY,
        options
      )
      const hvVerts = verticesFromOrthogonalSvgPath(hvPath)
      if (!polylineIntersectsAnyObstacle(hvVerts, obstacles)) {
        pathStr = hvPath
      }
    }
    out.push({ from, to, path: pathStr })
  }

  return out
}

/**
 * Walks `vertices` in order; between each consecutive pair that is not already axis-aligned, inserts one
 * corner so moves are **vertical-then-horizontal** only (no diagonal segments).
 *
 * @param {[number, number][]} vertices
 * @returns {[number, number][]}
 */
export function buildOrthogonalPolylineThroughVertices(vertices) {
  if (vertices.length === 0) return []
  const out = [[vertices[0][0], vertices[0][1]]]
  for (let i = 1; i < vertices.length; i++) {
    appendOrthogonalVerticalThenHorizontal(out, vertices[i])
  }
  return dedupeConsecutiveVertices(out, 1e-3)
}

/**
 * @param {[number, number][]} out — mutated; last point is the start of the step
 * @param {[number, number]} q — target
 */
function appendOrthogonalVerticalThenHorizontal(out, q) {
  const eps = 1e-6
  const p = out[out.length - 1]
  const [x1, y1] = p
  const [x2, y2] = q
  if (Math.hypot(x2 - x1, y2 - y1) < eps) return
  if (Math.abs(x1 - x2) < eps) {
    out.push([x2, y2])
    return
  }
  if (Math.abs(y1 - y2) < eps) {
    out.push([x2, y2])
    return
  }
  const corner = [x1, y2]
  if (Math.hypot(corner[0] - x1, corner[1] - y1) > eps) {
    out.push(corner)
  }
  out.push([x2, y2])
}

function dedupeConsecutiveVertices(vertices, eps = 1e-2) {
  const out = []
  for (const v of vertices) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(v[0] - last[0], v[1] - last[1]) > eps) {
      out.push([v[0], v[1]])
    }
  }
  return out
}

/** Dedupe consecutive scalars (e.g. horizontal waypoint Xs) within `eps`. */
function dedupeConsecutiveScalars(xs, eps = 1e-3) {
  const out = []
  for (const x of xs) {
    const last = out[out.length - 1]
    if (last === undefined || Math.abs(x - last) > eps) out.push(x)
  }
  return out
}

/**
 * d3 {@link GraphLink#points} interiors can zigzag in X. We draw the whole gutter at one `midY`, so those
 * waypoints become collinear horizontals — non-monotonic order retraces (right then left), overlapping the
 * same segment. Keep only X between `min(fromX,toX)` and `max(fromX,toX)`, sorted monotonically from exit to
 * entry port.
 *
 * @param {number} fromX
 * @param {number} toX
 * @param {number[]} innerLx — layout-space X from `pts.slice(1, -1)` (dag bbox already applied)
 */
function collapseXsMonotonicInGutter(fromX, toX, innerLx, eps = 1e-3) {
  const lo = Math.min(fromX, toX)
  const hi = Math.max(fromX, toX)
  const merged = dedupeConsecutiveScalars([fromX, ...innerLx, toX], eps)
  const clipped = merged.filter(x => x >= lo - eps && x <= hi + eps)
  const sortedAsc = [...clipped].sort((a, b) => a - b)
  const deduped = dedupeConsecutiveScalars(sortedAsc, eps)
  return toX < fromX ? [...deduped].reverse() : deduped
}

function pointsToSvgPath(pts) {
  if (pts.length === 0) return ''
  const [x0, y0] = pts[0]
  let d = `M ${x0} ${y0}`
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0]} ${pts[i][1]}`
  }
  return d
}

/**
 * Builds orthogonal edge polylines with staggered horizontal segments in each inter-tier gutter so edges
 * that run parallel (same direction) do not sit on top of each other. Exit/entry X use destination/source
 * center ordering. Attachment X uses {@link attachmentXMappedToPeerSpan} from each node’s siblings so
 * ports track peer centers (not just equal subdivision). Gutter lanes (midY) sort by ascending
 * `|fromX - toX|` so nearly straight edges sit higher in the gutter and long horizontal runs sit lower
 * (closer to the child row), nesting without crossings when X attachments are ordered. If the edge skips one
 * or more tiers (sink rank gap greater than 1), routing uses {@link researchMapEdgePathRowBoundariesOnly}:
 * bends only on the parent and child rows, with a straight vertical through the gap (no bend mid-connector).
 *
 * When the layout graph is available, {@link computeDagLinkSvgPaths} uses {@link GraphLink#points} for
 * interior **X** waypoints and staggered gutter `midY` from {@link buildRoutedEdgeItems}; use this for
 * fallbacks or when `link.points` is empty.
 *
 * @param {Array<[string,string]>} edges
 * @param {Map<string, { centerX: number, top: number, height: number, rank?: number }>} nodeLayouts
 * @param {number} offsetY — vertical shift for visible slice (same as modal `layoutView.offsetY`)
 * @param {{ gutterLanePx?: number, gutterLaneMaxPx?: number, gutterMarginPx?: number, portStubMinPx?: number, obstacleMarginPx?: number }} [options] —
 *   preferred lane step, max step when expanding, and inset from row lines (see {@link computeGutterLaneSpacingPx});
 *   {@link RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX} controls minimum vertical stub from each port;
 *   `obstacleMarginPx` inflates other cards when avoiding edge–node overlaps.
 * @returns {{ path: string, from: string, to: string }[]}
 */
export function computeRoutedOrthogonalPaths(edges, nodeLayouts, offsetY, options = {}) {
  const stubMin = options.portStubMinPx ?? RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX
  const obstacleMargin = options.obstacleMarginPx ?? 0
  const items = buildRoutedEdgeItems(edges, nodeLayouts, offsetY, options)
  return items.map(it => {
    const fromL = { ...it.a, top: it.a.top - offsetY }
    const toL = { ...it.b, top: it.b.top - offsetY }
    const rankGap = (it.a.rank ?? 0) - (it.b.rank ?? 0)
    const y1 = it.y1
    const y2 = it.y2
    const obstacles = buildObstacleRects(nodeLayouts, offsetY, it.from, it.to, obstacleMargin)
    const path =
      rankGap > 1
        ? researchMapEdgePathRowBoundariesOnly(it.fromX, it.toX, y1, y2, stubMin)
        : pickMidYOrthogonalPathAvoidingObstacles(
            fromL,
            toL,
            it.fromX,
            it.toX,
            it.midY,
            obstacles,
            options
          )
    return {
      from: it.from,
      to: it.to,
      path
    }
  })
}
