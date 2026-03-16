import fs from 'fs'
import path from 'path'

import { describe, it, expect, beforeAll } from 'vitest'

import {
  parseAttackParameters,
  parseCapsuleAction,
  parseGenericItemEffect
} from '../useAttackParametersParser.js'

describe('useAttackParametersParser', () => {
  let factorioData = null
  let context = null

  beforeAll(async () => {
    // Load organized data using relative path from project root
    const dataPath = path.join(process.cwd(), 'generated/data/dev/data.json')
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

    const { useFactorioPrototypeMapping } = await import('../useFactorioPrototypeMapping.js')
    const { subtypeToBaseType } = useFactorioPrototypeMapping()

    factorioData = {}

    for (const [prototypeType, prototypes] of Object.entries(rawData)) {
      const baseType = subtypeToBaseType[prototypeType]

      if (!baseType) {
        console.warn(`No base type found for ${prototypeType}`)
        continue
      }

      if (!factorioData[baseType]) {
        factorioData[baseType] = {}
      }

      Object.assign(factorioData[baseType], prototypes)
    }

    context = { factorioData }
  })

  describe('Flamethrower Turret', () => {
    it('should parse flamethrower attack parameters correctly', () => {
      const entity = factorioData.entity['flamethrower-turret']
      expect(entity).toBeDefined()
      expect(entity.attack_parameters).toBeDefined()

      const effects = parseAttackParameters(entity.attack_parameters, context, false)

      // Should have statistics
      expect(effects.statistics).toBeDefined()
      expect(effects.statistics.length).toBeGreaterThan(0)

      // Should have area of effect
      const areaEffect = effects.statistics.find(s => s.label === 'Area of effect size')
      expect(areaEffect).toBeDefined()
      expect(areaEffect.value).toBe(2.5)

      // Should have creates fire
      const createsFire = effects.statistics.find(s => s.label === 'Creates: 1 x Fire')
      expect(createsFire).toBeDefined()
      expect(createsFire.children).toBeDefined()
      expect(createsFire.children.length).toBeGreaterThan(0)
    })
  })

  describe('Laser Turret', () => {
    it('should parse laser turret attack parameters correctly', () => {
      const entity = factorioData.entity['laser-turret']
      expect(entity).toBeDefined()
      expect(entity.attack_parameters).toBeDefined()

      const effects = parseAttackParameters(entity.attack_parameters, context, false)

      // Should have statistics
      expect(effects.statistics).toBeDefined()
      expect(effects.statistics.length).toBeGreaterThan(0)

      // Should have damage with correct value
      const damageEffect = effects.statistics.find(s => s.label === 'Damage')
      expect(damageEffect).toBeDefined()
      expect(damageEffect.value).toBe('20/laser')
    })
  })


  describe('Big Spitter', () => {
    it('should parse big spitter attack parameters correctly', () => {
      const entity = factorioData.entity['big-spitter']
      expect(entity).toBeDefined()
      expect(entity.attack_parameters).toBeDefined()
      expect(entity.attack_parameters.damage_modifier).toBeGreaterThan(0)

      const effects = parseAttackParameters(entity.attack_parameters, context, false)


      // Should have area of effect with damage
      const areaEffect = effects.statistics.find(s => s.label === 'Area of effect size')
      expect(areaEffect).toBeDefined()
      expect(Number(areaEffect.value)).toBeGreaterThan(0)

      const areaDamage = areaEffect.children.find(c => c.label === 'Damage')
      expect(areaDamage).toBeDefined()
      expect(areaDamage.value).toMatch(/\/acid$/)

      const createsEffect = effects.statistics.find(s => s.label === 'Creates: 1 x Acid splash')
      expect(createsEffect).toBeDefined()
    })
  })

  describe('Capsule Actions', () => {
    it('should parse grenade capsule attack parameters', () => {
      const { grenade } = factorioData.item
      expect(grenade).toBeDefined()
      expect(grenade.capsule_action).toBeDefined()

      const parsed = parseCapsuleAction(grenade.capsule_action, context)
      expect(parsed).toBeDefined()
      expect(parsed.statistics).toBeDefined()
      expect(parsed.statistics.length).toBeGreaterThan(0)

      const hasCombatEffect = parsed.statistics.some(
        s => s.label === 'Damage' || s.label === 'Area of effect size' || s.label.startsWith('Creates: 1 x')
      )
      expect(hasCombatEffect).toBe(true)
    })
  })

  describe('Generic Item Effects', () => {
    it('should normalize module effect object', () => {
      const moduleItem = factorioData.item['speed-module']
      expect(moduleItem).toBeDefined()
      expect(moduleItem.effect).toBeDefined()

      const parsed = parseGenericItemEffect(moduleItem.effect)
      expect(parsed).toBeDefined()
      expect(parsed.statistics?.length).toBeGreaterThan(0)
      const speed = parsed.statistics.find(s => s.label === 'Speed')
      expect(speed).toBeDefined()
    })
  })

})
