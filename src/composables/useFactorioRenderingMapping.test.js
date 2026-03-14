import { describe, expect, it } from 'vitest'

import { useFactorioRenderingMapping } from './useFactorioRenderingMapping.js'

describe('useFactorioRenderingMapping', () => {
  it('returns empty arrays for explicitly stubbed missing prototype taxonomy handlers', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const missingTypes = [
      'entity',
      'entitywithhealth',
      'entitywithowner',
      'combinator',
      'craftingmachine',
      'flyingrobot',
      'robotwithlogisticinterface',
      'rail',
      'railsignalbase',
      'transportbeltconnectable',
      'vehicle',
      'rollingstock',
      'smoke'
    ]

    for (const type of missingTypes) {
      const layers = getRenderingMethod({ type })
      expect(Array.isArray(layers)).toBe(true)
      expect(layers).toHaveLength(0)
    }
  })

  it('returns flat heat-pipe layer arrays without nested wrappers', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'heat-pipe',
      connection_sprites: {
        straight_horizontal: [
          { filename: 'heat-1.png', width: 32, height: 32 },
          { filename: 'heat-2.png', width: 32, height: 32 }
        ]
      }
    }

    const layers = getRenderingMethod(entity)
    expect(layers).toHaveLength(2)
    expect(layers[0].filename).toBe('heat-1.png')
    expect(layers[1].filename).toBe('heat-2.png')
    expect(Array.isArray(layers[0])).toBe(false)
  })

  it('returns null for unknown prototype types', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const layers = getRenderingMethod({ type: 'totally-unknown-prototype' })
    expect(layers).toBeNull()
  })

  it('selects directional boiler pictures based on runtime direction', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const northStructure = { filename: 'north-structure.png' }
    const eastStructure = { filename: 'east-structure.png' }

    const entity = {
      type: 'boiler',
      pictures: {
        north: { structure: northStructure },
        east: { structure: eastStructure }
      }
    }

    const eastLayers = getRenderingMethod(entity, { direction: 'east' })
    expect(eastLayers).toHaveLength(1)
    expect(eastLayers[0]).toBe(eastStructure)

    const numericSouthLayers = getRenderingMethod(entity, { direction: 2 })
    expect(numericSouthLayers).toHaveLength(1)
    expect(numericSouthLayers[0]).toBe(northStructure)
  })

  it('selects turret animation by runtime state', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'turret',
      folded_animation: { filename: 'folded.png' },
      preparing_animation: { filename: 'preparing.png' },
      prepared_animation: { filename: 'prepared.png' },
      attacking_animation: { filename: 'attacking.png' }
    }

    expect(getRenderingMethod(entity, { state: 'folded' })[0].filename).toBe('folded.png')
    expect(getRenderingMethod(entity, { state: 'preparing' })[0].filename).toBe('preparing.png')
    expect(getRenderingMethod(entity, { state: 'attacking' })[0].filename).toBe('attacking.png')
    expect(getRenderingMethod(entity, { state: 'prepared' })[0].filename).toBe('prepared.png')
  })

  it('boosts turret animation speed using runtime activity/progress', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'turret',
      prepared_animation: { filename: 'prepared.png', animation_speed: 1 }
    }

    const idleLayer = getRenderingMethod(entity, { state: 'idle' })[0]
    expect(idleLayer.animation_speed).toBe(1)

    const activeLayer = getRenderingMethod(entity, { state: 'attacking', activity: 2, progress: 0.5 })[0]
    expect(activeLayer.animation_speed).toBe(3)
  })

  it('selects lab on/off animations based on runtime activity', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'lab',
      on_animation: { filename: 'lab-on.png' },
      off_animation: { filename: 'lab-off.png' }
    }

    expect(getRenderingMethod(entity, { state: 'working' })[0].filename).toBe('lab-on.png')
    expect(getRenderingMethod(entity, { state: 'idle' })[0].filename).toBe('lab-off.png')
    expect(getRenderingMethod(entity, { activity: 1 })[0].filename).toBe('lab-on.png')
  })

  it('uses electric energy interface animation when picture is missing', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'electric-energy-interface',
      animation: {
        layers: [{ filename: 'wind-turbine-anim.png' }]
      }
    }

    const layers = getRenderingMethod(entity)
    expect(layers).toHaveLength(1)
    expect(layers[0]).toBe(entity.animation)
  })

  it('uses logistic container picture when animation is missing', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'logistic-container',
      picture: { filename: 'logistic-container-picture.png' }
    }

    const layers = getRenderingMethod(entity)
    expect(layers).toHaveLength(1)
    expect(layers[0]).toBe(entity.picture)
  })

  it('includes offshore pump fluid animation only when runtime is active', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'offshore-pump',
      graphics_set: {
        base_pictures: {
          north: { filename: 'base-north.png' }
        },
        animation: {
          north: { filename: 'anim-north.png' }
        },
        fluid_animation: {
          north: { filename: 'fluid-north.png' }
        }
      }
    }

    const idleLayers = getRenderingMethod(entity, { state: 'idle', direction: 'north' })
    expect(idleLayers.map(layer => layer.filename)).toEqual(['base-north.png', 'anim-north.png'])

    const activeLayers = getRenderingMethod(entity, { state: 'working', direction: 'north' })
    expect(activeLayers.map(layer => layer.filename)).toEqual([
      'base-north.png',
      'anim-north.png',
      'fluid-north.png'
    ])
  })

  it('adds reactor working light only while active', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'reactor',
      lower_layer_picture: { filename: 'reactor-lower.png' },
      picture: { filename: 'reactor-base.png' },
      working_light_picture: { filename: 'reactor-light.png', animation_speed: 1 }
    }

    const idleLayers = getRenderingMethod(entity, { state: 'idle' })
    expect(idleLayers.map(layer => layer.filename)).toEqual(['reactor-lower.png', 'reactor-base.png'])

    const activeLayers = getRenderingMethod(entity, { state: 'working', activity: 2 })
    expect(activeLayers.map(layer => layer.filename)).toEqual([
      'reactor-lower.png',
      'reactor-base.png',
      'reactor-light.png'
    ])
    expect(activeLayers[2].draw_as_light).toBe(true)
    expect(activeLayers[2].animation_speed).toBe(2)
  })

  it('uses mining drill runtime direction and only adds working visuals while active', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'mining-drill',
      base_picture: {
        north: { filename: 'drill-base-north.png' },
        east: { filename: 'drill-base-east.png' }
      },
      graphics_set: {
        animation: {
          north: { filename: 'drill-anim-north.png', animation_speed: 1 },
          east: { filename: 'drill-anim-east.png', animation_speed: 1 }
        },
        working_visualisations: [
          {
            animation: {
              filename: 'drill-effect.png',
              animation_speed: 1
            }
          }
        ]
      }
    }

    const idleLayers = getRenderingMethod(entity, { state: 'idle', direction: 'east' })
    expect(idleLayers.map(layer => layer.filename)).toEqual(['drill-base-east.png', 'drill-anim-east.png'])

    const activeLayers = getRenderingMethod(entity, {
      state: 'working',
      direction: 'east',
      activity: 2
    })
    expect(activeLayers.map(layer => layer.filename)).toEqual([
      'drill-base-east.png',
      'drill-anim-east.png',
      'drill-effect.png'
    ])
    expect(activeLayers[1].animation_speed).toBe(2)
    expect(activeLayers[2].animation_speed).toBe(2)
  })

  it('applies radar runtime spin metadata only while active', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'radar',
      pictures: {
        north: { filename: 'radar.png', animation_speed: 1 }
      }
    }

    const idleLayer = getRenderingMethod(entity, { state: 'idle', direction: 'north' })[0]
    expect(idleLayer.animation_speed).toBe(1)

    const activeLayer = getRenderingMethod(entity, { state: 'working', direction: 'north', spinSpeed: 2 })[0]
    expect(activeLayer.animation_speed).toBe(2)
  })

  it('propagates radar runtime spin speed to nested picture layers', async () => {
    const { getRenderingMethod, getProcessedLayers } = useFactorioRenderingMapping()
    const entity = {
      type: 'radar',
      pictures: {
        north: {
          layers: [
            { filename: 'radar-base.png', width: 64, height: 64 },
            { filename: 'radar-shadow.png', width: 64, height: 64, draw_as_shadow: true }
          ]
        }
      }
    }

    const layers = getRenderingMethod(entity, { state: 'working', direction: 'north', spinSpeed: 2 })
    const processed = await getProcessedLayers(layers, 1, async filename => ({
      src: filename,
      width: 64,
      height: 64
    }))

    expect(processed.base).toHaveLength(1)
    expect(processed.shadow).toHaveLength(1)
    expect(processed.base[0].filename).toBe('radar-base.png')
    expect(processed.shadow[0].filename).toBe('radar-shadow.png')
    expect(processed.base[0].animation_speed).toBe(2)
    expect(processed.shadow[0].animation_speed).toBe(2)
  })

  it('handles radar directional pictures defined as arrays', async () => {
    const { getRenderingMethod, getProcessedLayers } = useFactorioRenderingMapping()
    const entity = {
      type: 'radar',
      pictures: {
        north: [
          { filename: 'radar-frame-1.png', width: 64, height: 64 },
          { filename: 'radar-frame-2.png', width: 64, height: 64, draw_as_shadow: true }
        ]
      }
    }

    const layers = getRenderingMethod(entity, { state: 'working', direction: 'north', spinSpeed: 1.5 })
    const processed = await getProcessedLayers(layers, 1, async filename => ({
      src: filename,
      width: 64,
      height: 64
    }))

    expect(processed.base.map(layer => layer.filename)).toEqual(['radar-frame-1.png'])
    expect(processed.shadow.map(layer => layer.filename)).toEqual(['radar-frame-2.png'])
    expect(processed.base[0].animation_speed).toBe(1.5)
    expect(processed.shadow[0].animation_speed).toBe(1.5)
  })

  it('selects inserter hand state from runtime activity and preserves platform layers', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'inserter',
      platform_picture: {
        sheets: [
          { filename: 'platform-base.png', width: 32, height: 32, shift: [0.5, 0.25] },
          { filename: 'platform-shadow.png', width: 32, height: 32, draw_as_shadow: true }
        ]
      },
      hand_base_picture: { filename: 'hand-base.png', animation_speed: 1, height: 96 },
      hand_base_shadow: { filename: 'hand-base-shadow.png', draw_as_shadow: true, animation_speed: 1, height: 96 },
      hand_open_picture: { filename: 'hand-open.png', animation_speed: 1, height: 96 },
      hand_open_shadow: { filename: 'hand-open-shadow.png', draw_as_shadow: true, animation_speed: 1, height: 96 },
      hand_closed_picture: { filename: 'hand-closed.png', animation_speed: 1, height: 96 },
      hand_closed_shadow: {
        filename: 'hand-closed-shadow.png',
        draw_as_shadow: true,
        animation_speed: 1,
        height: 96
      }
    }

    const idleLayers = getRenderingMethod(entity, { state: 'idle' })
    expect(idleLayers.map(layer => layer.filename)).toEqual([
      'platform-base.png',
      'platform-shadow.png',
      'hand-base-shadow.png',
      'hand-base.png',
      'hand-open-shadow.png',
      'hand-open.png'
    ])
    expect(idleLayers.some(layer => layer.filename === 'hand-closed.png')).toBe(false)

    const activeLayers = getRenderingMethod(entity, { state: 'working', activity: 2 })
    expect(activeLayers.map(layer => layer.filename)).toEqual([
      'platform-base.png',
      'platform-shadow.png',
      'hand-base-shadow.png',
      'hand-base.png',
      'hand-closed-shadow.png',
      'hand-closed.png'
    ])
    expect(activeLayers[2].animation_speed).toBe(2)
    expect(activeLayers[5].animation_speed).toBe(2)
    // Bottom-center arm pivot: base anchor shift (0.25y) minus half layer height (96/64 = 1.5 tiles)
    expect(activeLayers[2].shift).toEqual([0.5, -1.25])
    expect(activeLayers[3].shift).toEqual([0.5, -1.25])
    expect(activeLayers[4].shift).toEqual([0.5, -1.25])
    expect(activeLayers[5].shift).toEqual([0.5, -1.25])
  })

  it('resolves inserter directional hand variants using runtime direction', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'inserter',
      platform_picture: { filename: 'platform.png' },
      hand_base_picture: {
        north: { filename: 'base-north.png' },
        east: { filename: 'base-east.png' }
      },
      hand_open_picture: {
        north: { filename: 'open-north.png' },
        east: { filename: 'open-east.png' }
      },
      hand_closed_picture: {
        north: { filename: 'closed-north.png' },
        east: { filename: 'closed-east.png' }
      }
    }

    const eastIdleLayers = getRenderingMethod(entity, { state: 'idle', direction: 'east' })
    expect(eastIdleLayers.map(layer => layer.filename)).toEqual([
      'platform.png',
      'base-east.png',
      'open-east.png'
    ])

    const northActiveLayers = getRenderingMethod(entity, { state: 'working', direction: 'north' })
    expect(northActiveLayers.map(layer => layer.filename)).toEqual([
      'platform.png',
      'base-north.png',
      'closed-north.png'
    ])
  })

  it('applies inserter bottom-center pivot shift to nested hand layers', async () => {
    const { getRenderingMethod, getProcessedLayers } = useFactorioRenderingMapping()
    const entity = {
      type: 'inserter',
      platform_picture: {
        sheets: [{ filename: 'platform.png', shift: [0.125, 0.25] }]
      },
      hand_base_picture: {
        layers: [{ filename: 'base-nested.png', width: 32, height: 136, scale: 0.25 }]
      },
      hand_open_picture: {
        layers: [{ filename: 'open-nested.png', width: 130, height: 164, scale: 0.25 }]
      }
    }

    const layers = getRenderingMethod(entity, { state: 'idle' })
    const processed = await getProcessedLayers(layers, 1, async filename => ({
      src: filename,
      width: 256,
      height: 256
    }))
    expect(processed.base.map(layer => layer.filename)).toEqual([
      'platform.png',
      'base-nested.png',
      'open-nested.png'
    ])

    // base: 0.25 - (136 * 0.25 / 64) = -0.28125
    expect(processed.base[1].shift).toEqual([0.125, -0.28125])
    // open: 0.25 - (164 * 0.25 / 64) = -0.390625
    expect(processed.base[2].shift).toEqual([0.125, -0.390625])
  })

  it('resolves stripe-only layers to first stripe filename and offsets', async () => {
    const { getProcessedLayers } = useFactorioRenderingMapping()
    const loadedPaths = []
    const imageLoader = async filename => {
      loadedPaths.push(filename)
      return { src: filename, width: 64, height: 64 }
    }

    const layers = [
      {
        width: 66,
        height: 64,
        frame_count: 1,
        direction_count: 64,
        stripes: [
          {
            filename: '__base__/graphics/entity/gun-turret/gun-turret.png',
            width_in_frames: 16,
            height_in_frames: 1,
            x: 32,
            y: 96
          }
        ]
      }
    ]

    const processed = await getProcessedLayers(layers, 1, imageLoader)
    expect(processed.base).toHaveLength(1)
    expect(loadedPaths).toEqual(['__base__/graphics/entity/gun-turret/gun-turret.png'])
    expect(processed.base[0].filename).toBe('__base__/graphics/entity/gun-turret/gun-turret.png')
    expect(processed.base[0].source_x).toBe(32)
    expect(processed.base[0].source_y).toBe(96)
  })

  it('normalizes size-only belt layers into width and height', async () => {
    const { getRenderingMethod, getProcessedLayers } = useFactorioRenderingMapping()
    const imageLoader = async filename => ({ src: filename, width: 1024, height: 64 })
    const entity = {
      type: 'transport-belt',
      belt_animation_set: {
        animation_set: {
          filename: '__base__/graphics/entity/transport-belt/transport-belt.png',
          size: 64,
          frame_count: 16,
          direction_count: 20
        }
      }
    }

    const layers = getRenderingMethod(entity)
    expect(layers).toHaveLength(1)

    const processed = await getProcessedLayers(layers, 1, imageLoader)
    expect(processed.base).toHaveLength(1)
    expect(processed.base[0].filename).toBe('__base__/graphics/entity/transport-belt/transport-belt.png')
    expect(processed.base[0].width).toBe(64)
    expect(processed.base[0].height).toBe(64)
  })

  it('preserves dimensions for sheet-wrapped layers without frame metadata', async () => {
    const { getProcessedLayers } = useFactorioRenderingMapping()
    const imageLoader = async filename => ({ src: filename, width: 192, height: 192 })
    const layers = [
      {
        sheet: {
          filename: '__base__/graphics/entity/underground-belt/underground-belt-structure.png',
          width: 192,
          height: 192,
          scale: 0.5
        }
      }
    ]

    const processed = await getProcessedLayers(layers, 1, imageLoader)
    expect(processed.base).toHaveLength(1)
    expect(processed.base[0].width).toBe(192)
    expect(processed.base[0].height).toBe(192)
    expect(processed.base[0].filename).toBe(
      '__base__/graphics/entity/underground-belt/underground-belt-structure.png'
    )
  })

  it('includes splitter structure and patch by runtime direction', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'splitter',
      belt_animation_set: {
        animation_set: { filename: 'splitter-belt.png' }
      },
      structure: {
        north: { filename: 'splitter-structure-north.png' },
        east: { filename: 'splitter-structure-east.png' }
      },
      structure_patch: {
        north: { filename: 'splitter-patch-north.png' },
        east: { filename: 'splitter-patch-east.png' }
      }
    }

    const layers = getRenderingMethod(entity, { direction: 'east' })
    expect(layers.map(layer => layer.filename)).toEqual([
      'splitter-belt.png',
      'splitter-belt.png',
      'splitter-patch-east.png',
      'splitter-structure-east.png',
    ])
    expect(layers[0].shift).toEqual([0, -0.25])
    expect(layers[1].shift).toEqual([0, 0.25])
  })

  it('includes underground belt structure and patches in addition to belt animation', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'underground-belt',
      belt_animation_set: {
        animation_set: { filename: 'underground-belt-anim.png' }
      },
      structure: {
        direction_in: { filename: 'underground-in.png' },
        direction_out: { filename: 'underground-out.png' },
        back_patch: { filename: 'underground-back-patch.png' },
        front_patch: { filename: 'underground-front-patch.png' }
      }
    }

    const inLayers = getRenderingMethod(entity, { state: 'idle' })
    expect(inLayers.map(layer => layer.filename)).toEqual([
      'underground-back-patch.png',
      'underground-belt-anim.png',
      'underground-in.png',
      'underground-front-patch.png'
    ])

    const outLayers = getRenderingMethod({ ...entity, belt_to_ground_type: 'output' }, { state: 'idle' })
    expect(outLayers.map(layer => layer.filename)).toEqual([
      'underground-back-patch.png',
      'underground-belt-anim.png',
      'underground-out.png',
      'underground-front-patch.png'
    ])
  })

  it('unwraps rail signal rail-piece sprites so processing gets real sprite layers', async () => {
    const { getRenderingMethod, getProcessedLayers } = useFactorioRenderingMapping()
    const imageLoader = async filename => ({ src: filename, width: 128, height: 128 })
    const entity = {
      type: 'rail-signal',
      ground_picture_set: {
        structure: {
          layers: [{ filename: 'rail-signal-structure.png', width: 64, height: 64 }]
        },
        rail_piece: {
          sprites: { filename: 'rail-signal-rail-piece.png', width: 64, height: 64 }
        }
      }
    }

    const layers = getRenderingMethod(entity)
    expect(layers).toHaveLength(2)
    expect(layers[1].filename).toBe('rail-signal-rail-piece.png')

    const processed = await getProcessedLayers(layers, 1, imageLoader)
    expect(processed.base.map(layer => layer.filename)).toEqual([
      'rail-signal-structure.png',
      'rail-signal-rail-piece.png'
    ])
    expect(processed.base.every(layer => layer.animation_speed === 0)).toBe(true)
  })

  it('loads all stripe atlas files for multi-stripe layers', async () => {
    const { getProcessedLayers } = useFactorioRenderingMapping()
    const loadedPaths = []
    const imageLoader = async filename => {
      loadedPaths.push(filename)
      return { src: filename, width: 64, height: 64 }
    }

    const layers = [
      {
        width: 332,
        height: 374,
        frame_count: 36,
        stripes: [
          {
            filename: '__angelssmeltinggraphics__/graphics/entity/chemical-furnace/chemical-furnace-base_01.png',
            width_in_frames: 6,
            height_in_frames: 3
          },
          {
            filename: '__angelssmeltinggraphics__/graphics/entity/chemical-furnace/chemical-furnace-base_02.png',
            width_in_frames: 6,
            height_in_frames: 3
          }
        ]
      }
    ]

    const processed = await getProcessedLayers(layers, 1, imageLoader)
    expect(processed.base).toHaveLength(1)
    expect(Object.keys(processed.base[0].stripeFiles)).toEqual([
      '__angelssmeltinggraphics__/graphics/entity/chemical-furnace/chemical-furnace-base_01.png',
      '__angelssmeltinggraphics__/graphics/entity/chemical-furnace/chemical-furnace-base_02.png'
    ])
  })

  it('flattens nested layer arrays before loading files', async () => {
    const { getProcessedLayers } = useFactorioRenderingMapping()
    const loadedPaths = []
    const imageLoader = async filename => {
      loadedPaths.push(filename)
      return { src: filename, width: 64, height: 64 }
    }

    const layers = [[{ filename: 'nested-a.png', width: 32, height: 32 }]]
    const processed = await getProcessedLayers(layers, 1, imageLoader)

    expect(processed.base).toHaveLength(1)
    expect(processed.base[0].filename).toBe('nested-a.png')
    expect(loadedPaths).toEqual(['nested-a.png'])
  })

  it('propagates parent shifts to nested child layers during flattening', async () => {
    const { getProcessedLayers } = useFactorioRenderingMapping()
    const imageLoader = async filename => ({ src: filename, width: 64, height: 64 })
    const layers = [
      {
        shift: [0.5, 0.25],
        layers: [
          {
            filename: 'nested-shifted.png',
            width: 32,
            height: 32,
            shift: [0.25, -0.5]
          }
        ]
      }
    ]

    const processed = await getProcessedLayers(layers, 1, imageLoader)
    expect(processed.base).toHaveLength(1)
    expect(processed.base[0].filename).toBe('nested-shifted.png')
    expect(processed.base[0].shift).toEqual([0.75, -0.25])
  })

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

  it('resolves directional working visualisations using runtime direction', () => {
    const { getRenderingMethod } = useFactorioRenderingMapping()
    const entity = {
      type: 'furnace',
      graphics_set: {
        animation: { filename: 'base.png', width: 32, height: 32, frame_count: 1, line_length: 1 },
        working_visualisations: [
          {
            animation: {
              filename: 'fallback.png',
              width: 32,
              height: 32,
              frame_count: 1,
              line_length: 1,
              east_animation: {
                filename: 'effect-east.png',
                width: 32,
                height: 32,
                frame_count: 1,
                line_length: 1
              },
              north_animation: {
                filename: 'effect-north.png',
                width: 32,
                height: 32,
                frame_count: 1,
                line_length: 1
              }
            }
          }
        ]
      }
    }

    const eastLayers = getRenderingMethod(entity, { direction: 'east' })
    expect(eastLayers).toHaveLength(2)
    expect(eastLayers[0].filename).toBe('base.png')
    expect(eastLayers[1].filename).toBe('effect-east.png')

    const northLayers = getRenderingMethod(entity, { direction: 'north' })
    expect(northLayers[1].filename).toBe('effect-north.png')
  })
})
