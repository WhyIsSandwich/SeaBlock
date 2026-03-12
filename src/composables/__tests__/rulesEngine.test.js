import { describe, expect, it } from 'vitest'

import { applyRules } from '../useDetailsData/rulesEngine.js'

describe('rulesEngine.applyRules', () => {
  it('applies transforms and preserves raw values for statistics', () => {
    const rules = [
      {
        name: 'Efficiency',
        type: 'statistics',
        forType: 'entity',
        shownInTooltip: true,
        order: 1,
        getValue: () => 0.375,
        transform: value => `${(value * 100).toFixed(1)}%`
      }
    ]

    const results = applyRules(rules, {}, { types: ['entity'], isTooltip: true })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      label: 'Efficiency',
      value: '37.5%',
      rawValue: 0.375,
      _ruleType: 'statistics'
    })
  })

  it('sorts by rule order and normalizes values to rich-text-ready strings', () => {
    const rules = [
      {
        name: 'B',
        type: 'statistics',
        shownInTooltip: true,
        order: 20,
        getValue: () => 2
      },
      {
        name: 'A',
        type: 'statistics',
        shownInTooltip: true,
        order: 10,
        getValue: () => 1
      }
    ]

    const results = applyRules(rules, {}, { isTooltip: true })

    expect(results.map(result => result.label)).toEqual(['A', 'B'])
    expect(results.map(result => result.value)).toEqual(['1', '2'])
  })

  it('normalizes nested section statistics values', () => {
    const rules = [
      {
        name: 'Turret',
        type: 'section',
        shownInTooltip: true,
        order: 1,
        getValue: () => ({
          statistics: [{ label: 'Range', value: 18 }]
        })
      }
    ]

    const results = applyRules(rules, {}, { isTooltip: true })

    expect(results).toHaveLength(1)
    expect(results[0]._ruleType).toBe('section')
    expect(results[0].statistics[0]).toEqual({
      label: 'Range',
      value: '18'
    })
  })
})
