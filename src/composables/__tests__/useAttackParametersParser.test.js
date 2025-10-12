import { describe, it, expect, beforeAll } from 'vitest'
import { parseAttackParameters } from '../useAttackParametersParser.js'
import fs from 'fs'
import path from 'path'

describe('useAttackParametersParser', () => {
  let factorioData = null
  let context = null

  beforeAll(async () => {
    // Load organized data using relative path from project root
    const dataPath = path.join(process.cwd(), 'docs/public/data/data.json')
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
      expect(areaEffect.children).toBeDefined()
      expect(areaEffect.children.length).toBeGreaterThan(0)

      // Should have applies effect
      const appliesEffect = effects.statistics.find(s => s.label === 'Applies effect')
      expect(appliesEffect).toBeDefined()
      expect(appliesEffect.children).toBeDefined()
      expect(appliesEffect.children.length).toBeGreaterThan(0)

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
      expect(entity.attack_parameters.damage_modifier).toBe(36)

      const effects = parseAttackParameters(entity.attack_parameters, context, false)


      // Should have area of effect with correct damage (36/acid)
      const areaEffect = effects.statistics.find(s => s.label === 'Area of effect size')
      expect(areaEffect).toBeDefined()
      expect(areaEffect.value).toBe(1.35)

      const areaDamage = areaEffect.children.find(c => c.label === 'Damage')
      expect(areaDamage).toBeDefined()
      expect(areaDamage.value).toBe('36/acid')

      const createsEffect = effects.statistics.find(s => s.label === 'Creates: 1 x Acid splash')
      expect(createsEffect).toBeDefined()

      const createsDamage = createsEffect.children.find(c => c.label === 'Damage')
      expect(createsDamage).toBeDefined()
      expect(createsDamage.value).toBe('130s/acid')

      // Should have applies effect with correct damage (43.2/acid)
      const appliesEffect = createsEffect.children.find(s => s.label === 'Applies effect')
      expect(appliesEffect).toBeDefined()

      const appliesDamage = appliesEffect.children.find(c => c.label === 'Damage')
      expect(appliesDamage).toBeDefined()
      expect(appliesDamage.value).toMatch(/43\.\d+\/acid/)
    })
  })

})
