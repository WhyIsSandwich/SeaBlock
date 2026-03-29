import { describe, expect, it } from 'vitest'

import {
  allowedModuleCategoriesSetForEntity,
  getCompatibleModuleItemsForEntity,
  modulePrototypeAllowedByCategories
} from './compatibleModulesForEntity.js'

const mockItems = {
  'speed-module': {
    name: 'speed-module',
    displayName: 'Speed module',
    type: 'module',
    category: 'speed',
    effect: { speed: 0.2, consumption: 0.5 }
  },
  'efficiency-module': {
    name: 'efficiency-module',
    displayName: 'Efficiency module',
    type: 'module',
    category: 'efficiency',
    effect: { consumption: -0.3 }
  },
  'productivity-module': {
    name: 'productivity-module',
    displayName: 'Productivity module',
    type: 'module',
    category: 'productivity',
    effect: { productivity: 0.04, consumption: 0.4, speed: -0.1 }
  },
  'iron-plate': { name: 'iron-plate', type: 'item' }
}

describe('compatibleModulesForEntity', () => {
  it('allowedModuleCategoriesSetForEntity returns null when absent or empty (unrestricted)', () => {
    expect(allowedModuleCategoriesSetForEntity({})).toBeNull()
    expect(allowedModuleCategoriesSetForEntity({ allowed_module_categories: [] })).toBeNull()
  })

  it('allowedModuleCategoriesSetForEntity builds set from list', () => {
    const s = allowedModuleCategoriesSetForEntity({
      allowed_module_categories: ['Speed', 'efficiency']
    })
    expect(s?.has('speed')).toBe(true)
    expect(s?.has('efficiency')).toBe(true)
  })

  it('modulePrototypeAllowedByCategories checks module.category only', () => {
    const two = new Set(['speed', 'efficiency'])
    expect(modulePrototypeAllowedByCategories(mockItems['speed-module'], two)).toBe(true)
    expect(modulePrototypeAllowedByCategories(mockItems['productivity-module'], two)).toBe(false)
    expect(modulePrototypeAllowedByCategories(mockItems['speed-module'], null)).toBe(true)
  })

  it('ignores allowed_effects — only allowed_module_categories matters', () => {
    const entity = {
      allowed_effects: ['consumption', 'speed', 'pollution'],
      allowed_module_categories: ['productivity', 'speed', 'efficiency', 'god']
    }
    const list = getCompatibleModuleItemsForEntity(entity, { item: mockItems })
    expect(list.map(x => x.name)).toEqual(['efficiency-module', 'productivity-module', 'speed-module'])
  })

  it('getCompatibleModuleItemsForEntity unrestricted when no category list (e.g. beacon-shaped)', () => {
    const entity = { module_slots: 2 }
    const list = getCompatibleModuleItemsForEntity(entity, { item: mockItems })
    expect(list.map(x => x.name)).toEqual([
      'efficiency-module',
      'productivity-module',
      'speed-module'
    ])
  })

  it('sorts by displayName when it differs from internal name order', () => {
    const items = {
      'mod-a': {
        name: 'mod-a',
        displayName: 'Zebra module',
        type: 'module',
        category: 'speed'
      },
      'mod-b': {
        name: 'mod-b',
        displayName: 'Alpha module',
        type: 'module',
        category: 'speed'
      }
    }
    const list = getCompatibleModuleItemsForEntity(
      { allowed_module_categories: ['speed'] },
      { item: items }
    )
    expect(list.map(x => x.name)).toEqual(['mod-b', 'mod-a'])
  })

  it('restricts to explicit allowed_module_categories only', () => {
    const entity = { module_slots: 2, allowed_module_categories: ['speed'] }
    const list = getCompatibleModuleItemsForEntity(entity, { item: mockItems })
    expect(list.map(x => x.name)).toEqual(['speed-module'])
  })
})
