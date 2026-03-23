/**
 * Lightweight fuzzy matching for Factoriopedia recipe search (display name + internal id).
 */

export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const v0 = new Array(b.length + 1)
  const v1 = new Array(b.length + 1)
  for (let i = 0; i <= b.length; i++) v0[i] = i
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j]
  }
  return v1[b.length]
}

/**
 * @param {string} query
 * @param {string} haystack lowercased candidate text
 * @returns {boolean}
 */
export function fuzzyMatchQuery(query, haystack) {
  if (!query || !haystack) return false
  const q = query.trim().toLowerCase()
  const h = haystack.toLowerCase()
  if (h.includes(q)) return true
  if (q.length < 2) return false
  const maxDist = q.length <= 4 ? 1 : 2
  if (q.length > 24) return levenshtein(q, h.slice(0, 32)) <= maxDist
  return levenshtein(q, h) <= maxDist
}
