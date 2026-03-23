/**
 * Axis-aligned obstacle checks for research-map edges vs card rectangles (layout space).
 */

const DEFAULT_EPS = 1e-3

/**
 * @typedef {{ id: string, left: number, top: number, right: number, bottom: number }} ObstacleRect
 */

/**
 * @param {Map<string, { left: number, top: number, width: number, height: number }>} nodeLayouts
 * @param {number} offsetY — same as routing ({@link computeDagLinkSvgPaths} / modal)
 * @param {string} excludeFrom
 * @param {string} excludeTo
 * @param {number} [marginPx] — inflate rects (e.g. stroke half-width) for clearance
 * @returns {ObstacleRect[]}
 */
export function buildObstacleRects(
  nodeLayouts,
  offsetY,
  excludeFrom,
  excludeTo,
  marginPx = 0
) {
  const m = marginPx
  const out = []
  for (const [id, layout] of nodeLayouts) {
    if (id === excludeFrom || id === excludeTo) continue
    const top = layout.top - offsetY
    const left = layout.left - m
    const right = layout.left + layout.width + m
    const bottom = top + layout.height + m
    out.push({
      id,
      left,
      top: top - m,
      right,
      bottom
    })
  }
  return out
}

/**
 * Axis-aligned segment only (orthogonal polylines).
 *
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {ObstacleRect} r
 * @param {number} [eps]
 * @returns {boolean}
 */
export function axisSegmentIntersectsRect(x1, y1, x2, y2, r, eps = DEFAULT_EPS) {
  const { left: L, top: T, right: R, bottom: B } = r
  if (Math.abs(y1 - y2) < eps) {
    const y = y1
    const xa = Math.min(x1, x2)
    const xb = Math.max(x1, x2)
    if (y < T - eps || y > B + eps) return false
    return xa < R - eps && xb > L + eps
  }
  if (Math.abs(x1 - x2) < eps) {
    const x = x1
    const ya = Math.min(y1, y2)
    const yb = Math.max(y1, y2)
    if (x < L - eps || x > R + eps) return false
    return ya < B - eps && yb > T + eps
  }
  return false
}

/**
 * @param {[number, number][]} vertices
 * @param {ObstacleRect[]} obstacles
 * @param {number} [eps]
 * @returns {boolean}
 */
export function polylineIntersectsAnyObstacle(vertices, obstacles, eps = DEFAULT_EPS) {
  if (vertices.length < 2 || obstacles.length === 0) return false
  for (let i = 0; i < vertices.length - 1; i++) {
    const [x1, y1] = vertices[i]
    const [x2, y2] = vertices[i + 1]
    for (const o of obstacles) {
      if (axisSegmentIntersectsRect(x1, y1, x2, y2, o, eps)) return true
    }
  }
  return false
}
