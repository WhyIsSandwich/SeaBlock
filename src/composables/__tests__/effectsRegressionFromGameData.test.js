import fs from 'fs'
import path from 'path'

import { beforeAll, describe, expect, it } from 'vitest'

import { useDetailsData } from '../useDetailsData.js'
import { useFactorioPrototypeMapping } from '../useFactorioPrototypeMapping.js'

function toArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function prettyType(typeValue) {
  if (!typeValue) return ''
  const withoutPrefix = String(typeValue).replace(/^bob-/, '')
  return withoutPrefix
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeValue(rawValue) {
  const value = String(rawValue)
  if (value.includes('/s/')) {
    const [amount, type] = value.split('/s/')
    return `${amount}/s ${prettyType(type)}`
  }
  if (value.includes('/')) {
    const [amount, type] = value.split('/')
    return `${amount} ${prettyType(type)}`
  }
  return value.replace('1 seconds', '1 second').replace('seconds', 'Seconds')
}

function flattenStatistics(statistics, depth = 0, lines = []) {
  const prefix = depth === 0 ? '' : depth === 1 ? ' - ' : ' --'
  for (const stat of toArray(statistics)) {
    if (stat.value !== undefined) {
      lines.push(`${prefix}${stat.label}: ${normalizeValue(stat.value)}`)
    } else {
      lines.push(`${prefix}${stat.label}`)
    }
    flattenStatistics(stat.children, depth + 1, lines)
  }
  return lines
}

describe('effects regression from game data', () => {
  let factorioData
  let getDetailsData

  beforeAll(() => {
    const dataPath = path.join(process.cwd(), 'docs/public/data/data.json')
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const { subtypeToBaseType } = useFactorioPrototypeMapping()

    factorioData = {}
    for (const [prototypeType, prototypes] of Object.entries(rawData)) {
      const baseType = subtypeToBaseType[prototypeType]
      if (!baseType) continue
      if (!factorioData[baseType]) factorioData[baseType] = {}
      Object.assign(factorioData[baseType], prototypes)
    }
    const { getDetailsData: detailsGetter } = useDetailsData()
    getDetailsData = detailsGetter
  })

  function effectLinesForPrototype(baseType, prototypeName) {
    const prototype = factorioData[baseType]?.[prototypeName]
    expect(prototype, `Missing prototype: ${baseType}.${prototypeName}`).toBeDefined()

    const unifiedObject = {
      [baseType]: prototype,
      displayName: prototype.displayName,
      description: prototype.description
    }
    const details = getDetailsData([baseType], unifiedObject, false, factorioData, {
      excludeHiddenFromFactorioData: true
    })
    const effectSection = details.sections.find(
      section => section.type === 'effect' || section.label === 'Effect'
    )
    expect(effectSection?.statistics?.length, `No effect stats for ${prototypeName}`).toBeGreaterThan(0)
    return flattenStatistics(effectSection.statistics)
  }

  const cases = [
    {
      baseType: 'equipment',
      name: 'personal-laser-defense-equipment',
      expectedLines: ['Damage: 20 Laser']
    },
    {
      baseType: 'item',
      name: 'piercing-rounds-magazine',
      expectedLines: ['Damage: 8 Physical', 'Damage: 2 Pierce']
    },
    {
      baseType: 'entity',
      name: 'laser-turret',
      expectedLines: ['Damage: 20 Laser']
    },
    {
      baseType: 'entity',
      name: 'bob-plasma-turret-1',
      expectedLines: [
        'Projectile range: 100',
        'Area of effect size: 8',
        ' - Damage: 180 Plasma',
        ' - Damage: 108 Electric',
        ' - Damage: 72 Explosion'
      ]
    },
    {
      baseType: 'entity',
      name: 'bob-small-electric-spitter',
      expectedLines: [
        'Creates: 1 x Electrolytic bile splash',
        ' - Lifetime: 15 Seconds',
        ' - Applies effect',
        ' --Duration: 1 second',
        ' --Movement speed: 10.0%',
        ' --Vehicle Speed: 10.0%',
        ' - Damage: 18/s Electric',
        ' - Area of effect size: 3',
        'Area of effect size: 1',
        ' - Damage: 12 Electric'
      ]
    },
    {
      baseType: 'entity',
      name: 'bob-small-electric-worm-turret',
      expectedLines: [
        'Creates: 1 x Electrolytic bile splash',
        ' - Lifetime: 15 Seconds',
        ' - Applies effect',
        ' --Duration: 1 second',
        ' --Movement speed: 10.0%',
        ' --Vehicle Speed: 10.0%',
        ' - Damage: 27/s Electric',
        ' - Area of effect size: 3',
        'Area of effect size: 1.4',
        ' - Damage: 18 Electric'
      ]
    }
  ]

  for (const regressionCase of cases) {
    it(`matches expected effects for ${regressionCase.name}`, () => {
      const lines = effectLinesForPrototype(regressionCase.baseType, regressionCase.name)
      for (const expectedLine of regressionCase.expectedLines) {
        expect(lines).toContain(expectedLine)
      }
    })
  }
})
