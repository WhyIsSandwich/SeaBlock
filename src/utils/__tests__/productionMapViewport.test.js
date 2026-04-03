import { describe, expect, it } from 'vitest'

import {
  clampProductionMapTranslateY,
  computeTranslateForSpineTerminal
} from '../productionMapViewport.js'

describe('clampProductionMapTranslateY', () => {
  it('caps ty so graph top stays near viewport top (no excess whitespace above)', () => {
    const ty = clampProductionMapTranslateY({
      tyAlign: 200,
      k: 1,
      minContentY: 48,
      clickedCard: { y: 48, height: 54 },
      viewportTop: 0,
      viewportHeight: 320,
      topMargin: 10,
      bottomMargin: 10
    })
    expect(ty).toBe(10 - 48)
    expect(ty).toBeLessThan(200)
  })

  it('does not raise ty when align is already higher on screen', () => {
    const ty = clampProductionMapTranslateY({
      tyAlign: -80,
      k: 1,
      minContentY: 48,
      clickedCard: { y: 48, height: 54 },
      viewportTop: 0,
      viewportHeight: 320,
      topMargin: 10,
      bottomMargin: 10
    })
    expect(ty).toBe(-80)
  })

  it('respects clicked card bottom fitting in viewport', () => {
    const ty = clampProductionMapTranslateY({
      tyAlign: 400,
      k: 1,
      minContentY: 0,
      clickedCard: { y: 500, height: 60 },
      viewportTop: 100,
      viewportHeight: 300,
      topMargin: 10,
      bottomMargin: 10
    })
    const vpBottom = 100 + 300
    const tyMaxBottom = vpBottom - 10 - 100 - 1 * (500 + 60)
    expect(tyMaxBottom).toBe(-270)
    expect(ty).toBe(Math.min(400, 10 - 0, tyMaxBottom))
    expect(ty).toBe(-270)
  })

  it('returns tyAlign when k is invalid', () => {
    expect(
      clampProductionMapTranslateY({
        tyAlign: 5,
        k: 0,
        minContentY: 0,
        clickedCard: null,
        viewportTop: 0,
        viewportHeight: 100
      })
    ).toBe(5)
  })
})

describe('computeTranslateForSpineTerminal', () => {
  it('centers horizontally on the terminal only; ty pins graph top', () => {
    const positions = new Map([
      ['root', { x: 0, y: 48, width: 120, height: 54 }],
      ['leaf', { x: 500, y: 48, width: 176, height: 48 }]
    ])
    const r = computeTranslateForSpineTerminal({
      terminalId: 'leaf',
      getPosition: id => positions.get(id),
      minContentY: 48,
      viewportWidth: 800,
      viewportHeight: 400,
      viewportTop: 0,
      k: 1,
      topMargin: 10
    })
    expect(r).not.toBeNull()
    const cx = 500 + 176 / 2
    expect(r.tx).toBe(400 - cx)
    expect(r.ty).toBe(10 - 48)
  })

  it('returns null when terminal missing', () => {
    expect(
      computeTranslateForSpineTerminal({
        terminalId: 'missing',
        getPosition: () => undefined,
        minContentY: 0,
        viewportWidth: 100,
        viewportHeight: 100,
        viewportTop: 0,
        k: 1
      })
    ).toBeNull()
  })
})
