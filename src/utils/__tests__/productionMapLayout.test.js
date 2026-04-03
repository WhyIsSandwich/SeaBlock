import { describe, expect, it } from 'vitest'

import { buildProductionTreeGraph, PM_TREE_ROOT_ID } from '../productionMapGraph.js'
import {
  computeProductionDepths,
  computeProductionMapFrame,
  computeProductionMapLayout,
  computeProductionEdgePaths,
  estimateWrappedLabelLines,
  estimateCardSizeForNode,
  layoutDepthMap,
  translateProductionMapPathD,
  PRODUCTION_MAP_GAP_Y
} from '../productionMapLayout.js'

const data = {
  item: {
    plate: { name: 'plate', displayName: 'Plate' },
    ore: { name: 'ore', displayName: 'Ore' }
  },
  fluid: {},
  recipe: {
    smelt: {
      name: 'smelt',
      displayName: 'Smelt',
      ingredients: [{ type: 'item', name: 'ore', amount: 1 }],
      results: [{ type: 'item', name: 'plate', amount: 1 }]
    }
  }
}

/** Single producer `smelt` under root (right branch). */
const PATH_SMELT = `${PM_TREE_ROOT_ID}/r0000`
const PATH_ORE = `${PATH_SMELT}/0000`

describe('computeProductionDepths', () => {
  it('layers focus then recipe then ingredient', () => {
    const { nodes, edges } = buildProductionTreeGraph(
      data,
      'item',
      'plate',
      new Set([PM_TREE_ROOT_ID, PATH_SMELT]),
      {}
    )
    const depth = computeProductionDepths(nodes, edges, PM_TREE_ROOT_ID)
    expect(depth.get(PM_TREE_ROOT_ID)).toBe(0)
    expect(depth.get(PATH_SMELT)).toBe(1)
    expect(depth.get(PATH_ORE)).toBe(2)
  })

  it('keeps focus at depth 0 when it is also an ingredient edge (closure)', () => {
    const focusId = 'item:plate'
    const nodes = new Map([
      [focusId, { kind: 'material' }],
      ['recipe:uses_plate', { kind: 'recipe' }]
    ])
    const edges = [
      { from: 'recipe:uses_plate', to: focusId },
      { from: focusId, to: 'recipe:uses_plate' }
    ]
    const depth = computeProductionDepths(nodes, edges, focusId)
    expect(depth.get(focusId)).toBe(0)
    expect(depth.get('recipe:uses_plate')).toBe(1)
  })

  it('does not inflate depths along cyclic closure (BFS hop count)', () => {
    const focusId = 'item:a'
    const nodes = new Map([
      [focusId, { kind: 'material' }],
      ['item:b', { kind: 'material' }],
      ['recipe:r1', { kind: 'recipe' }],
      ['recipe:r2', { kind: 'recipe' }]
    ])
    const edges = [
      { from: 'recipe:r1', to: focusId },
      { from: focusId, to: 'recipe:r2' },
      { from: 'item:b', to: 'recipe:r1' },
      { from: 'recipe:r2', to: 'item:b' }
    ]
    const depth = computeProductionDepths(nodes, edges, focusId)
    for (const id of nodes.keys()) {
      expect(depth.get(id)).toBeGreaterThanOrEqual(0)
      expect(depth.get(id)).toBeLessThanOrEqual(4)
    }
    expect(depth.get(focusId)).toBe(0)
  })
})

describe('spine row layout', () => {
  it('aligns spine nodes to baseY and stacks non-spine siblings below in the same column', () => {
    const baseY = 48
    const data2 = {
      item: {
        plate: { name: 'plate', displayName: 'Plate' },
        ore: { name: 'ore', displayName: 'Ore' }
      },
      fluid: {},
      recipe: {
        smelt: {
          name: 'smelt',
          displayName: 'Smelt',
          ingredients: [{ type: 'item', name: 'ore', amount: 1 }],
          results: [{ type: 'item', name: 'plate', amount: 1 }]
        },
        merge: {
          name: 'merge',
          displayName: 'Merge',
          ingredients: [{ type: 'item', name: 'ore', amount: 1 }],
          results: [{ type: 'item', name: 'plate', amount: 1 }]
        }
      }
    }
    const pathMerge = `${PM_TREE_ROOT_ID}/r0000`
    const pathSmelt = `${PM_TREE_ROOT_ID}/r0001`
    const { nodes, edges } = buildProductionTreeGraph(
      data2,
      'item',
      'plate',
      new Set([PM_TREE_ROOT_ID]),
      {}
    )
    const spine = new Set([PM_TREE_ROOT_ID, pathMerge])
    const { positions } = computeProductionMapLayout(nodes, edges, PM_TREE_ROOT_ID, {
      baseY,
      baseX: 48,
      spineNodeIds: spine
    })
    expect(positions.get(PM_TREE_ROOT_ID).y).toBe(baseY)
    expect(positions.get(pathMerge).y).toBe(baseY)
    expect(positions.get(pathSmelt).y).toBeGreaterThan(baseY)
  })

  it('aligns spine across columns at the same baseY', () => {
    const baseY = 48
    const { nodes, edges } = buildProductionTreeGraph(
      data,
      'item',
      'plate',
      new Set([PM_TREE_ROOT_ID, PATH_SMELT]),
      {}
    )
    const spine = new Set([PM_TREE_ROOT_ID, PATH_SMELT])
    const { positions } = computeProductionMapLayout(nodes, edges, PM_TREE_ROOT_ID, {
      baseY,
      baseX: 48,
      spineNodeIds: spine
    })
    expect(positions.get(PM_TREE_ROOT_ID).y).toBe(baseY)
    expect(positions.get(PATH_SMELT).y).toBe(baseY)
  })
})

describe('getExtraCardHeight', () => {
  it('adds vertical space when host supplies extra height for a node', () => {
    const nodes = new Map([
      [PM_TREE_ROOT_ID, { kind: 'material', layoutDepth: 0, displayName: 'P' }],
      ['r1', { kind: 'recipe', layoutDepth: 1, displayName: 'Craft', name: 'craft' }]
    ])
    const edges = []
    const base = computeProductionMapLayout(nodes, edges, PM_TREE_ROOT_ID, {})
    const extra = computeProductionMapLayout(nodes, edges, PM_TREE_ROOT_ID, {
      getExtraCardHeight(node) {
        return node.kind === 'recipe' ? 40 : 0
      }
    })
    expect(extra.positions.get('r1').height).toBeGreaterThan(base.positions.get('r1').height)
    expect(extra.positions.get('r1').height - base.positions.get('r1').height).toBe(40)
  })
})

describe('layout idempotence', () => {
  it('same graph and options yield identical positions (pure layout)', () => {
    const { nodes, edges } = buildProductionTreeGraph(
      data,
      'item',
      'plate',
      new Set([PM_TREE_ROOT_ID, PATH_SMELT]),
      {}
    )
    const opts = { anchorX: 200, baseY: 300 }
    const a = computeProductionMapLayout(nodes, edges, PM_TREE_ROOT_ID, opts)
    const b = computeProductionMapLayout(nodes, edges, PM_TREE_ROOT_ID, opts)
    expect([...a.positions.entries()].sort((x, y) => x[0].localeCompare(y[0]))).toEqual(
      [...b.positions.entries()].sort((x, y) => x[0].localeCompare(y[0]))
    )
  })
})

describe('translateProductionMapPathD', () => {
  it('offsets M and C coordinates', () => {
    const d = 'M 10 20 C 30 20 30 40 50 40'
    expect(translateProductionMapPathD(d, 3, -5)).toBe('M 13 15 C 33 15 33 35 53 35')
  })
})

describe('computeProductionMapFrame', () => {
  it('returns edgePaths consistent with positions in layout space', () => {
    const { nodes, edges } = buildProductionTreeGraph(
      data,
      'item',
      'plate',
      new Set([PM_TREE_ROOT_ID, PATH_SMELT]),
      {}
    )
    const frame = computeProductionMapFrame(nodes, edges, PM_TREE_ROOT_ID, {})
    const manual = computeProductionEdgePaths(frame.positions, edges, nodes)
    expect(frame.edgePaths.length).toBe(manual.length)
    expect(frame.edgePaths.map(s => s.key).sort()).toEqual(manual.map(s => s.key).sort())
  })
})

describe('computeProductionEdgePaths', () => {
  it('returns paths for positioned endpoints (vertical)', () => {
    const positions = new Map([
      ['a', { x: 0, y: 0, width: 10, height: 10 }],
      ['b', { x: 0, y: 40, width: 10, height: 10 }]
    ])
    const paths = computeProductionEdgePaths(positions, [{ from: 'a', to: 'b' }])
    expect(paths.length).toBe(1)
    expect(paths[0].d).toMatch(/^M /)
    expect(paths[0].kind).toBe('tree')
  })

  it('horizontal paths connect right of left node to left of right node', () => {
    const positions = new Map([
      ['left', { x: 0, y: 10, width: 40, height: 20 }],
      ['right', { x: 100, y: 10, width: 40, height: 20 }]
    ])
    const paths = computeProductionEdgePaths(positions, [
      { from: 'left', to: 'right', kind: 'link' }
    ])
    expect(paths[0].d).toContain('M 40 20')
    expect(paths[0].d).toContain('100 20')
    expect(paths[0].kind).toBe('link')
  })

  it('uses top/bottom when rects overlap in X (no misleading side ports)', () => {
    const positions = new Map([
      ['a', { x: 0, y: 0, width: 40, height: 20 }],
      ['b', { x: 30, y: 80, width: 40, height: 20 }]
    ])
    const paths = computeProductionEdgePaths(positions, [{ from: 'a', to: 'b' }])
    expect(paths[0].d).toMatch(/^M 20 20 /)
    expect(paths[0].d).toMatch(/50 80$/)
  })
})

describe('estimateWrappedLabelLines', () => {
  it('caps at maxLines', () => {
    const long = 'word '.repeat(40)
    expect(estimateWrappedLabelLines(long, 50, 7, 2)).toBe(2)
  })
})

describe('estimateCardSizeForNode', () => {
  it('recipe height grows with long display names', () => {
    const short = estimateCardSizeForNode({
      kind: 'recipe',
      name: 'x',
      displayName: 'Short'
    })
    const long = estimateCardSizeForNode({
      kind: 'recipe',
      name: 'x',
      displayName: 'Very long recipe display name that should wrap in the box'
    })
    expect(long.height).toBeGreaterThanOrEqual(short.height)
  })
})

describe('layoutDepthMap', () => {
  it('clamps large depths for placement', () => {
    const raw = new Map([
      ['a', 0],
      ['b', 999]
    ])
    const m = layoutDepthMap(raw, 12)
    expect(m.get('a')).toBe(0)
    expect(m.get('b')).toBe(12)
  })
})

describe('computeProductionEdgePaths tree stroke', () => {
  it('does not set per-ingredient stroke (host uses neutral tree color)', () => {
    const positions = new Map([
      ['item:ore', { x: 0, y: 40, width: 40, height: 40 }],
      ['recipe:r', { x: 80, y: 0, width: 60, height: 40 }]
    ])
    const nodes = new Map([
      ['item:ore', { kind: 'material', prototypeKey: 'item:ore' }],
      ['recipe:r', { kind: 'recipe' }]
    ])
    const paths = computeProductionEdgePaths(
      positions,
      [{ from: 'item:ore', to: 'recipe:r', kind: 'tree' }],
      nodes
    )
    expect(paths[0].stroke).toBe(null)
  })
})

describe('sibling secondary axis spacing', () => {
  it('stacks same-depth siblings by stable id with gapY', () => {
    const data2 = {
      item: {
        plate: { name: 'plate', displayName: 'Plate' },
        ore: { name: 'ore', displayName: 'Ore' }
      },
      fluid: {},
      recipe: {
        smelt: {
          name: 'smelt',
          displayName: 'Smelt',
          ingredients: [{ type: 'item', name: 'ore', amount: 1 }],
          results: [{ type: 'item', name: 'plate', amount: 1 }]
        },
        merge: {
          name: 'merge',
          displayName: 'Merge',
          ingredients: [{ type: 'item', name: 'ore', amount: 1 }],
          results: [{ type: 'item', name: 'plate', amount: 1 }]
        }
      }
    }
    const pathMerge = `${PM_TREE_ROOT_ID}/r0000`
    const pathSmelt = `${PM_TREE_ROOT_ID}/r0001`
    const { nodes, edges } = buildProductionTreeGraph(
      data2,
      'item',
      'plate',
      new Set([PM_TREE_ROOT_ID]),
      {}
    )
    const { positions } = computeProductionMapLayout(nodes, edges, PM_TREE_ROOT_ID, {
      baseX: 100,
      baseY: 80
    })
    const pMerge = positions.get(pathMerge)
    const pSmelt = positions.get(pathSmelt)
    expect(pMerge).toBeDefined()
    expect(pSmelt).toBeDefined()
    expect(pMerge.x).toBe(pSmelt.x)
    const gap = PRODUCTION_MAP_GAP_Y
    const lower = pMerge.y <= pSmelt.y ? pMerge : pSmelt
    const upper = pMerge.y <= pSmelt.y ? pSmelt : pMerge
    expect(lower.y + lower.height + gap).toBeLessThanOrEqual(upper.y)
  })
})

describe('layout depth along x', () => {
  it('focus is leftmost; deeper nodes extend to the right', () => {
    const { nodes, edges } = buildProductionTreeGraph(
      data,
      'item',
      'plate',
      new Set([PM_TREE_ROOT_ID, PATH_SMELT]),
      {}
    )
    const { positions } = computeProductionMapLayout(nodes, edges, PM_TREE_ROOT_ID, {
      baseX: 48,
      baseY: 80
    })
    const fx = positions.get(PM_TREE_ROOT_ID).x
    const rx = positions.get(PATH_SMELT).x
    const ox = positions.get(PATH_ORE).x
    expect(rx).toBeGreaterThan(fx)
    expect(ox).toBeGreaterThan(rx)
  })
})
