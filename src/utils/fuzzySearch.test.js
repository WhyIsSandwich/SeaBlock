import { describe, expect, it } from 'vitest'

import { fuzzyMatchQuery, levenshtein } from './fuzzySearch.js'

describe('levenshtein', () => {
  it('returns 0 for equal strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0)
  })

  it('measures single edits', () => {
    expect(levenshtein('abc', 'abx')).toBe(1)
    expect(levenshtein('a', '')).toBe(1)
  })
})

describe('fuzzyMatchQuery', () => {
  it('matches substring', () => {
    expect(fuzzyMatchQuery('plate', 'iron-plate')).toBe(true)
  })

  it('allows small typos on longer tokens', () => {
    expect(fuzzyMatchQuery('ion', 'iron')).toBe(true)
  })
})
