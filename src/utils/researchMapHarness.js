/**
 * Test harness for the Factoriopedia research map: run the same layout + routing pipeline as
 * `FactoriopediaTechTreeModal.vue` and expose **vertices** (parsed from SVG `path d`) for regression tests
 * and snapshots.
 *
 * To capture a real technology closure from processed data (e.g. for `sct-lab-t3`):
 *
 *   node scripts/extract-research-map-fixture.js path/to/data.json sct-lab-t3
 *
 * That writes `src/utils/__fixtures__/research-map-sct-lab-t3.json`. Commit it to lock routing regressions in CI.
 */

import {
  buildRoutedEdgeItems,
  computeDagLinkSvgPaths,
  computeResearchMapLayout,
  computeRoutedOrthogonalPaths
} from './researchMapLayout.js'
import { verticesFromOrthogonalSvgPath } from './researchMapPathParse.js'

export { verticesFromOrthogonalSvgPath } from './researchMapPathParse.js'

function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * Same edge routing as the tech tree modal: {@link computeDagLinkSvgPaths} when `dag` + `dagBBox` exist,
 * otherwise {@link computeRoutedOrthogonalPaths}.
 *
 * @param {Record<string, object>} technologies — full or closure-only `technology` table
 * @param {string} targetName — goal technology id
 * @param {object} [options]
 * @param {object} [options.routing] — passed to both routing functions (gutter lanes, port stubs, etc.)
 * @returns {{
 *   ok: true,
 *   target: string,
 *   nodeCount: number,
 *   edgeCount: number,
 *   maxRank: number,
 *   contentWidth: number,
 *   contentHeight: number,
 *   offsetY: number,
 *   usesDag: boolean,
 *   edges: {
 *     from: string,
 *     to: string,
 *     path: string,
 *     vertices: [number, number][],
 *     vertexCount: number,
 *     meta: {
 *       y1: number,
 *       y2: number,
 *       fromX: number,
 *       toX: number,
 *       midY: number,
 *       rankGap: number,
 *       rf: number,
 *       rt: number,
 *       bucketKey: string
 *     }
 *   }[]
 * } | { ok: false, target: string, reason: string }}
 */
export function computeResearchMapEdgeSnapshot(technologies, targetName, options = {}) {
  const routing = options.routing ?? {}
  const layout = computeResearchMapLayout(technologies, targetName)
  if (!layout) {
    return { ok: false, target: targetName, reason: 'computeResearchMapLayout returned null' }
  }

  let minTop = Infinity
  for (const name of layout.nodes) {
    const nl = layout.nodeLayouts.get(name)
    if (nl) minTop = Math.min(minTop, nl.top)
  }
  const offsetY = Number.isFinite(minTop) ? minTop : 0

  const edges = []
  for (const [from, to] of layout.edges) {
    if (layout.nodes.has(from) && layout.nodes.has(to)) edges.push([from, to])
  }

  let paths
  const usesDag = Boolean(layout.dag && layout.dagBBox)
  if (usesDag) {
    paths = computeDagLinkSvgPaths(
      layout.dag,
      edges,
      layout.nodeLayouts,
      offsetY,
      layout.dagBBox,
      layout.rankOf,
      layout.maxRank,
      routing
    )
  } else {
    paths = computeRoutedOrthogonalPaths(edges, layout.nodeLayouts, offsetY, routing)
  }

  const routedItems = buildRoutedEdgeItems(edges, layout.nodeLayouts, offsetY, routing)
  const metaByKey = new Map(
    routedItems.map(it => {
      const rf = it.a.rank ?? 0
      const rt = it.b.rank ?? 0
      const meta = {
        y1: round2(it.y1),
        y2: round2(it.y2),
        fromX: round2(it.fromX),
        toX: round2(it.toX),
        midY: round2(it.midY),
        rankGap: rf - rt,
        rf,
        rt,
        bucketKey: it.bucketKey
      }
      return [`${it.from}\0${it.to}`, meta]
    })
  )

  const enriched = paths.map(p => {
    const vertices = verticesFromOrthogonalSvgPath(p.path).map(([x, y]) => [round2(x), round2(y)])
    const meta = metaByKey.get(`${p.from}\0${p.to}`)
    if (!meta) {
      throw new Error(`Missing routing meta for edge ${p.from} → ${p.to}`)
    }
    return {
      from: p.from,
      to: p.to,
      path: p.path,
      vertices,
      vertexCount: vertices.length,
      meta
    }
  })

  return {
    ok: true,
    target: targetName,
    nodeCount: layout.nodes.size,
    edgeCount: edges.length,
    maxRank: layout.maxRank,
    contentWidth: round2(layout.contentWidth),
    contentHeight: round2(layout.contentHeight),
    offsetY: round2(offsetY),
    usesDag,
    edges: enriched
  }
}
