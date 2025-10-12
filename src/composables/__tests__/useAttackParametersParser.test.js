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

  describe('Medium Spitter', () => {
    it('should parse medium spitter attack parameters correctly', () => {
      const entity = factorioData.entity['medium-spitter']
      expect(entity).toBeDefined()
      expect(entity.attack_parameters).toBeDefined()
      expect(entity.attack_parameters.damage_modifier).toBe(24)

      const effects = parseAttackParameters(entity.attack_parameters, context, false)

      // Should have statistics
      expect(effects.statistics).toBeDefined()
      expect(effects.statistics.length).toBeGreaterThan(0)

      // Should have creates acid splash
      const createsAcid = effects.statistics.find(s => s.label === 'Creates: 1 x Acid splash')
      expect(createsAcid).toBeDefined()
      expect(createsAcid.children).toBeDefined()
      expect(createsAcid.children.length).toBeGreaterThan(0)

      // Should have area of effect with correct damage (24/acid)
      const areaEffect = effects.statistics.find(s => s.label === 'Area of effect size')
      expect(areaEffect).toBeDefined()
      expect(areaEffect.value).toBe(1.25)
      expect(areaEffect.children).toBeDefined()

      const areaDamage = areaEffect.children.find(c => c.label === 'Damage')
      expect(areaDamage).toBeDefined()
      expect(areaDamage.value).toBe('24/acid')

      // Should have applies effect with correct damage (28.8/acid)
      const appliesEffect = effects.statistics.find(s => s.label === 'Applies effect')
      expect(appliesEffect).toBeDefined()
      expect(appliesEffect.children).toBeDefined()

      const appliesDamage = appliesEffect.children.find(c => c.label === 'Damage')
      expect(appliesDamage).toBeDefined()
      expect(appliesDamage.value).toMatch(/28\.\d+\/acid/)
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

      // Should have applies effect with correct damage (43.2/acid)
      const appliesEffect = effects.statistics.find(s => s.label === 'Applies effect')
      expect(appliesEffect).toBeDefined()

      const appliesDamage = appliesEffect.children.find(c => c.label === 'Damage')
      expect(appliesDamage).toBeDefined()
      expect(appliesDamage.value).toMatch(/43\.\d+\/acid/)
    })
  })

  describe('Behemoth Spitter', () => {
    it('should parse behemoth spitter attack parameters correctly', () => {
      const entity = factorioData.entity['behemoth-spitter']
      expect(entity).toBeDefined()
      expect(entity.attack_parameters).toBeDefined()
      expect(entity.attack_parameters.damage_modifier).toBe(60)

      const effects = parseAttackParameters(entity.attack_parameters, context, false)

      // Should have area of effect with correct damage (60/acid)
      const areaEffect = effects.statistics.find(s => s.label === 'Area of effect size')
      expect(areaEffect).toBeDefined()
      expect(areaEffect.value).toBe(1.75)

      const areaDamage = areaEffect.children.find(c => c.label === 'Damage')
      expect(areaDamage).toBeDefined()
      expect(areaDamage.value).toBe('60/acid')

      // Should have applies effect with correct damage (72/acid)
      const appliesEffect = effects.statistics.find(s => s.label === 'Applies effect')
      expect(appliesEffect).toBeDefined()

      const appliesDamage = appliesEffect.children.find(c => c.label === 'Damage')
      expect(appliesDamage).toBeDefined()
      expect(appliesDamage.value).toBe('72/acid')
    })
  })

  describe('Damage Modifier Application', () => {
    it('should apply damage modifier correctly to nested effects', () => {
      const mediumSpitter = factorioData.entity['medium-spitter']
      const bigSpitter = factorioData.entity['big-spitter']
      const behemothSpitter = factorioData.entity['behemoth-spitter']

      const mediumEffects = parseAttackParameters(mediumSpitter.attack_parameters, context, false)
      const bigEffects = parseAttackParameters(bigSpitter.attack_parameters, context, false)
      const behemothEffects = parseAttackParameters(
        behemothSpitter.attack_parameters,
        context,
        false
      )

      // Medium spitter: damage_modifier = 24
      const mediumAreaDamage = mediumEffects.statistics
        .find(s => s.label === 'Area of effect size')
        ?.children?.find(c => c.label === 'Damage')
      expect(mediumAreaDamage?.value).toBe('24/acid')

      // Big spitter: damage_modifier = 36
      const bigAreaDamage = bigEffects.statistics
        .find(s => s.label === 'Area of effect size')
        ?.children?.find(c => c.label === 'Damage')
      expect(bigAreaDamage?.value).toBe('36/acid')

      // Behemoth spitter: damage_modifier = 60
      const behemothAreaDamage = behemothEffects.statistics
        .find(s => s.label === 'Area of effect size')
        ?.children?.find(c => c.label === 'Damage')
      expect(behemothAreaDamage?.value).toBe('60/acid')
    })
  })

  describe('Structure Validation', () => {
    it('should have consistent structure across all spitters', () => {
      const spitters = ['medium-spitter', 'big-spitter', 'behemoth-spitter']

      spitters.forEach(spitterName => {
        const entity = factorioData.entity[spitterName]
        const effects = parseAttackParameters(entity.attack_parameters, context, false)

        // All spitters should have the same structure
        const expectedLabels = ['Creates: 1 x Acid splash', 'Area of effect size', 'Applies effect']

        const actualLabels = effects.statistics.map(s => s.label)
        expectedLabels.forEach(expectedLabel => {
          expect(actualLabels).toContain(expectedLabel)
        })
      })
    })
  })
})
