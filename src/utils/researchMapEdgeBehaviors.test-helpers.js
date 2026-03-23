/**
 * Pure checks for research-map edge geometry (used by {@link researchMapBehaviors.test.js}).
 * Inputs are parsed `vertices` from SVG paths and optional `meta` from {@link buildRoutedEdgeItems}.
 */

import { RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX } from './researchMapLayout.js'

const DEFAULT_EPS = 1e-2

/**
 * @param {[number, number][]} vertices
 * @param {number} [eps]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkSegmentsOrthogonal(vertices, eps = DEFAULT_EPS) {
  for (let i = 0; i < vertices.length - 1; i++) {
    const [x1, y1] = vertices[i]
    const [x2, y2] = vertices[i + 1]
    const dx = Math.abs(x2 - x1)
    const dy = Math.abs(y2 - y1)
    if (dx > eps && dy > eps) {
      return { ok: false, reason: `segment ${i} is diagonal (${x1},${y1})→(${x2},${y2})` }
    }
  }
  return { ok: true }
}

/**
 * @param {[number, number][]} vertices
 * @param {number} [eps]
 */
export function checkNoDegenerateSegments(vertices, eps = DEFAULT_EPS) {
  for (let i = 0; i < vertices.length - 1; i++) {
    const [x1, y1] = vertices[i]
    const [x2, y2] = vertices[i + 1]
    if (Math.hypot(x2 - x1, y2 - y1) < eps) {
      return { ok: false, reason: `zero-length segment at ${i}` }
    }
  }
  return { ok: true }
}

/**
 * Detects horizontal **retracing** on one Y (e.g. go right along the gutter, then left on the same line), which
 * overlays two opposite-direction segments — common when non-monotonic d3 X waypoints are drawn at a single
 * gutter `midY`.
 *
 * @param {[number, number][]} vertices
 * @param {number} [eps]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkNoHorizontalBacktrackSameY(vertices, eps = DEFAULT_EPS) {
  let i = 0
  while (i < vertices.length) {
    let j = i + 1
    while (j < vertices.length && Math.abs(vertices[j][1] - vertices[i][1]) < eps) {
      j++
    }
    const run = vertices.slice(i, j)
    if (run.length >= 3) {
      const xs = run.map(v => v[0])
      let pos = false
      let neg = false
      for (let k = 0; k < xs.length - 1; k++) {
        const d = xs[k + 1] - xs[k]
        if (d > eps) pos = true
        if (d < -eps) neg = true
      }
      if (pos && neg) {
        return {
          ok: false,
          reason: `horizontal backtrack at y≈${vertices[i][1]} (right then left on same line)`
        }
      }
    }
    i = j
  }
  return { ok: true }
}

/**
 * First vertex on parent port; when gutter fits stubs, first vertical run along `fromX` is at least `stubMin`.
 *
 * @param {[number, number][]} vertices
 * @param {{ fromX: number, y1: number, y2: number }} meta
 * @param {{ portStubMinPx?: number }} [options]
 */
export function checkPortExitStub(vertices, meta, options = {}) {
  const stubMin = options.portStubMinPx ?? RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX
  const eps = DEFAULT_EPS
  const { fromX, y1, y2 } = meta
  const g = y2 - y1
  if (g < 2 * stubMin) return { ok: true }

  if (vertices.length < 2) {
    return { ok: false, reason: 'need at least two vertices for stub check' }
  }

  const v0 = vertices[0]
  if (Math.abs(v0[0] - fromX) > eps || Math.abs(v0[1] - y1) > eps) {
    return { ok: false, reason: `start (${v0[0]},${v0[1]}) not at port (${fromX},${y1})` }
  }

  const v1 = vertices[1]
  if (Math.abs(v1[0] - fromX) > eps) {
    return { ok: false, reason: 'second vertex leaves parent column before vertical stub' }
  }
  const verticalRun = Math.abs(v1[1] - y1)
  if (verticalRun < stubMin - eps) {
    return { ok: false, reason: `exit vertical run ${verticalRun} < stubMin ${stubMin}` }
  }
  return { ok: true }
}

/**
 * Last vertex on child port; avoids a long horizontal **on** `y2` immediately before the port when stubs apply.
 *
 * @param {[number, number][]} vertices
 * @param {{ toX: number, y1: number, y2: number }} meta
 * @param {{ portStubMinPx?: number }} [options]
 */
export function checkPortEntryStub(vertices, meta, options = {}) {
  const stubMin = options.portStubMinPx ?? RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX
  const eps = DEFAULT_EPS
  const { toX, y1, y2 } = meta
  const g = y2 - y1
  if (g < 2 * stubMin) return { ok: true }

  if (vertices.length < 2) {
    return { ok: false, reason: 'need at least two vertices for entry stub' }
  }

  const last = vertices[vertices.length - 1]
  if (Math.abs(last[0] - toX) > eps || Math.abs(last[1] - y2) > eps) {
    return { ok: false, reason: `end (${last[0]},${last[1]}) not at child port (${toX},${y2})` }
  }

  const prev = vertices[vertices.length - 2]
  if (Math.abs(prev[1] - y2) < eps && Math.abs(prev[0] - toX) > eps) {
    return {
      ok: false,
      reason: 'horizontal segment on child top y2 before entering port (no entry stub clearance)'
    }
  }

  if (Math.abs(prev[0] - toX) < eps) {
    const vert = Math.abs(y2 - prev[1])
    if (vert < stubMin - eps && vert > eps) {
      return { ok: false, reason: `short final vertical ${vert} < ${stubMin}` }
    }
  }

  return { ok: true }
}

/**
 * Within one `(rf,rt)` bucket, parallel adjacent-rank edges should not share the same gutter `midY`.
 *
 * @param {Array<{ meta: { midY: number, bucketKey: string, rankGap: number } }>} edgesInBucket
 */
export function checkGutterMidYSpread(edgesInBucket) {
  const adj = edgesInBucket.filter(e => e.meta.rankGap <= 1)
  if (adj.length <= 1) return { ok: true }

  const midYs = adj.map(e => e.meta.midY)
  const sorted = [...midYs].sort((a, b) => a - b)
  let minGap = Infinity
  for (let i = 1; i < sorted.length; i++) {
    minGap = Math.min(minGap, sorted[i] - sorted[i - 1])
  }
  const unique = new Set(midYs.map(m => Math.round(m * 100) / 100))
  if (unique.size < adj.length && minGap < 0.5) {
    return {
      ok: false,
      reason: `expected distinct midY lanes in bucket, got ${[...unique].join(', ')}`
    }
  }
  return { ok: true }
}

/**
 * When several incoming edges share colocated parent centers, child entry X should fan (not all equal).
 *
 * @param {number[]} toXValues — `meta.toX` for edges into the same child
 * @param {{ colocated: boolean }} situation
 * @param {number} [eps]
 */
export function checkColocatedEntrySpread(toXValues, situation, eps = DEFAULT_EPS) {
  if (!situation.colocated || toXValues.length <= 1) return { ok: true }

  const u = new Set(toXValues.map(x => Math.round(x / eps) * eps))
  if (u.size < toXValues.length) {
    return { ok: false, reason: 'colocated parents but child entry X did not fan' }
  }
  return { ok: true }
}

/**
 * @param {{ vertices: [number, number][], meta: object }[]} snapEdges
 */
export function assertAllOrthogonal(snapEdges) {
  for (const e of snapEdges) {
    const r = checkSegmentsOrthogonal(e.vertices)
    if (!r.ok) throw new Error(`${e.from}→${e.to}: ${r.reason}`)
    const d = checkNoDegenerateSegments(e.vertices)
    if (!d.ok) throw new Error(`${e.from}→${e.to}: ${d.reason}`)
  }
}

/** @throws {Error} if any segment is not axis-aligned */
export function assertSegmentsOrthogonal(vertices, eps = DEFAULT_EPS) {
  const r = checkSegmentsOrthogonal(vertices, eps)
  if (!r.ok) throw new Error(r.reason)
}

/** @throws {Error} if consecutive duplicate vertices */
export function assertNoDegenerateSegments(vertices, eps = DEFAULT_EPS) {
  const r = checkNoDegenerateSegments(vertices, eps)
  if (!r.ok) throw new Error(r.reason)
}

/** @throws {Error} if any run along one Y reverses horizontal direction (self-overlap) */
export function assertNoHorizontalBacktrackSameY(vertices, eps = DEFAULT_EPS) {
  const r = checkNoHorizontalBacktrackSameY(vertices, eps)
  if (!r.ok) throw new Error(r.reason)
}

/** @throws {Error} if exit stub rules fail */
export function assertPortExitStub(vertices, meta, options = {}) {
  const r = checkPortExitStub(vertices, meta, options)
  if (!r.ok) throw new Error(r.reason)
}

/** @throws {Error} if entry stub rules fail */
export function assertPortEntryStub(vertices, meta, options = {}) {
  const r = checkPortEntryStub(vertices, meta, options)
  if (!r.ok) throw new Error(r.reason)
}

/** Plan name: gutter lane midY separation for parallel adjacent-rank edges in one bucket. */
export function assertGutterHorizontalSeparation(edgesInBucket) {
  const r = checkGutterMidYSpread(edgesInBucket)
  if (!r.ok) throw new Error(r.reason)
}

/**
 * Plan name: child top entry X fans when parent centers are colocated.
 * @param {number[]} toXValues
 * @param {{ colocated: boolean }} situation
 */
export function assertAttachmentSpreadOnChild(toXValues, situation, eps = DEFAULT_EPS) {
  const r = checkColocatedEntrySpread(toXValues, situation, eps)
  if (!r.ok) throw new Error(r.reason)
}
