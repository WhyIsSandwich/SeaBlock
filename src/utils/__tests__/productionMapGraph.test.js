import { describe, expect, it } from 'vitest'

import {
  buildProductionTreeGraph,
  clampTreePathToExisting,
  expandedPathsForSpineTerminal,
  markRepeatMaterialNodes,
  materialIngredientsForRecipe,
  materialKey,
  materialHasExpandableConsumers,
  materialHasExpandableRecipes,
  materialResultsForRecipe,
  parentTreePath,
  parseMaterialKey,
  parseNodeId,
  PM_TREE_ROOT_ID,
  pruneDescendantTreePaths,
  recipeHasExpandableIngredients,
  recipeHasExpandableProducts,
  recipeNodeId,
  recipesConsumingMaterial,
  recipesProducingMaterial,
  spinePathIdsForTerminal
} from '../productionMapGraph.js'

const tinyData = {
  item: {
    'iron-plate': { name: 'iron-plate', displayName: 'Iron plate' },
    'iron-ore': { name: 'iron-ore', displayName: 'Iron ore' },
    copper: { name: 'copper', displayName: 'Copper' }
  },
  fluid: {
    water: { name: 'water', displayName: 'Water' }
  },
  recipe: {
    'consume-plate': {
      name: 'consume-plate',
      displayName: 'Consume plate',
      ingredients: [{ type: 'item', name: 'iron-plate', amount: 1 }],
      results: [{ type: 'item', name: 'copper', amount: 1 }]
    },
    smelt: {
      name: 'smelt',
      displayName: 'Smelt',
      ingredients: [{ type: 'item', name: 'iron-ore', amount: 1 }],
      results: [{ type: 'item', name: 'iron-plate', amount: 1 }]
    },
    alt: {
      name: 'alt',
      displayName: 'Alt',
      ingredients: [{ type: 'item', name: 'copper', amount: 2 }],
      results: [{ type: 'item', name: 'iron-plate', amount: 1 }]
    },
    chem: {
      name: 'chem',
      displayName: 'Chem',
      ingredients: [
        { type: 'fluid', name: 'water', amount: 10 },
        { type: 'item', name: 'copper', amount: 1 }
      ],
      results: [{ type: 'fluid', name: 'water', amount: 5 }]
    },
    merge: {
      name: 'merge',
      displayName: 'Merge',
      ingredients: [
        { type: 'item', name: 'iron-ore', amount: 1 },
        { type: 'item', name: 'copper', amount: 1 }
      ],
      results: [{ type: 'item', name: 'iron-plate', amount: 1 }]
    }
  }
}

describe('productionMapGraph keys', () => {
  it('materialKey and parseMaterialKey round-trip', () => {
    const k = materialKey('item', 'iron-plate')
    expect(k).toBe('item:iron-plate')
    expect(parseMaterialKey(k)).toEqual({ type: 'item', name: 'iron-plate' })
    expect(parseMaterialKey('fluid:water')).toEqual({ type: 'fluid', name: 'water' })
  })

  it('recipeNodeId and parseNodeId', () => {
    expect(recipeNodeId('smelt')).toBe('recipe:smelt')
    expect(parseNodeId('recipe:smelt')).toEqual({ kind: 'recipe', name: 'smelt' })
    expect(parseNodeId('item:x')).toEqual({ kind: 'material', type: 'item', name: 'x' })
  })
})

describe('pruneDescendantTreePaths', () => {
  it('removes path and descendants', () => {
    const s = new Set([
      '__pm_root__',
      '__pm_root__/r0000',
      '__pm_root__/r0000/0001',
      '__pm_root__/r0001'
    ])
    pruneDescendantTreePaths(s, '__pm_root__/r0000')
    expect(s.has('__pm_root__/r0000')).toBe(false)
    expect(s.has('__pm_root__/r0000/0001')).toBe(false)
    expect(s.has('__pm_root__')).toBe(true)
    expect(s.has('__pm_root__/r0001')).toBe(true)
  })
})

describe('recipesConsumingMaterial', () => {
  it('finds recipes by item ingredient', () => {
    const rs = recipesConsumingMaterial(tinyData, 'item', 'iron-plate', null)
    expect(rs.map(r => r.name)).toEqual(['consume-plate'])
  })
})

describe('recipesProducingMaterial', () => {
  it('finds recipes by item result type', () => {
    const rs = recipesProducingMaterial(tinyData, 'item', 'iron-plate', null)
    expect(rs.map(r => r.name).sort()).toEqual(['alt', 'merge', 'smelt'])
  })

  it('finds recipes by fluid result', () => {
    const rs = recipesProducingMaterial(tinyData, 'fluid', 'water', null)
    expect(rs.map(r => r.name)).toEqual(['chem'])
  })
})

describe('materialIngredientsForRecipe', () => {
  it('returns item and fluid ingredients', () => {
    const ings = materialIngredientsForRecipe(tinyData, 'chem', null)
    expect(ings).toEqual([
      { type: 'fluid', name: 'water' },
      { type: 'item', name: 'copper' }
    ])
  })
})

describe('materialResultsForRecipe', () => {
  it('returns item and fluid products', () => {
    expect(materialResultsForRecipe(tinyData, 'smelt', null)).toEqual([
      { type: 'item', name: 'iron-plate' }
    ])
    expect(materialResultsForRecipe(tinyData, 'chem', null)).toEqual([
      { type: 'fluid', name: 'water' }
    ])
  })
})

/** Smelt is index 2 among producers alt, merge, smelt (r0000, r0001, r0002). */
const PATH_SMELT = `${PM_TREE_ROOT_ID}/r0002`

describe('buildProductionTreeGraph', () => {
  it('includes only root when root not expanded', () => {
    const { nodes, edges } = buildProductionTreeGraph(
      tinyData,
      'item',
      'iron-plate',
      new Set(),
      {}
    )
    expect(nodes.size).toBe(1)
    expect(nodes.has(PM_TREE_ROOT_ID)).toBe(true)
    expect(edges.length).toBe(0)
  })

  it('adds producers when root expanded', () => {
    const { nodes, edges } = buildProductionTreeGraph(
      tinyData,
      'item',
      'iron-plate',
      new Set([PM_TREE_ROOT_ID]),
      {}
    )
    expect(nodes.get(PATH_SMELT)?.name).toBe('smelt')
    expect(edges).toEqual(
      expect.arrayContaining([
        { from: `${PM_TREE_ROOT_ID}/r0000`, to: PM_TREE_ROOT_ID, kind: 'tree' },
        { from: `${PM_TREE_ROOT_ID}/r0001`, to: PM_TREE_ROOT_ID, kind: 'tree' },
        { from: PATH_SMELT, to: PM_TREE_ROOT_ID, kind: 'tree' },
        { from: PM_TREE_ROOT_ID, to: `${PM_TREE_ROOT_ID}/l0000`, kind: 'tree' }
      ])
    )
    expect(nodes.get(`${PM_TREE_ROOT_ID}/l0000`)?.name).toBe('consume-plate')
  })

  it('adds ingredients when recipe path expanded', () => {
    const { nodes, edges } = buildProductionTreeGraph(
      tinyData,
      'item',
      'iron-plate',
      new Set([PM_TREE_ROOT_ID, PATH_SMELT]),
      {}
    )
    const orePath = `${PATH_SMELT}/0000`
    expect(nodes.get(orePath)?.name).toBe('iron-ore')
    expect(edges).toContainEqual({ from: orePath, to: PATH_SMELT, kind: 'tree' })
  })

  it('creates separate material instances on different branches', () => {
    const pathMerge = `${PM_TREE_ROOT_ID}/r0001`
    const { nodes } = buildProductionTreeGraph(
      tinyData,
      'item',
      'iron-plate',
      new Set([PM_TREE_ROOT_ID, PATH_SMELT, pathMerge]),
      {}
    )
    const oreViaSmelt = `${PATH_SMELT}/0000`
    /** Merge lists iron-ore before copper in ingredient order. */
    const oreViaMerge = `${pathMerge}/0000`
    expect(nodes.get(oreViaSmelt)?.prototypeKey).toBe('item:iron-ore')
    expect(nodes.get(oreViaMerge)?.prototypeKey).toBe('item:iron-ore')
    expect(oreViaSmelt).not.toBe(oreViaMerge)
  })

  it('respects visibility filter for recipes', () => {
    const vis = {
      isObjectVisible(type, name) {
        if (type === 'recipe' && name === 'alt') return false
        return true
      }
    }
    const { nodes } = buildProductionTreeGraph(
      tinyData,
      'item',
      'iron-plate',
      new Set([PM_TREE_ROOT_ID]),
      { visibilityFilter: vis }
    )
    expect(nodes.get(`${PM_TREE_ROOT_ID}/r0000`)?.name).toBe('merge')
    expect([...nodes.values()].some(n => n.kind === 'recipe' && n.name === 'alt')).toBe(false)
  })

  it('truncates when maxNodes exceeded', () => {
    const { truncated, nodes } = buildProductionTreeGraph(
      tinyData,
      'item',
      'iron-plate',
      new Set([PM_TREE_ROOT_ID]),
      { maxNodes: 2 }
    )
    expect(truncated).toBe(true)
    expect(nodes.size).toBeLessThanOrEqual(2)
  })

  it('rootBranchFilter right adds only producers at material root', () => {
    const { nodes } = buildProductionTreeGraph(
      tinyData,
      'item',
      'iron-plate',
      new Set([PM_TREE_ROOT_ID]),
      { rootBranchFilter: 'right' }
    )
    expect(nodes.get(PATH_SMELT)?.name).toBe('smelt')
    expect([...nodes.keys()].some(k => k.includes('/l'))).toBe(false)
    expect(nodes.has(`${PM_TREE_ROOT_ID}/l0000`)).toBe(false)
  })

  it('rootBranchFilter left adds only consumers at material root', () => {
    const { nodes } = buildProductionTreeGraph(
      tinyData,
      'item',
      'iron-plate',
      new Set([PM_TREE_ROOT_ID]),
      { rootBranchFilter: 'left' }
    )
    expect(nodes.get(`${PM_TREE_ROOT_ID}/l0000`)?.name).toBe('consume-plate')
    expect([...nodes.keys()].some(k => k.includes('/r'))).toBe(false)
  })
})

describe('parentTreePath', () => {
  it('returns parent segment', () => {
    expect(parentTreePath(`${PM_TREE_ROOT_ID}/r0000/0001`)).toBe(`${PM_TREE_ROOT_ID}/r0000`)
    expect(parentTreePath(`${PM_TREE_ROOT_ID}/r0000`)).toBe(PM_TREE_ROOT_ID)
    expect(parentTreePath(`${PM_TREE_ROOT_ID}/l0000/0000`)).toBe(`${PM_TREE_ROOT_ID}/l0000`)
    expect(parentTreePath(PM_TREE_ROOT_ID)).toBe(null)
  })
})

describe('expandedPathsForSpineTerminal', () => {
  it('is root only when terminal is focus', () => {
    expect([...expandedPathsForSpineTerminal(PM_TREE_ROOT_ID)].sort()).toEqual([PM_TREE_ROOT_ID])
  })

  it('includes each prefix path from root to terminal', () => {
    const terminal = `${PM_TREE_ROOT_ID}/r0000/0001`
    const s = expandedPathsForSpineTerminal(terminal)
    expect(s.size).toBe(3)
    expect(s.has(PM_TREE_ROOT_ID)).toBe(true)
    expect(s.has(`${PM_TREE_ROOT_ID}/r0000`)).toBe(true)
    expect(s.has(terminal)).toBe(true)
  })
})

describe('clampTreePathToExisting', () => {
  it('walks up until a node exists', () => {
    const nodes = new Map([[PM_TREE_ROOT_ID, {}], [`${PM_TREE_ROOT_ID}/r0000`, {}]])
    expect(clampTreePathToExisting(nodes, `${PM_TREE_ROOT_ID}/r0000/missing`)).toBe(
      `${PM_TREE_ROOT_ID}/r0000`
    )
  })
})

describe('spinePathIdsForTerminal', () => {
  it('collects ancestors to root', () => {
    const nodes = new Map([
      [PM_TREE_ROOT_ID, { parentInstanceId: null }],
      ['a', { parentInstanceId: PM_TREE_ROOT_ID }],
      ['b', { parentInstanceId: 'a' }]
    ])
    const s = spinePathIdsForTerminal(nodes, 'b')
    expect([...s].sort()).toEqual([PM_TREE_ROOT_ID, 'a', 'b'].sort())
  })
})

describe('markRepeatMaterialNodes', () => {
  it('flags a material when the same prototypeKey appears at a greater depth later', () => {
    const nodes = new Map([
      [PM_TREE_ROOT_ID, { kind: 'material', prototypeKey: 'item:root', layoutDepth: 0 }],
      ['m1', { kind: 'material', prototypeKey: 'item:x', layoutDepth: 1 }],
      ['m2', { kind: 'material', prototypeKey: 'item:x', layoutDepth: 3 }]
    ])
    markRepeatMaterialNodes(nodes)
    expect(nodes.get('m1').isRepeatPrototype).toBeUndefined()
    expect(nodes.get('m2').isRepeatPrototype).toBe(true)
    expect(nodes.get('m2').repeatEarlierDepth).toBe(1)
  })

  it('does not flag two instances at the same depth only', () => {
    const nodes = new Map([
      [PM_TREE_ROOT_ID, { kind: 'material', prototypeKey: 'item:r', layoutDepth: 0 }],
      ['a', { kind: 'material', prototypeKey: 'item:x', layoutDepth: 2 }],
      ['b', { kind: 'material', prototypeKey: 'item:x', layoutDepth: 2 }]
    ])
    markRepeatMaterialNodes(nodes)
    expect(nodes.get('a').isRepeatPrototype).toBeUndefined()
    expect(nodes.get('b').isRepeatPrototype).toBeUndefined()
  })
})

describe('expandable helpers', () => {
  it('materialHasExpandableRecipes', () => {
    expect(materialHasExpandableRecipes(tinyData, 'item:iron-plate', null)).toBe(true)
    expect(materialHasExpandableRecipes(tinyData, 'item:iron-ore', null)).toBe(false)
  })

  it('materialHasExpandableConsumers', () => {
    expect(materialHasExpandableConsumers(tinyData, 'item:iron-plate', null)).toBe(true)
    expect(materialHasExpandableConsumers(tinyData, 'item:not-in-any-ingredient', null)).toBe(false)
  })

  it('recipeHasExpandableIngredients', () => {
    expect(recipeHasExpandableIngredients(tinyData, 'smelt', null)).toBe(true)
    expect(recipeHasExpandableIngredients(tinyData, 'missing', null)).toBe(false)
  })

  it('recipeHasExpandableProducts', () => {
    expect(recipeHasExpandableProducts(tinyData, 'smelt', null)).toBe(true)
    expect(recipeHasExpandableProducts(tinyData, 'missing', null)).toBe(false)
  })
})

describe('buildProductionTreeGraph recipe focus', () => {
  it('roots at recipe with layout depth 0 when alone', () => {
    const { nodes, edges } = buildProductionTreeGraph(tinyData, 'recipe', 'smelt', new Set(), {})
    expect(nodes.size).toBe(1)
    const r = nodes.get(PM_TREE_ROOT_ID)
    expect(r?.kind).toBe('recipe')
    expect(r?.name).toBe('smelt')
    expect(r?.layoutDepth).toBe(0)
    expect(edges.length).toBe(0)
  })

  it('adds products left and ingredients right when recipe root expanded', () => {
    const { nodes, edges } = buildProductionTreeGraph(
      tinyData,
      'recipe',
      'merge',
      new Set([PM_TREE_ROOT_ID]),
      {}
    )
    const prodPlate = `${PM_TREE_ROOT_ID}/l0000`
    /** Ingredient order follows recipe definition (not sorted). */
    const ingOre = `${PM_TREE_ROOT_ID}/r0000`
    const ingCu = `${PM_TREE_ROOT_ID}/r0001`
    expect(nodes.get(prodPlate)?.name).toBe('iron-plate')
    expect(nodes.get(prodPlate)?.layoutDepth).toBe(-1)
    expect(nodes.get(ingOre)?.name).toBe('iron-ore')
    expect(nodes.get(ingCu)?.name).toBe('copper')
    expect(nodes.get(ingOre)?.layoutDepth).toBe(1)
    expect(edges).toContainEqual({ from: PM_TREE_ROOT_ID, to: prodPlate, kind: 'tree' })
    expect(edges).toContainEqual({ from: ingOre, to: PM_TREE_ROOT_ID, kind: 'tree' })
  })

  it('rootBranchFilter right adds only ingredients at recipe root', () => {
    const { nodes, edges } = buildProductionTreeGraph(
      tinyData,
      'recipe',
      'merge',
      new Set([PM_TREE_ROOT_ID]),
      { rootBranchFilter: 'right' }
    )
    expect(nodes.has(`${PM_TREE_ROOT_ID}/r0000`)).toBe(true)
    expect(nodes.has(`${PM_TREE_ROOT_ID}/l0000`)).toBe(false)
    expect(edges.some(e => e.to === `${PM_TREE_ROOT_ID}/l0000`)).toBe(false)
  })

  it('rootBranchFilter left adds only products at recipe root', () => {
    const { nodes } = buildProductionTreeGraph(
      tinyData,
      'recipe',
      'merge',
      new Set([PM_TREE_ROOT_ID]),
      { rootBranchFilter: 'left' }
    )
    expect(nodes.get(`${PM_TREE_ROOT_ID}/l0000`)?.name).toBe('iron-plate')
    expect([...nodes.keys()].some(k => k.includes('/r'))).toBe(false)
  })
})
