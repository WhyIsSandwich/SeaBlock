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
})
