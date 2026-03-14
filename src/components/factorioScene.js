import { FactorioSceneEngine } from './FactorioSceneEngine.js'

/**
 * Factorio Scene
 *
 * A scene for Factorio rendering engine with comprehensive scene management.
 */

// Example scene data structure
const exampleScene = {
  size: {
    width: 32,
    height: 32
  },
  camera_position: {
    x: 16,
    y: 16
  },
  camera_rotation: 0,
  camera_zoom: 1,
  entities: [
    {
      id: 'assembler-1',
      name: 'assembling-machine-1',
      position: {
        x: 10,
        y: 10
      },
      rotation: 0,
      tint: {
        r: 1,
        g: 1,
        b: 1,
        a: 1
      },
      state: 'active',
      scale: 1,
      animationSpeed: 1
    },
    {
      id: 'assembler-2',
      name: 'assembling-machine-2',
      position: {
        x: 15,
        y: 15
      },
      rotation: 0,
      tint: {
        r: 0.8,
        g: 0.8,
        b: 1,
        a: 1
      },
      state: 'idle',
      scale: 1,
      animationSpeed: 0.5
    }
  ],
  tiles: {
    'stone-path': [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 2],
      [3, 3]
    ],
    concrete: [
      [5, 5],
      [6, 6]
    ]
  }
}

// Scene data validation
function validateSceneData(sceneData) {
  const errors = []

  if (!sceneData) {
    errors.push('Scene data is required')
    return errors
  }

  // Validate size
  if (
    !sceneData.size ||
    typeof sceneData.size.width !== 'number' ||
    typeof sceneData.size.height !== 'number'
  ) {
    errors.push('Scene size must have width and height numbers')
  }

  // Validate camera
  if (sceneData.camera_position) {
    if (
      typeof sceneData.camera_position.x !== 'number' ||
      typeof sceneData.camera_position.y !== 'number'
    ) {
      errors.push('Camera position must have x and y numbers')
    }
  }

  // Validate entities
  if (sceneData.entities && Array.isArray(sceneData.entities)) {
    sceneData.entities.forEach((entity, index) => {
      if (!entity.name) {
        errors.push(`Entity ${index} missing name`)
      }
      if (
        !entity.position ||
        typeof entity.position.x !== 'number' ||
        typeof entity.position.y !== 'number'
      ) {
        errors.push(`Entity ${index} missing valid position`)
      }
    })
  }

  // Validate tiles
  if (sceneData.tiles && typeof sceneData.tiles === 'object') {
    Object.entries(sceneData.tiles).forEach(([tileType, positions]) => {
      if (!Array.isArray(positions)) {
        errors.push(`Tile type ${tileType} positions must be an array`)
      } else {
        positions.forEach((position, index) => {
          if (!Array.isArray(position) || position.length !== 2) {
            errors.push(`Tile ${tileType} position ${index} must be [x, y] array`)
          }
        })
      }
    })
  }

  return errors
}

// Create a scene from data with validation
export function createFactorioScene(sceneData = null, animationEngine = null) {
  const data = sceneData || exampleScene

  // Validate scene data
  const validationErrors = validateSceneData(data)
  if (validationErrors.length > 0) {
    console.warn('Scene validation errors:', validationErrors)
  }

  // If no animation engine provided, return just the data structure
  if (!animationEngine) {
    return {
      name: 'factorio-scene',
      data,
      entities: data.entities || [],
      tiles: data.tiles || {},
      size: data.size || { width: 32, height: 32 },
      camera: {
        position: data.camera_position || { x: 0, y: 0 },
        rotation: data.camera_rotation || 0,
        zoom: data.camera_zoom || 1
      }
    }
  }

  // Create scene engine with animation engine
  return FactorioSceneEngine.createFromData(data, animationEngine)
}

// Scene builder utility for programmatic scene creation
export class SceneBuilder {
  constructor(animationEngine) {
    this.animationEngine = animationEngine
    this.sceneData = {
      size: { width: 32, height: 32 },
      entities: [],
      tiles: {},
      camera_position: { x: 0, y: 0 },
      camera_rotation: 0,
      camera_zoom: 1
    }
  }

  setSize(width, height) {
    this.sceneData.size = { width, height }
    return this
  }

  setCamera(x, y, zoom = 1, rotation = 0) {
    this.sceneData.camera_position = { x, y }
    this.sceneData.camera_zoom = zoom
    this.sceneData.camera_rotation = rotation
    return this
  }

  addEntity(name, x, y, options = {}) {
    const entity = {
      id: options.id || `entity-${this.sceneData.entities.length}`,
      name,
      position: { x, y },
      rotation: options.rotation || 0,
      tint: options.tint || { r: 1, g: 1, b: 1, a: 1 },
      state: options.state || 'idle',
      scale: options.scale || 1,
      animationSpeed: options.animationSpeed || 1,
      animationData: options.animationData
    }
    this.sceneData.entities.push(entity)
    return this
  }

  addTile(tileType, x, y, _options = {}) {
    if (!this.sceneData.tiles[tileType]) {
      this.sceneData.tiles[tileType] = []
    }
    this.sceneData.tiles[tileType].push([x, y])
    return this
  }

  addTileArea(tileType, startX, startY, width, height) {
    for (let x = startX; x < startX + width; x++) {
      for (let y = startY; y < startY + height; y++) {
        this.addTile(tileType, x, y)
      }
    }
    return this
  }

  build() {
    return createFactorioScene(this.sceneData, this.animationEngine)
  }
}

// Export example scene for reference
export { exampleScene, validateSceneData }
