import { describe, expect, it } from 'vitest'

import { useFactorioRenderingMapping } from './useFactorioRenderingMapping.js'

describe('useFactorioRenderingMapping', () => {
  it('includes working visualisation effects for assembling machines', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'assembling-machine',
      graphics_set: {
        animation: { filename: 'base.png', width: 32, height: 32, frame_count: 1, line_length: 1 },
        idle_animation: {
          filename: 'idle.png',
          width: 32,
          height: 32,
          frame_count: 1,
          line_length: 1
        },
        working_visualisations: [
          {
            effect: 'flicker',
            animation: {
              filename: 'effect.png',
              width: 32,
              height: 32,
              frame_count: 1,
              line_length: 1
            }
          }
        ]
      }
    }

    const layers = getRenderingMethod(entity)
    expect(layers).toHaveLength(2)
    expect(layers.some(layer => layer.filename === 'effect.png')).toBe(true)
  })

  it('skips positional-only effect visualisations that are not yet supported', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'furnace',
      graphics_set: {
        animation: { filename: 'base.png', width: 32, height: 32, frame_count: 1, line_length: 1 },
        working_visualisations: [
          {
            animation: {
              filename: 'positional.png',
              width: 32,
              height: 32,
              frame_count: 1,
              line_length: 1,
              north_animation: {}
            }
          }
        ]
      }
    }

    const layers = getRenderingMethod(entity)
    expect(layers).toHaveLength(1)
    expect(layers[0].filename).toBe('base.png')
  })
})
