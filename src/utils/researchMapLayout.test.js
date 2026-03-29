import { describe, expect, it } from 'vitest'

import { checkNoHorizontalBacktrackSameY } from './researchMapEdgeBehaviors.test-helpers.js'
import { buildObstacleRects, polylineIntersectsAnyObstacle } from './researchMapObstacles.js'
import { verticesFromOrthogonalSvgPath } from './researchMapPathParse.js'
import {
  abstractCompactMinGapForRank,
  assignAbstractCenterX,
  attachmentXMappedToPeerSpan,
  buildOrthogonalPolylineThroughVertices,
  buildRoutedEdgeItems,
  childrenTowardSink,
  collectDescendantsTowardSink,
  collectVisiblePrerequisiteClosure,
  compactLayerCenters,
  computeGutterLaneSpacingPx,
  computeDagLinkSvgPaths,
  collectResearchMapLayerInstrumentation,
  computeResearchMapLayout,
  computeRoutedOrthogonalPaths,
  computeSinkRanks,
  effectivePrerequisites,
  childEdgeEntryX,
  parentEdgeExitX,
  researchMapEdgePath,
  researchMapEdgePathRowBoundariesOnly,
  researchMapEdgePathWithMidY,
  technologyLayoutOrder,
  transitivePrerequisitesUp
} from './researchMapLayout.js'

function tech(name, prereqs, extra = {}) {
  return {
    name,
    displayName: name,
    prerequisites: prereqs,
    unit: { ingredients: [] },
    ...extra
  }
}

describe('parentEdgeExitX', () => {
  it('uses center for a single outgoing edge', () => {
    const layout = { centerX: 100, width: 92, left: 54 }
    expect(parentEdgeExitX(layout, 0, 1)).toBe(100)
  })

  it('splits the middle 50% for two edges (37.5% and 62.5%)', () => {
    const w = 100
    const left = 0
    const layout = { centerX: 50, width: w, left }
    expect(parentEdgeExitX(layout, 0, 2)).toBeCloseTo(37.5, 5)
    expect(parentEdgeExitX(layout, 1, 2)).toBeCloseTo(62.5, 5)
  })
})

describe('childEdgeEntryX', () => {
  it('matches parentEdgeExitX (center for one, split middle 50% for several)', () => {
    const layout = { centerX: 50, width: 100, left: 0 }
    expect(childEdgeEntryX(layout, 0, 1)).toBe(50)
    expect(childEdgeEntryX(layout, 0, 2)).toBeCloseTo(37.5, 5)
    expect(childEdgeEntryX(layout, 1, 2)).toBeCloseTo(62.5, 5)
  })
})

describe('attachmentXMappedToPeerSpan', () => {
  it('maps peer min/max to ends of the middle 50% band', () => {
    const layout = { centerX: 50, width: 100, left: 0 }
    expect(attachmentXMappedToPeerSpan(layout, 10, 10, 90)).toBeCloseTo(25, 5)
    expect(attachmentXMappedToPeerSpan(layout, 90, 10, 90)).toBeCloseTo(75, 5)
  })
})

describe('buildRoutedEdgeItems attachment by sink rank gap', () => {
  it('mixed gap tiers use distinct exit slots so connectors are not reused', () => {
    const w = 92
    const parentCx = 200
    const left = parentCx - w / 2
    const nodeLayouts = new Map([
      [
        'P',
        {
          centerX: parentCx,
          top: 0,
          height: 110,
          width: w,
          left,
          rank: 3
        }
      ],
      ['nearL', { centerX: 80, top: 144, height: 110, width: w, left: 80 - w / 2, rank: 2 }],
      ['nearR', { centerX: 120, top: 144, height: 110, width: w, left: 120 - w / 2, rank: 2 }],
      ['skip', { centerX: 200, top: 288, height: 110, width: w, left: 200 - w / 2, rank: 1 }]
    ])
    const edges = [
      ['P', 'nearL'],
      ['P', 'nearR'],
      ['P', 'skip']
    ]
    const items = buildRoutedEdgeItems(edges, nodeLayouts, 0, {})
    const fromP = items.filter(i => i.from === 'P').sort((a, b) => a.fromX - b.fromX)
    expect(fromP).toHaveLength(3)
    const slots = new Set(fromP.map(i => Math.round(i.fromX * 100) / 100))
    expect(slots.size).toBe(3)
    const nearL = fromP.find(i => i.to === 'nearL')
    const nearR = fromP.find(i => i.to === 'nearR')
    const skip = fromP.find(i => i.to === 'skip')
    expect(nearL.fromX).toBeLessThan(nearR.fromX)
    expect(nearR.fromX).toBeLessThan(skip.fromX)
  })
})

describe('effectivePrerequisites (transitive redundancy)', () => {
  it('drops a direct prereq when another direct prereq transitively requires it', () => {
    const technologies = {
      R1: tech('R1', []),
      R2: tech('R2', ['R1']),
      R3: tech('R3', ['R2']),
      R4: tech('R4', ['R1', 'R3'])
    }
    expect(effectivePrerequisites(technologies, 'R4').sort()).toEqual(['R3'])
    const up = transitivePrerequisitesUp(technologies, 'R3', new Map())
    expect(up.has('R1')).toBe(true)
  })

  it('keeps both when neither implies the other', () => {
    const technologies = {
      A: tech('A', []),
      B: tech('B', []),
      C: tech('C', ['A', 'B'])
    }
    expect(effectivePrerequisites(technologies, 'C').sort()).toEqual(['A', 'B'])
  })
})

describe('collectVisiblePrerequisiteClosure', () => {
  it('omits hidden prerequisites and does not traverse through them', () => {
    const technologies = {
      goal: tech('goal', ['visible', 'hidden_mid']),
      visible: tech('visible', []),
      hidden_mid: { ...tech('hidden_mid', ['root']), hidden: true },
      root: tech('root', [])
    }
    const s = collectVisiblePrerequisiteClosure(technologies, 'goal')
    expect(s.has('goal')).toBe(true)
    expect(s.has('visible')).toBe(true)
    expect(s.has('hidden_mid')).toBe(false)
    expect(s.has('root')).toBe(false)
  })

  it('returns empty when target is hidden', () => {
    const technologies = {
      x: { ...tech('x', []), hidden_in_factoriopedia: true }
    }
    expect(collectVisiblePrerequisiteClosure(technologies, 'x').size).toBe(0)
  })
})

describe('computeSinkRanks and layout', () => {
  it('ranks direct prerequisites of goal at 1', () => {
    const technologies = {
      goal: tech('goal', ['a', 'b']),
      a: tech('a', []),
      b: tech('b', [])
    }
    const nodes = collectVisiblePrerequisiteClosure(technologies, 'goal')
    const dependents = new Map()
    for (const name of nodes) {
      for (const p of technologies[name].prerequisites || []) {
        if (!nodes.has(p)) continue
        if (!dependents.has(p)) dependents.set(p, [])
        dependents.get(p).push(name)
      }
    }
    const { rankOf, maxRank } = computeSinkRanks(nodes, dependents, 'goal', technologies)
    expect(rankOf.get('goal')).toBe(0)
    expect(rankOf.get('a')).toBe(1)
    expect(rankOf.get('b')).toBe(1)
    expect(maxRank).toBe(1)
  })

  it('rank>=2 x uses bbox of all descendants toward sink, not only immediate tier', () => {
    const technologies = {
      goal: tech('goal', ['M', 'N']),
      M: tech('M', ['P']),
      N: tech('N', []),
      P: tech('P', [])
    }
    const nodes = collectVisiblePrerequisiteClosure(technologies, 'goal')
    const dependents = new Map()
    for (const name of nodes) {
      for (const p of technologies[name].prerequisites || []) {
        if (!nodes.has(p)) continue
        if (!dependents.has(p)) dependents.set(p, [])
        dependents.get(p).push(name)
      }
    }
    const { rankOf, maxRank, byRank } = computeSinkRanks(nodes, dependents, 'goal', technologies)
    const x = assignAbstractCenterX(nodes, rankOf, maxRank, byRank, dependents, 'goal', technologies)
    const descP = collectDescendantsTowardSink('P', nodes, rankOf, dependents)
    expect(descP.has('M')).toBe(true)
    expect(descP.has('goal')).toBe(true)
    expect(descP.has('N')).toBe(false)
    // M,N at -0.5, 0.5; P centered on M and goal: (-0.5+0)/2
    expect(x.get('P')).toBeCloseTo(-0.25, 5)
  })

  it('places rank-1 nodes on distinct abstract x before compaction', () => {
    const technologies = {
      goal: tech('goal', ['a', 'b', 'c']),
      a: tech('a', []),
      b: tech('b', []),
      c: tech('c', [])
    }
    const nodes = collectVisiblePrerequisiteClosure(technologies, 'goal')
    const dependents = new Map()
    for (const name of nodes) {
      for (const p of technologies[name].prerequisites || []) {
        if (!nodes.has(p)) continue
        if (!dependents.has(p)) dependents.set(p, [])
        dependents.get(p).push(name)
      }
    }
    const { rankOf, maxRank, byRank } = computeSinkRanks(nodes, dependents, 'goal', technologies)
    const x = assignAbstractCenterX(nodes, rankOf, maxRank, byRank, dependents, 'goal', technologies)
    expect(x.get('a')).not.toBe(x.get('b'))
  })

  it('abstractCompactMinGapForRank is tight near the goal and wider toward roots', () => {
    expect(abstractCompactMinGapForRank(1, 5, 0.85)).toBeCloseTo(1, 5)
    expect(abstractCompactMinGapForRank(5, 5, 0.85)).toBeCloseTo(1.85, 5)
    expect(abstractCompactMinGapForRank(3, 5, 0.85)).toBeCloseTo(1 + 0.85 * 0.5, 5)
    expect(abstractCompactMinGapForRank(1, 1)).toBe(1)
  })

  it('compactLayerCenters enforces minimum gap', () => {
    const x = new Map([
      ['a', 0],
      ['b', 0.2]
    ])
    compactLayerCenters(['a', 'b'], x, 1)
    expect((x.get('b') ?? 0) - (x.get('a') ?? 0)).toBeGreaterThanOrEqual(1)
  })

  it('computeResearchMapLayout returns non-overlapping horizontal centers after compaction', () => {
    const technologies = {
      goal: tech('goal', ['a', 'b']),
      a: tech('a', []),
      b: tech('b', [])
    }
    const L = computeResearchMapLayout(technologies, 'goal', {
      cardWidth: 92,
      minCenterGap: 10
    })
    expect(L).not.toBeNull()
    const ax = L.nodeLayouts.get('a').centerX
    const bx = L.nodeLayouts.get('b').centerX
    expect(Math.abs(ax - bx)).toBeGreaterThanOrEqual(92 + 10 - 1)
  })

  it('researchMapEdgePath produces a path string', () => {
    const from = { centerX: 10, top: 0, height: 20 }
    const to = { centerX: 10, top: 40, height: 20 }
    expect(researchMapEdgePath(from, to)).toMatch(/^M /)
  })

  it('researchMapEdgePathWithMidY uses child-row-only bracket when midY equals child top', () => {
    const from = { centerX: 50, top: 0, height: 20, width: 92, left: 4 }
    const to = { centerX: 200, top: 120, height: 20, width: 92, left: 154 }
    const p = researchMapEdgePathWithMidY(from, to, 120, { fromX: 60, toX: 210 })
    // Exit stub, horizontal below child top, entry stub (not a single bend on the child row)
    expect((p.match(/\bL\b/g) || []).length).toBe(4)
    expect(p).toBe('M 60 20 L 60 26 L 60 114 L 210 114 L 210 120')
  })

  it('buildOrthogonalPolylineThroughVertices uses only horizontal/vertical segments (V-then-H)', () => {
    const p = buildOrthogonalPolylineThroughVertices([
      [0, 0],
      [100, 50]
    ])
    expect(p).toEqual([
      [0, 0],
      [0, 50],
      [100, 50]
    ])
    const col = buildOrthogonalPolylineThroughVertices([
      [0, 0],
      [0, 40]
    ])
    expect(col).toEqual([
      [0, 0],
      [0, 40]
    ])
    const row = buildOrthogonalPolylineThroughVertices([
      [0, 0],
      [30, 0]
    ])
    expect(row).toEqual([
      [0, 0],
      [30, 0]
    ])
  })

  it('computeGutterLaneSpacingPx compresses when parallels exceed gutter capacity', () => {
    // margin 4 each side → maxSpread 16; 4 gaps between 5 lanes → raw 4
    expect(computeGutterLaneSpacingPx(24, 5, { gutterMarginPx: 4, gutterLaneMaxPx: 16 })).toBe(4)
    // overcrowded: maxSpread 4, raw 1
    expect(computeGutterLaneSpacingPx(12, 5, { gutterMarginPx: 4, gutterLaneMaxPx: 16 })).toBe(1)
  })

  it('computeGutterLaneSpacingPx keeps preferred spacing when gutter is taller than needed', () => {
    expect(computeGutterLaneSpacingPx(100, 2, { gutterLanePx: 4, gutterMarginPx: 4, gutterLaneMaxPx: 16 })).toBe(
      4
    )
  })

  it('computeGutterLaneSpacingPx returns preferred spacing when n <= 1', () => {
    expect(computeGutterLaneSpacingPx(10, 1, { gutterLanePx: 4 })).toBe(4)
  })

  it('computeRoutedOrthogonalPaths staggers edges in the same rank gutter', () => {
    const card = { width: 92, height: 20 }
    const nodeLayouts = new Map([
      ['p', { centerX: 50, top: 0, ...card, rank: 2, left: 50 - 46 }],
      ['a', { centerX: 10, top: 50, ...card, rank: 1, left: 10 - 46 }],
      ['b', { centerX: 90, top: 50, ...card, rank: 1, left: 90 - 46 }]
    ])
    const edges = [
      ['p', 'a'],
      ['p', 'b']
    ]
    const routed = computeRoutedOrthogonalPaths(edges, nodeLayouts, 0, { gutterLanePx: 4 })
    expect(routed).toHaveLength(2)
    const mids = routed.map(r => {
      const m = r.path.match(/L (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) L/)
      return m ? parseFloat(m[2]) : NaN
    })
    expect(Math.abs(mids[0] - mids[1])).toBeGreaterThan(0)
  })

  it('places gutter horizontals lower (larger midY) when |fromX-toX| is larger (cradle / no crossings)', () => {
    const card = { width: 40, height: 20 }
    const nodeLayouts = new Map([
      ['c', { centerX: 100, top: 80, ...card, rank: 0, left: 80 }],
      ['near', { centerX: 102, top: 0, ...card, rank: 1, left: 82 }],
      ['mid', { centerX: 40, top: 0, ...card, rank: 1, left: 20 }],
      ['far', { centerX: 0, top: 0, ...card, rank: 1, left: -20 }]
    ])
    const edges = [
      ['near', 'c'],
      ['mid', 'c'],
      ['far', 'c']
    ]
    const routed = computeRoutedOrthogonalPaths(edges, nodeLayouts, 0, { gutterLanePx: 4 })
    const midY = path => {
      const m = path.match(/L (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) L/)
      return m ? parseFloat(m[2]) : NaN
    }
    const byKey = new Map(routed.map(r => [`${r.from}\0${r.to}`, midY(r.path)]))
    // |fromX-toX| near < mid < far → midY increases with span (outer lines lower in the gutter)
    expect(byKey.get('near\0c')).toBeLessThan(byKey.get('mid\0c'))
    expect(byKey.get('mid\0c')).toBeLessThan(byKey.get('far\0c'))
  })

  it('fans child entry X when several parents share the same center (colocated span)', () => {
    const w = 100
    const shared = { centerX: 100, top: 0, height: 20, width: w, left: 50, rank: 2 }
    const nodeLayouts = new Map([
      ['p0', { ...shared, top: 0 }],
      ['p1', { ...shared, top: 0 }],
      ['p2', { ...shared, top: 0 }],
      ['goal', { centerX: 100, top: 60, height: 20, width: w, left: 50, rank: 1 }]
    ])
    const edges = [
      ['p0', 'goal'],
      ['p1', 'goal'],
      ['p2', 'goal']
    ]
    const routed = computeRoutedOrthogonalPaths(edges, nodeLayouts, 0)
    const entryX = path => {
      const parts = path.trim().split(/\s+/)
      return parseFloat(parts[parts.length - 2])
    }
    const xs = routed.map(r => entryX(r.path)).sort((a, b) => a - b)
    expect(new Set(xs).size).toBe(3)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
  })

  it('computeRoutedOrthogonalPaths splits child top entry when two parents feed one child', () => {
    const w = 100
    const nodeLayouts = new Map([
      ['a', { centerX: 20, top: 0, height: 20, width: w, left: -30, rank: 2 }],
      ['b', { centerX: 180, top: 0, height: 20, width: w, left: 130, rank: 2 }],
      ['c', { centerX: 100, top: 60, height: 20, width: w, left: 50, rank: 1 }]
    ])
    const edges = [
      ['a', 'c'],
      ['b', 'c']
    ]
    const routed = computeRoutedOrthogonalPaths(edges, nodeLayouts, 0)
    expect(routed).toHaveLength(2)
    const lastX = routed.map(r => {
      const parts = r.path.trim().split(/\s+/)
      const x = parseFloat(parts[parts.length - 2])
      return x
    })
    // Child left=50, width=100 → band [75,125]; parents at x=20 and 180 map to ends (75 and 125)
    expect(lastX[0]).toBeCloseTo(75, 5)
    expect(lastX[1]).toBeCloseTo(125, 5)
    expect(lastX[0]).not.toBe(lastX[1])
  })

  it('orders child entry points by parent centerX (not name) when sources disagree', () => {
    const w = 100
    const nodeLayouts = new Map([
      ['left', { centerX: 20, top: 0, height: 20, width: w, left: -30, rank: 2 }],
      ['right', { centerX: 180, top: 0, height: 20, width: w, left: 130, rank: 2 }],
      ['c', { centerX: 100, top: 60, height: 20, width: w, left: 50, rank: 1 }]
    ])
    const edges = [
      ['right', 'c'],
      ['left', 'c']
    ]
    const routed = computeRoutedOrthogonalPaths(edges, nodeLayouts, 0)
    const byTarget = new Map()
    for (const r of routed) {
      byTarget.set(`${r.from}\0${r.to}`, r)
    }
    const pathLeft = byTarget.get('left\0c').path
    const pathRight = byTarget.get('right\0c').path
    const entryX = path => {
      const parts = path.trim().split(/\s+/)
      return parseFloat(parts[parts.length - 2])
    }
    // left parent is west → lower entry x on child than right parent
    expect(entryX(pathLeft)).toBeLessThan(entryX(pathRight))
  })

  it('researchMapEdgePathRowBoundariesOnly: spine on parent and child rows, vertical through gap', () => {
    const p = researchMapEdgePathRowBoundariesOnly(10, 90, 20, 100)
    expect((p.match(/\bL\b/g) || []).length).toBe(5)
    expect(p).toBe('M 10 20 L 10 26 L 50 26 L 50 94 L 90 94 L 90 100')
  })

  it('researchMapEdgePathRowBoundariesOnly: straight vertical when fromX equals toX', () => {
    expect(researchMapEdgePathRowBoundariesOnly(50, 50, 20, 100)).toBe(
      'M 50 20 L 50 26 L 50 94 L 50 100'
    )
  })

  it('uses parent/child row spine when sink rank skips tiers (no gutter horizontal)', () => {
    const card = { width: 40, height: 20 }
    const nodeLayouts = new Map([
      ['root', { centerX: 10, top: 0, ...card, rank: 3, left: -10 }],
      ['goal', { centerX: 90, top: 200, ...card, rank: 0, left: 70 }]
    ])
    const routed = computeRoutedOrthogonalPaths([['root', 'goal']], nodeLayouts, 0)
    expect(routed).toHaveLength(1)
    expect((routed[0].path.match(/\bL\b/g) || []).length).toBe(5)
    expect(routed[0].path).toMatch(/L 50 \d/)
  })

  it('vertical only when attachment X aligns across skipped tiers', () => {
    const card = { width: 40, height: 20 }
    const nodeLayouts = new Map([
      ['root', { centerX: 50, top: 0, ...card, rank: 3, left: 30 }],
      ['goal', { centerX: 50, top: 200, ...card, rank: 0, left: 30 }]
    ])
    const routed = computeRoutedOrthogonalPaths([['root', 'goal']], nodeLayouts, 0)
    // Port stubs: three colinear vertical segments at the shared attachment X
    expect((routed[0].path.match(/\bL\b/g) || []).length).toBe(3)
  })
})

describe('computeDagLinkSvgPaths', () => {
  /** First horizontal bend after the parent bottom (same as gutter lane tests above). */
  const midYFromPath = path => {
    const m = path.match(/L (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) L/)
    return m ? parseFloat(m[2]) : NaN
  }

  it('uses staggered gutter midY for adjacent ranks (same lanes as computeRoutedOrthogonalPaths)', () => {
    const w = 100
    const nodeLayouts = new Map([
      ['P', { centerX: 200, top: 0, height: 20, width: w, left: 150, rank: 2 }],
      ['L', { centerX: 80, top: 60, height: 20, width: w, left: 30, rank: 1 }],
      ['R', { centerX: 380, top: 60, height: 20, width: w, left: 330, rank: 1 }]
    ])
    const edges = [
      ['P', 'L'],
      ['P', 'R']
    ]
    const offsetY = 0
    const manual = computeRoutedOrthogonalPaths(edges, nodeLayouts, offsetY, { gutterLanePx: 4 })
    const dag = {
      links() {
        return [
          { source: { data: 'P' }, target: { data: 'L' }, points: [[300, 100], [200, 200]] },
          { source: { data: 'P' }, target: { data: 'R' }, points: [[300, 100], [400, 200]] }
        ]
      },
      nodes() {
        return [
          { data: 'P', y: 55 },
          { data: 'L', y: 115 },
          { data: 'R', y: 115 }
        ]
      }
    }
    const rankOf = new Map([
      ['P', 2],
      ['L', 1],
      ['R', 1]
    ])
    const dagPaths = computeDagLinkSvgPaths(
      dag,
      edges,
      nodeLayouts,
      offsetY,
      { minLX: 0, minTY: 0, pad: 0 },
      rankOf,
      2
    )
    for (const m of manual) {
      const expectedMid = midYFromPath(m.path)
      const dagP = dagPaths.find(d => d.from === m.from && d.to === m.to)?.path
      expect(dagP).toBeDefined()
      expect(midYFromPath(dagP)).toBeCloseTo(expectedMid, 5)
    }
    const pl = dagPaths.find(d => d.from === 'P' && d.to === 'L').path
    const pr = dagPaths.find(d => d.from === 'P' && d.to === 'R').path
    expect(midYFromPath(pl)).not.toBeCloseTo(midYFromPath(pr), 5)
  })

  it('uses buildRoutedEdgeItems midY on rendered paths for rank-skipped edges with interior dag points', () => {
    const w = 100
    const nodeLayouts = new Map([
      ['P', { centerX: 200, top: 0, height: 20, width: w, left: 150, rank: 3 }],
      ['L', { centerX: 80, top: 120, height: 20, width: w, left: 30, rank: 1 }],
      ['R', { centerX: 380, top: 120, height: 20, width: w, left: 330, rank: 1 }]
    ])
    const edges = [
      ['P', 'L'],
      ['P', 'R']
    ]
    const offsetY = 0
    const opts = { gutterLanePx: 4 }
    const items = buildRoutedEdgeItems(edges, nodeLayouts, offsetY, opts)
    const itL = items.find(i => i.from === 'P' && i.to === 'L')
    const itR = items.find(i => i.from === 'P' && i.to === 'R')
    expect(itL.midY).not.toBeCloseTo(itR.midY, 5)

    const dag = {
      links() {
        return [
          {
            source: { data: 'P' },
            target: { data: 'L' },
            points: [
              [300, 40],
              [200, 120],
              [200, 240]
            ]
          },
          {
            source: { data: 'P' },
            target: { data: 'R' },
            points: [
              [300, 40],
              [400, 120],
              [400, 240]
            ]
          }
        ]
      },
      nodes() {
        return []
      }
    }
    const rankOf = new Map([
      ['P', 3],
      ['L', 1],
      ['R', 1]
    ])
    const dagPaths = computeDagLinkSvgPaths(
      dag,
      edges,
      nodeLayouts,
      offsetY,
      { minLX: 0, minTY: 0, pad: 0 },
      rankOf,
      3,
      opts
    )
    const pathL = dagPaths.find(d => d.from === 'P' && d.to === 'L').path
    const pathR = dagPaths.find(d => d.from === 'P' && d.to === 'R').path
    const ysL = new Set(verticesFromOrthogonalSvgPath(pathL).map(([, y]) => y))
    const ysR = new Set(verticesFromOrthogonalSvgPath(pathR).map(([, y]) => y))
    expect([...ysL].some(y => Math.abs(y - itL.midY) < 1e-6)).toBe(true)
    expect([...ysR].some(y => Math.abs(y - itR.midY) < 1e-6)).toBe(true)
  })

  it('collapses zigzag dag interior X on one gutter so the path does not retrace horizontally', () => {
    const w = 100
    const nodeLayouts = new Map([
      ['P', { centerX: 200, top: 0, height: 20, width: w, left: 150, rank: 2 }],
      ['C', { centerX: 280, top: 60, height: 20, width: w, left: 230, rank: 1 }]
    ])
    const edges = [['P', 'C']]
    const offsetY = 0
    const opts = { gutterLanePx: 4 }
    const it = buildRoutedEdgeItems(edges, nodeLayouts, offsetY, opts)[0]
    const { fromX, toX } = it
    const lo = Math.min(fromX, toX)
    const hi = Math.max(fromX, toX)
    const innerX0 = hi - 3
    const innerX1 = lo + 3
    const innerX2 = hi - 1
    expect(innerX0 > innerX1).toBe(true)

    const dag = {
      links() {
        return [
          {
            source: { data: 'P' },
            target: { data: 'C' },
            points: [
              [300, 40],
              [innerX0, 100],
              [innerX1, 110],
              [innerX2, 120],
              [320, 200]
            ]
          }
        ]
      },
      nodes() {
        return []
      }
    }
    const rankOf = new Map([
      ['P', 2],
      ['C', 1]
    ])
    const path = computeDagLinkSvgPaths(
      dag,
      edges,
      nodeLayouts,
      offsetY,
      { minLX: 0, minTY: 0, pad: 0 },
      rankOf,
      2,
      opts
    )[0].path
    const verts = verticesFromOrthogonalSvgPath(path)
    expect(checkNoHorizontalBacktrackSameY(verts).ok).toBe(true)
  })
})

describe('obstacle-aware midY routing', () => {
  it('picks horizontal-first path when vertical-first would pass through another card', () => {
    const w = 92
    const h = 110
    const gap = 34
    const nodeLayouts = new Map([
      ['top', { centerX: 100, top: 0, height: h, width: w, left: 100 - w / 2, rank: 2 }],
      ['mid', { centerX: 100, top: h + gap, height: h, width: w, left: 100 - w / 2, rank: 1 }],
      ['bot', { centerX: 200, top: 2 * (h + gap), height: h, width: w, left: 200 - w / 2, rank: 0 }]
    ])
    const edges = [['top', 'bot']]
    const offsetY = 0
    const opts = { gutterLanePx: 4 }
    const items = buildRoutedEdgeItems(edges, nodeLayouts, offsetY, opts)
    const it0 = items[0]
    const fromL = { ...nodeLayouts.get('top'), top: 0 }
    const toL = { ...nodeLayouts.get('bot'), top: nodeLayouts.get('bot').top }
    const vh = researchMapEdgePathWithMidY(fromL, toL, it0.midY, {
      fromX: it0.fromX,
      toX: it0.toX,
      portStubMinPx: 6
    })
    const obs = buildObstacleRects(nodeLayouts, offsetY, 'top', 'bot', 0)
    expect(obs.some(o => o.id === 'mid')).toBe(true)
    expect(polylineIntersectsAnyObstacle(verticesFromOrthogonalSvgPath(vh), obs)).toBe(true)

    const routed = computeRoutedOrthogonalPaths(edges, nodeLayouts, offsetY, opts)
    expect(polylineIntersectsAnyObstacle(verticesFromOrthogonalSvgPath(routed[0].path), obs)).toBe(false)
  })
})

/** Mirrors {@link computeResearchMapLayout}: effective prereqs + dependents for tests. */
function buildEffectiveGraph(technologies, targetName) {
  const nodes = collectVisiblePrerequisiteClosure(technologies, targetName)
  const prereqMemo = new Map()
  const effectiveByName = new Map()
  for (const name of nodes) {
    effectiveByName.set(
      name,
      effectivePrerequisites(technologies, name, prereqMemo).filter(p => nodes.has(p))
    )
  }
  const dependents = new Map()
  for (const name of nodes) {
    for (const p of effectiveByName.get(name) || []) {
      if (!dependents.has(p)) dependents.set(p, [])
      dependents.get(p).push(name)
    }
  }
  return { nodes, effectiveByName, dependents }
}

describe('assignAbstractCenterX rank-1 (effective prerequisites)', () => {
  it('places only non-redundant direct prerequisites, left-to-right by name when order is empty', () => {
    const technologies = {
      goal: tech('goal', ['a', 'b', 'c', 'd', 'e']),
      a: tech('a', []),
      b: tech('b', []),
      c: tech('c', []),
      d: tech('d', []),
      e: tech('e', ['a', 'b'])
    }
    expect(effectivePrerequisites(technologies, 'goal').sort()).toEqual(['c', 'd', 'e'])

    const { nodes, effectiveByName, dependents } = buildEffectiveGraph(technologies, 'goal')
    const { rankOf, maxRank, byRank } = computeSinkRanks(nodes, dependents, 'goal', technologies)
    const x = assignAbstractCenterX(
      nodes,
      rankOf,
      maxRank,
      byRank,
      dependents,
      'goal',
      technologies,
      effectiveByName
    )
    expect(x.get('c')).toBeCloseTo(-1, 5)
    expect(x.get('d')).toBeCloseTo(0, 5)
    expect(x.get('e')).toBeCloseTo(1, 5)
    expect(rankOf.get('a')).toBe(2)
    expect(rankOf.get('b')).toBe(2)
  })
})

describe('computeResearchMapLayout integration', () => {
  it('rowsTopToBottom rank-1 lists effective prerequisites left-to-right by Sugiyama x', () => {
    const technologies = {
      goal: tech('goal', ['a', 'b', 'c', 'd', 'e']),
      a: tech('a', []),
      b: tech('b', []),
      c: tech('c', []),
      d: tech('d', []),
      e: tech('e', ['a', 'b'])
    }
    const L = computeResearchMapLayout(technologies, 'goal')
    expect(L).not.toBeNull()
    const rank1Row = L.rowsTopToBottom.find(r => r.layerIndex === 1)
    const effective = effectivePrerequisites(technologies, 'goal')
    const rank1Effective = rank1Row.names.filter(n => effective.includes(n))
    expect(new Set(rank1Effective)).toEqual(new Set(['c', 'd', 'e']))
    const xs = rank1Effective.map(n => L.nodeLayouts.get(n).centerX)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
  })

  it('angels-ore-floatation-style graph: effective rank-1 set and Sugiyama left-to-right order', () => {
    const technologies = {
      'angels-ore-floatation': tech('angels-ore-floatation', [
        'angels-advanced-ore-refining-1',
        'angels-ore-crushing',
        'angels-basic-chemistry-2',
        'bob-alloy-processing',
        'angels-ore-advanced-crushing'
      ]),
      'angels-advanced-ore-refining-1': tech('angels-advanced-ore-refining-1', []),
      'angels-ore-crushing': tech('angels-ore-crushing', ['angels-advanced-ore-refining-1']),
      'angels-basic-chemistry-2': tech('angels-basic-chemistry-2', []),
      'bob-alloy-processing': tech('bob-alloy-processing', []),
      'angels-ore-advanced-crushing': tech('angels-ore-advanced-crushing', [
        'angels-ore-crushing',
        'angels-advanced-ore-refining-1'
      ])
    }
    expect(effectivePrerequisites(technologies, 'angels-ore-floatation').sort()).toEqual([
      'angels-basic-chemistry-2',
      'angels-ore-advanced-crushing',
      'bob-alloy-processing'
    ])

    const L = computeResearchMapLayout(technologies, 'angels-ore-floatation', {
      cardWidth: 92,
      minCenterGap: 10
    })
    expect(L).not.toBeNull()
    const rank1 = L.rowsTopToBottom.find(row => row.layerIndex === 1)
    const effective = effectivePrerequisites(technologies, 'angels-ore-floatation')
    const rank1Effective = rank1.names.filter(n => effective.includes(n))
    expect(new Set(rank1Effective)).toEqual(
      new Set([
        'angels-basic-chemistry-2',
        'angels-ore-advanced-crushing',
        'bob-alloy-processing'
      ])
    )
    const xs = rank1Effective.map(n => L.nodeLayouts.get(n).centerX)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
  })
})

describe('collectResearchMapLayerInstrumentation', () => {
  it('reports semantic rank counts and Sugiyama physical layer widths', () => {
    const technologies = {
      goal: tech('goal', ['a', 'b']),
      a: tech('a', []),
      b: tech('b', [])
    }
    const L = computeResearchMapLayout(technologies, 'goal')
    expect(L).not.toBeNull()
    const inst = collectResearchMapLayerInstrumentation(L)
    expect(inst).not.toBeNull()
    expect(inst.semanticRanks.length).toBe(L.maxRank + 1)
    expect(inst.semanticMaxWidth).toBeGreaterThan(0)
    expect(inst.sugiLayerCount).toBeGreaterThan(0)
    expect(inst.sugiLayers.length).toBe(inst.sugiLayerCount)
    expect(inst.sugiTotalDagNodes).toBeGreaterThanOrEqual(L.nodes.size)
    expect(inst.sugiTotalDummyNodes + inst.visibleTechnologyCount).toBe(inst.sugiTotalDagNodes)
  })
})

describe('childrenTowardSink', () => {
  it('returns only dependents one rank below', () => {
    const technologies = {
      goal: tech('goal', ['m']),
      m: tech('m', ['u']),
      u: tech('u', [])
    }
    const nodes = collectVisiblePrerequisiteClosure(technologies, 'goal')
    const dependents = new Map()
    for (const name of nodes) {
      for (const p of technologies[name].prerequisites || []) {
        if (!nodes.has(p)) continue
        if (!dependents.has(p)) dependents.set(p, [])
        dependents.get(p).push(name)
      }
    }
    const { rankOf } = computeSinkRanks(nodes, dependents, 'goal', technologies)
    const ch = childrenTowardSink('m', rankOf, dependents, technologies)
    expect(ch).toEqual(['goal'])
  })
})
