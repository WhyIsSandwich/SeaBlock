import { describe, expect, it } from 'vitest'

import { useUnifiedObjects } from '../useUnifiedObjects.js'

describe('useUnifiedObjects.createUnifiedObjectByKey', () => {
  it('does not merge hidden same-name prototypes into visible unified items', () => {
    const { createUnifiedObjectByKey } = useUnifiedObjects()
    const factorioData = {
      item: {
        pistol: {
          type: 'gun',
          name: 'pistol',
          subgroup: 'gun',
          group: 'combat',
          displayName: 'Pistol'
        }
      },
      recipe: {
        pistol: {
          type: 'recipe',
          name: 'pistol',
          hidden: true,
          displayName: 'Hidden pistol recipe',
          main_product: 'pistol',
          results: [{ name: 'pistol' }]
        }
      },
      entity: {},
      fluid: {},
      tile: {},
      equipment: {},
      'item-subgroup': {},
      'item-group': {}
    }

    const unified = createUnifiedObjectByKey('pistol', factorioData)
    const pistolItem = unified.find(entry => entry.source === 'item')

    expect(pistolItem).toBeDefined()
    expect(pistolItem.types).toEqual(['item'])
    expect(pistolItem.recipe).toBeUndefined()
  })

  it('does not override recipe subgroup/order when main_product is not set', () => {
    const { createUnifiedObjectByKey } = useUnifiedObjects()
    const factorioData = {
      item: {
        steel: {
          type: 'item',
          name: 'steel',
          subgroup: 'metals',
          order: 'a-2',
          displayName: 'Steel'
        }
      },
      recipe: {
        'steel-smelting': {
          type: 'recipe',
          name: 'steel-smelting',
          subgroup: 'intermediate',
          order: 'z-9',
          displayName: 'Steel Smelting',
          results: [{ name: 'steel' }]
        }
      },
      entity: {},
      fluid: {},
      tile: {},
      equipment: {},
      'item-subgroup': {},
      'item-group': {}
    }

    const unified = createUnifiedObjectByKey('steel-smelting', factorioData)
    const recipeObject = unified.find(entry => entry.source === 'recipe')

    expect(recipeObject).toBeDefined()
    expect(recipeObject.subgroup).toBe('intermediate')
    expect(recipeObject.order).toBe('z-9')
  })

  it('inherits subgroup from main_product when recipe subgroup is missing', () => {
    const { createUnifiedObjectByKey } = useUnifiedObjects()
    const factorioData = {
      item: {
        'copper-cable': {
          type: 'item',
          name: 'copper-cable',
          subgroup: 'wires',
          order: 'b-1',
          displayName: 'Copper Cable'
        }
      },
      recipe: {
        'cable-alt': {
          type: 'recipe',
          name: 'cable-alt',
          subgroup: undefined,
          order: 'z-2',
          displayName: 'Cable Alt',
          main_product: 'copper-cable',
          results: [{ name: 'copper-cable' }, { name: 'stone' }]
        }
      },
      entity: {},
      fluid: {},
      tile: {},
      equipment: {},
      'item-subgroup': {},
      'item-group': {}
    }

    const unified = createUnifiedObjectByKey('cable-alt', factorioData)
    const recipeObject = unified.find(entry => entry.source === 'recipe')

    expect(recipeObject).toBeDefined()
    expect(recipeObject.subgroup).toBe('wires')
    expect(recipeObject.order).toBe('z-2')
  })

  it('inherits subgroup from single result when recipe subgroup is missing', () => {
    const { createUnifiedObjectByKey } = useUnifiedObjects()
    const factorioData = {
      item: {
        sulfur: {
          type: 'item',
          name: 'sulfur',
          subgroup: 'chemicals',
          order: 'c-1',
          displayName: 'Sulfur'
        }
      },
      recipe: {
        'sulfur-from-gas': {
          type: 'recipe',
          name: 'sulfur-from-gas',
          subgroup: undefined,
          order: 'r-1',
          displayName: 'Sulfur from gas',
          results: [{ type: 'item', name: 'sulfur' }]
        }
      },
      entity: {},
      fluid: {},
      tile: {},
      equipment: {},
      'item-subgroup': {},
      'item-group': {}
    }

    const unified = createUnifiedObjectByKey('sulfur-from-gas', factorioData)
    const recipeObject = unified.find(entry => entry.source === 'recipe')

    expect(recipeObject).toBeDefined()
    expect(recipeObject.subgroup).toBe('chemicals')
    expect(recipeObject.order).toBe('r-1')
  })
})
