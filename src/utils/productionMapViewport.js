/**
 * Clamp vertical pan after a production-map layout reflow so the graph top does not drift
 * downward (spine row stays near the viewport top) while keeping the clicked card in view.
 * @param {object} p
 * @param {number} p.tyAlign translate Y after cursor-stable align (layer space, matches d3-zoom)
 * @param {number} p.k scale
 * @param {number} p.minContentY minimum top Y among visible cards (display / layer content space)
 * @param {{ y: number, height: number } | null} p.clickedCard display rect of the clicked node
 * @param {number} p.viewportTop getBoundingClientRect().top
 * @param {number} p.viewportHeight getBoundingClientRect().height
 * @param {number} [p.topMargin=10] desired gap from viewport top to graph top (client px)
 * @param {number} [p.bottomMargin=10] keep clicked card bottom above this inset from viewport bottom
 * @returns {number} clamped ty (use with same tx, k)
 */
export function clampProductionMapTranslateY({
  tyAlign,
  k,
  minContentY,
  clickedCard,
  viewportTop,
  viewportHeight,
  topMargin = 10,
  bottomMargin = 10
}) {
  if (!Number.isFinite(tyAlign) || !Number.isFinite(k) || k === 0) return tyAlign
  if (!Number.isFinite(minContentY)) return tyAlign

  const tyMaxTop = topMargin - k * minContentY

  let tyMaxBottom = Infinity
  if (
    clickedCard &&
    Number.isFinite(clickedCard.y) &&
    Number.isFinite(clickedCard.height) &&
    Number.isFinite(viewportTop) &&
    Number.isFinite(viewportHeight)
  ) {
    const vpBottom = viewportTop + viewportHeight
    tyMaxBottom = vpBottom - bottomMargin - viewportTop - k * (clickedCard.y + clickedCard.height)
  }

  return Math.min(tyAlign, tyMaxTop, tyMaxBottom)
}

/**
 * Pan translate for the production map after a spine change: **horizontally** center the viewport on
 * the **spine terminal** (deepest selected node), and **vertically** align the graph top to a small
 * margin (not vertically centered). Optionally tightens `ty` so the terminal’s bottom stays above
 * the viewport bottom. Matches d3-zoom: viewport-local `(lx, ly)` → `(tx + k*lx, ty + k*ly)`.
 *
 * @param {object} p
 * @param {string} p.terminalId spine leaf instance id (e.g. `__pm_root__` when only focus)
 * @param {(id: string) => { x: number, y: number, width: number, height: number } | undefined} p.getPosition
 * @param {number} p.minContentY minimum `y` among all visible cards (display space)
 * @param {number} p.viewportWidth
 * @param {number} p.viewportHeight
 * @param {number} p.viewportTop `getBoundingClientRect().top` (for bottom fit)
 * @param {number} p.k
 * @param {number} [p.topMargin=10]
 * @param {number} [p.bottomMargin=10]
 * @returns {{ tx: number, ty: number } | null}
 */
export function computeTranslateForSpineTerminal({
  terminalId,
  getPosition,
  minContentY,
  viewportWidth,
  viewportHeight,
  viewportTop,
  k,
  topMargin = 10,
  bottomMargin = 10
}) {
  if (!terminalId || !Number.isFinite(k) || k === 0) return null
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight)) return null
  if (!Number.isFinite(minContentY)) return null

  const p = getPosition(terminalId)
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
  const w = p.width ?? 0
  const h = p.height ?? 0

  const centerX = p.x + w / 2
  const tx = viewportWidth / 2 - k * centerX

  const tyTop = topMargin - k * minContentY
  let ty = tyTop
  if (Number.isFinite(viewportTop) && Number.isFinite(h)) {
    const vpBottom = viewportTop + viewportHeight
    const tyMaxBottom = vpBottom - bottomMargin - viewportTop - k * (p.y + h)
    ty = Math.min(tyTop, tyMaxBottom)
  }

  return { tx, ty }
}
