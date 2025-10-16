import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCanvas, loadImage } from 'canvas'
import { createFactorioAnimationEngine } from './FactorioAnimationEngine.js'
import { FactorioSceneEngine, createFactorioSceneEngine } from './FactorioSceneEngine.js'
import { createFactorioScene, SceneBuilder, exampleScene } from './factorioScene.js'

// Mock image loader for testing
const mockImageLoader = vi.fn(() => {
  const canvas = createCanvas(64, 64)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ff0000'
  ctx.fillRect(0, 0, 64, 64)
  return Promise.resolve(canvas)
})

// Mock animation data for testing
const mockAnimationData = {
  name: 'test-entity',
  filename: 'test-sprite.png',
  width: 64,
  height: 64,
  frame_count: 4,
  line_length: 2,
  animation_speed: 1
}

describe('FactorioSceneEngine', () => {
  let animationEngine
  let sceneEngine
  let canvas
  let ctx

  beforeEach(() => {
    // Create test canvas
    canvas = createCanvas(800, 600)
    ctx = canvas.getContext('2d')

    // Create animation engine
    animationEngine = createFactorioAnimationEngine({
      loadImage: mockImageLoader,
      applyDOMChanges: vi.fn(),
      canvas: canvas,
      devicePixelRatio: 2,
      graphicsPathMap: {}
    })

    // Create scene engine
    sceneEngine = createFactorioSceneEngine(animationEngine)
  })

  describe('Scene Creation', () => {
    it('should create a scene engine with default properties', () => {
      expect(sceneEngine).toBeInstanceOf(FactorioSceneEngine)
      expect(sceneEngine.camera).toBeDefined()
      expect(sceneEngine.entities).toBeInstanceOf(Map)
      expect(sceneEngine.tiles).toBeInstanceOf(Map)
      expect(sceneEngine.sceneSize).toEqual({ width: 32, height: 32 })
    })

    it('should set scene size', () => {
      sceneEngine.setSceneSize(64, 48)
      expect(sceneEngine.sceneSize).toEqual({ width: 64, height: 48 })
    })
  })

  describe('Camera System', () => {
    it('should set camera position', () => {
      sceneEngine.setCameraPosition(10, 20)
      expect(sceneEngine.camera.x).toBe(10)
      expect(sceneEngine.camera.y).toBe(20)
    })

    it('should set camera zoom with bounds', () => {
      sceneEngine.setCameraZoom(5)
      expect(sceneEngine.camera.zoom).toBe(5)

      sceneEngine.setCameraZoom(15) // Should be clamped to 10
      expect(sceneEngine.camera.zoom).toBe(10)

      sceneEngine.setCameraZoom(0.05) // Should be clamped to 0.1
      expect(sceneEngine.camera.zoom).toBe(0.1)
    })

    it('should set camera rotation', () => {
      sceneEngine.setCameraRotation(Math.PI / 4)
      expect(sceneEngine.camera.rotation).toBe(Math.PI / 4)
    })

    it('should convert world to screen coordinates', () => {
      sceneEngine.setCameraPosition(10, 10)
      sceneEngine.setCameraZoom(2)

      const screen = sceneEngine.camera.worldToScreen(15, 15, 800, 600)
      expect(screen.x).toBe(410) // (15-10)*2 + 400
      expect(screen.y).toBe(310) // (15-10)*2 + 300
    })

    it('should convert screen to world coordinates', () => {
      sceneEngine.setCameraPosition(10, 10)
      sceneEngine.setCameraZoom(2)

      const world = sceneEngine.camera.screenToWorld(410, 310, 800, 600)
      expect(world.x).toBe(15)
      expect(world.y).toBe(15)
    })
  })

  describe('Entity Management', () => {
    it('should add entities to the scene', () => {
      const entity = sceneEngine.addEntity(
        'test-1',
        'assembling-machine-1',
        { x: 5, y: 5 },
        mockAnimationData
      )

      expect(sceneEngine.entities.size).toBe(1)
      expect(sceneEngine.getEntity('test-1')).toBe(entity)
      expect(entity.name).toBe('assembling-machine-1')
      expect(entity.position).toEqual({ x: 5, y: 5 })
    })

    it('should remove entities from the scene', () => {
      sceneEngine.addEntity('test-1', 'assembling-machine-1', { x: 5, y: 5 }, mockAnimationData)
      expect(sceneEngine.entities.size).toBe(1)

      const removed = sceneEngine.removeEntity('test-1')
      expect(removed).toBe(true)
      expect(sceneEngine.entities.size).toBe(0)
    })

    it('should update entity properties', () => {
      sceneEngine.addEntity('test-1', 'assembling-machine-1', { x: 5, y: 5 }, mockAnimationData)

      const updated = sceneEngine.updateEntity('test-1', {
        position: { x: 10, y: 10 },
        tint: { r: 0.5, g: 0.5, b: 1, a: 1 }
      })

      expect(updated.position).toEqual({ x: 10, y: 10 })
      expect(updated.tint).toEqual({ r: 0.5, g: 0.5, b: 1, a: 1 })
    })

    it('should update entity animation frames', () => {
      const entity = sceneEngine.addEntity(
        'test-1',
        'assembling-machine-1',
        { x: 5, y: 5 },
        mockAnimationData
      )

      sceneEngine.update(0.1) // 100ms delta time
      expect(entity.frame).toBeGreaterThan(0)
    })
  })

  describe('Tile Management', () => {
    it('should add tiles to the scene', () => {
      const tile = sceneEngine.addTile('tile-1', 'stone-path', { x: 2, y: 3 })

      expect(sceneEngine.tiles.size).toBe(1)
      expect(sceneEngine.getTile('tile-1')).toBe(tile)
      expect(tile.tileType).toBe('stone-path')
      expect(tile.position).toEqual({ x: 2, y: 3 })
    })

    it('should remove tiles from the scene', () => {
      sceneEngine.addTile('tile-1', 'stone-path', { x: 2, y: 3 })
      expect(sceneEngine.tiles.size).toBe(1)

      const removed = sceneEngine.removeTile('tile-1')
      expect(removed).toBe(true)
      expect(sceneEngine.tiles.size).toBe(0)
    })
  })

  describe('Scene Bounds', () => {
    it('should calculate scene bounds from entities and tiles', () => {
      sceneEngine.addEntity('entity-1', 'test', { x: 5, y: 5 }, mockAnimationData)
      sceneEngine.addEntity('entity-2', 'test', { x: 15, y: 10 }, mockAnimationData)
      sceneEngine.addTile('tile-1', 'stone-path', { x: 0, y: 0 })
      sceneEngine.addTile('tile-2', 'concrete', { x: 20, y: 20 })

      const bounds = sceneEngine.getSceneBounds()
      expect(bounds.minX).toBe(0)
      expect(bounds.minY).toBe(0)
      expect(bounds.maxX).toBe(20)
      expect(bounds.maxY).toBe(20)
      expect(bounds.width).toBe(20)
      expect(bounds.height).toBe(20)
    })

    it('should center camera on scene', () => {
      sceneEngine.addEntity('entity-1', 'test', { x: 5, y: 5 }, mockAnimationData)
      sceneEngine.addEntity('entity-2', 'test', { x: 15, y: 10 }, mockAnimationData)

      sceneEngine.centerCamera()
      expect(sceneEngine.camera.x).toBe(10) // (5+15)/2
      expect(sceneEngine.camera.y).toBe(7.5) // (5+10)/2
    })

    it('should fit scene in view', () => {
      sceneEngine.addEntity('entity-1', 'test', { x: 0, y: 0 }, mockAnimationData)
      sceneEngine.addEntity('entity-2', 'test', { x: 10, y: 10 }, mockAnimationData)

      sceneEngine.fitSceneInView(800, 600)
      expect(sceneEngine.camera.zoom).toBeLessThan(1)
      expect(sceneEngine.camera.x).toBe(5)
      expect(sceneEngine.camera.y).toBe(5)
    })
  })

  describe('Scene Creation from Data', () => {
    it('should create scene from data structure', () => {
      const sceneData = {
        size: { width: 16, height: 16 },
        camera_position: { x: 8, y: 8 },
        camera_zoom: 2,
        entities: [
          {
            id: 'entity-1',
            name: 'assembling-machine-1',
            position: { x: 5, y: 5 },
            animationData: mockAnimationData
          }
        ],
        tiles: {
          'stone-path': [
            [0, 0],
            [1, 1]
          ]
        }
      }

      const scene = FactorioSceneEngine.createFromData(sceneData, animationEngine)

      expect(scene).toBeInstanceOf(FactorioSceneEngine)
      expect(scene.sceneSize).toEqual({ width: 16, height: 16 })
      expect(scene.camera.x).toBe(8)
      expect(scene.camera.y).toBe(8)
      expect(scene.camera.zoom).toBe(2)
      expect(scene.entities.size).toBe(1)
      expect(scene.tiles.size).toBe(2)
    })
  })

  describe('Rendering', () => {
    it('should render scene without errors', async () => {
      sceneEngine.addEntity('entity-1', 'test', { x: 5, y: 5 }, mockAnimationData)
      sceneEngine.addTile('tile-1', 'stone-path', { x: 0, y: 0 })

      // Should not throw
      await expect(sceneEngine.render(ctx, {})).resolves.toBeUndefined()
    })

    it('should render entities in correct order', async () => {
      // Add entities at different Y positions
      sceneEngine.addEntity('entity-1', 'test', { x: 5, y: 10 }, mockAnimationData)
      sceneEngine.addEntity('entity-2', 'test', { x: 5, y: 5 }, mockAnimationData)

      // Should not throw
      await expect(sceneEngine.render(ctx, {})).resolves.toBeUndefined()
    })
  })
})

describe('Scene Data Structure', () => {
  describe('createFactorioScene', () => {
    it('should create scene from example data', () => {
      const scene = createFactorioScene()

      expect(scene.name).toBe('factorio-scene')
      expect(scene.entities).toHaveLength(2)
      expect(scene.tiles).toHaveProperty('stone-path')
      expect(scene.tiles).toHaveProperty('concrete')
      expect(scene.size).toEqual({ width: 32, height: 32 })
    })

    it('should validate scene data', () => {
      const invalidData = {
        size: { width: 'invalid', height: 32 },
        entities: [{ name: 'test' }], // Missing position
        tiles: { 'stone-path': 'invalid' } // Should be array
      }

      const scene = createFactorioScene(invalidData)
      expect(scene).toBeDefined() // Should still create scene but with warnings
    })
  })

  describe('SceneBuilder', () => {
    it('should build scene programmatically', () => {
      const builder = new SceneBuilder()

      const scene = builder
        .setSize(16, 16)
        .setCamera(8, 8, 2)
        .addEntity('assembling-machine-1', 5, 5, {
          id: 'assembler-1',
          tint: { r: 1, g: 0.5, b: 0.5, a: 1 }
        })
        .addTile('stone-path', 0, 0)
        .addTileArea('concrete', 10, 10, 2, 2)
        .build()

      expect(scene.data.size).toEqual({ width: 16, height: 16 })
      expect(scene.data.camera_position).toEqual({ x: 8, y: 8 })
      expect(scene.data.camera_zoom).toBe(2)
      expect(scene.data.entities).toHaveLength(1)
      expect(scene.data.entities[0].id).toBe('assembler-1')
      expect(scene.data.tiles['stone-path']).toEqual([[0, 0]])
      expect(scene.data.tiles['concrete']).toEqual([
        [10, 10],
        [11, 10],
        [10, 11],
        [11, 11]
      ])
    })
  })
})

describe('Performance', () => {
  it('should handle large scenes efficiently', () => {
    const sceneEngine = createFactorioSceneEngine(animationEngine)

    // Add many entities
    for (let i = 0; i < 100; i++) {
      sceneEngine.addEntity(
        `entity-${i}`,
        'test',
        { x: i % 10, y: Math.floor(i / 10) },
        mockAnimationData
      )
    }

    // Add many tiles
    for (let i = 0; i < 200; i++) {
      sceneEngine.addTile(`tile-${i}`, 'stone-path', { x: i % 20, y: Math.floor(i / 20) })
    }

    expect(sceneEngine.entities.size).toBe(100)
    expect(sceneEngine.tiles.size).toBe(200)

    // Should be able to update without performance issues
    const startTime = performance.now()
    sceneEngine.update(0.016) // 60fps frame time
    const endTime = performance.now()

    expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
  })
})
