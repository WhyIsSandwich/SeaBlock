/**
 * Parse SVG path `d` strings from {@link researchMapLayout} (only `M` / `L`, orthogonal edges).
 *
 * @param {string} d
 * @returns {[number, number][]}
 */
export function verticesFromOrthogonalSvgPath(d) {
  if (!d || typeof d !== 'string') return []
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
  const out = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push([nums[i], nums[i + 1]])
  }
  return out
}
