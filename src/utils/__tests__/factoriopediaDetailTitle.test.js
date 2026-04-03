import { describe, expect, it } from 'vitest'

import { formatFactoriopediaDetailTitle } from '../factoriopediaDetailTitle.js'

describe('formatFactoriopediaDetailTitle', () => {
  it('returns displayName when not a recipe', () => {
    expect(
      formatFactoriopediaDetailTitle({
        displayName: 'Iron plate',
        isRecipe: false,
        recipe: null
      })
    ).toBe('Iron plate')
  })

  it('returns displayName when recipe has show_amount_in_title false', () => {
    expect(
      formatFactoriopediaDetailTitle({
        displayName: 'X',
        isRecipe: true,
        recipe: { show_amount_in_title: false, results: [{ type: 'item', name: 'a', amount: 5 }] }
      })
    ).toBe('X')
  })

  it('returns displayName when multiple results', () => {
    expect(
      formatFactoriopediaDetailTitle({
        displayName: 'Multi',
        isRecipe: true,
        recipe: {
          results: [
            { type: 'item', name: 'a', amount: 1 },
            { type: 'item', name: 'b', amount: 1 }
          ]
        }
      })
    ).toBe('Multi')
  })

  it('returns displayName when single result amount is 1', () => {
    expect(
      formatFactoriopediaDetailTitle({
        displayName: 'Smelt',
        isRecipe: true,
        recipe: { results: [{ type: 'item', name: 'plate', amount: 1 }] }
      })
    ).toBe('Smelt')
  })

  it('prefixes Nx when single result amount is not 1', () => {
    expect(
      formatFactoriopediaDetailTitle({
        displayName: 'Smelt',
        isRecipe: true,
        recipe: { results: [{ type: 'item', name: 'plate', amount: 3 }] }
      })
    ).toBe('3x Smelt')
  })

  it('treats missing amount as 1', () => {
    expect(
      formatFactoriopediaDetailTitle({
        displayName: 'R',
        isRecipe: true,
        recipe: { results: [{ type: 'item', name: 'x' }] }
      })
    ).toBe('R')
  })

  it('returns empty string for empty displayName', () => {
    expect(
      formatFactoriopediaDetailTitle({ displayName: '', isRecipe: false, recipe: null })
    ).toBe('')
  })
})
