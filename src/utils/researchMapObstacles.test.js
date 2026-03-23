import { describe, expect, it } from 'vitest'

import { axisSegmentIntersectsRect, buildObstacleRects, polylineIntersectsAnyObstacle } from './researchMapObstacles.js'

describe('researchMapObstacles', () => {
  it('buildObstacleRects excludes edge endpoints', () => {
    const nodeLayouts = new Map([
      ['a', { left: 0, top: 0, width: 10, height: 10 }],
      ['b', { left: 50, top: 0, width: 10, height: 10 }]
    ])
    const r = buildObstacleRects(nodeLayouts, 0, 'a', 'b', 0)
    expect(r).toHaveLength(0)
  })

  it('axisSegmentIntersectsRect detects vertical through rect interior', () => {
    const rect = { left: 40, top: 40, right: 60, bottom: 80 }
    expect(axisSegmentIntersectsRect(50, 0, 50, 100, rect)).toBe(true)
    expect(axisSegmentIntersectsRect(50, 0, 50, 30, rect)).toBe(false)
  })

  it('axisSegmentIntersectsRect detects horizontal through rect interior', () => {
    const rect = { left: 40, top: 50, right: 80, bottom: 70 }
    expect(axisSegmentIntersectsRect(0, 60, 100, 60, rect)).toBe(true)
    expect(axisSegmentIntersectsRect(0, 30, 100, 30, rect)).toBe(false)
  })

  it('polylineIntersectsAnyObstacle is false for path above obstacles', () => {
    const obstacles = [{ id: 'x', left: 0, top: 100, right: 50, bottom: 150 }]
    const verts = [
      [10, 10],
      [10, 40],
      [40, 40]
    ]
    expect(polylineIntersectsAnyObstacle(verts, obstacles)).toBe(false)
  })
})
