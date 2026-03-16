import { describe, expect, it } from 'vitest'

import { postProcessFactorioData } from '../factorioDataPostProcessing.js'

describe('postProcessFactorioData', () => {
  it('does not remove visible prototypes that share a name with hidden prototypes in other types', () => {
    const factorioData = {
      item: {
        pistol: { type: 'gun', name: 'pistol' },
        grenade: { type: 'capsule', name: 'grenade' }
      },
      recipe: {
        pistol: { type: 'recipe', name: 'pistol', hidden: true },
        grenade: { type: 'recipe', name: 'grenade' }
      },
      entity: {
        grenade: { type: 'projectile', name: 'grenade', hidden: true }
      }
    }

    const processed = postProcessFactorioData(factorioData, { excludeHiddenFromFactorioData: true })

    expect(processed.item.pistol).toBeDefined()
    expect(processed.item.grenade).toBeDefined()
    expect(processed.recipe.grenade).toBeDefined()
    expect(processed.recipe.pistol).toBeUndefined()
    expect(processed.entity.grenade).toBeUndefined()
  })

  it('returns the same reference when filtering is disabled', () => {
    const factorioData = { item: { pistol: { type: 'gun', name: 'pistol' } } }

    const processed = postProcessFactorioData(factorioData, { excludeHiddenFromFactorioData: false })

    expect(processed).toBe(factorioData)
  })
})
