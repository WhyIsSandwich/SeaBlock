import { afterEach, describe, expect, it, vi } from 'vitest'

import { TooltipGenerator } from '../generate-tooltips.js'
import { useUnifiedObjects } from '../../src/composables/useUnifiedObjects.js'

function createPrototypeData() {
  return {
    item: {
      assembler: {
        name: 'assembler',
        displayName: 'Assembler Item',
        description: 'Item description',
        subgroup: 'production',
        order: 'a',
        place_result: 'assembler'
      }
    },
    entity: {
      assembler: {
        name: 'assembler',
        displayName: 'Assembler Entity',
        description: 'Entity description',
        subgroup: 'production',
        order: 'a',
        minable: { results: [{ name: 'assembler' }] }
      }
    },
    recipe: {
      assembler: {
        name: 'assembler',
        displayName: 'Assembler Recipe',
        description: 'Recipe description',
        subgroup: 'production',
        order: 'a',
        results: [{ name: 'assembler' }]
      }
    },
    fluid: {},
    tile: {},
    equipment: {},
    'item-group': {},
    'item-subgroup': {}
  }
}

describe('TooltipGenerator', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps tooltip entries with content even when title equals prototype name', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const generator = new TooltipGenerator()
    generator.tooltips = {
      item: {
        'iron-plate': {
          title: 'iron-plate',
          statistics: [{ label: 'Stack size', value: '100' }]
        }
      }
    }

    generator.cleanTooltipData()

    expect(generator.tooltips.item['iron-plate']).toBeDefined()
  })

  it('uses runtime-equivalent unified object typing when creating tooltip objects', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const generator = new TooltipGenerator()
    generator.localeData = {
      item: { assembler: { n: 'Assembler Item', d: 'Item description' } },
      entity: { assembler: { n: 'Assembler Entity', d: 'Entity description' } },
      recipe: { assembler: { n: 'Assembler Recipe', d: 'Recipe description' } }
    }

    const prototypeData = createPrototypeData()
    const result = generator.createUnifiedObject('entity', 'assembler', prototypeData)

    const runtimeObjects = useUnifiedObjects().createUnifiedObjectByKey('assembler', prototypeData)
    const runtimeEquivalent = runtimeObjects.find(object => object.types.includes('entity'))

    expect(result).toBeDefined()
    expect(runtimeEquivalent).toBeDefined()
    expect([...result.types].sort()).toEqual([...runtimeEquivalent.types].sort())
  })
})
