import { describe, expect, it } from 'vitest'

import { preloadResearchMapHighs } from './researchMapHighs.js'
import { solveJsLpModelWithHighs } from './researchMapLpHighs.js'

describe('solveJsLpModelWithHighs', () => {
  it('solves a tiny min problem matching hand-checked optimum', async () => {
    const highs = await preloadResearchMapHighs()
    const assignment = solveJsLpModelWithHighs(
      highs,
      'cost',
      'min',
      {
        x: { cost: 1, c1: 1 },
        y: { cost: 2, c1: 1 }
      },
      {
        c1: { min: 1 }
      }
    )
    expect(assignment.x).toBeCloseTo(1, 5)
    expect(assignment.y).toBeUndefined()
  })
})
