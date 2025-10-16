// import { createFactorioAnimationEngine } from './FactorioAnimationEngine.js'

/**
 * Factorio Scene Engine
 *
 * Extends the Factorio Animation Engine to render complete scenes with multiple entities,
 * camera controls, tiles, and proper layering.
 */

// Scene layer types for proper rendering order
const SCENE_LAYERS = {
  TILES: 'tiles',
  ENTITIES: 'entities',
  EFFECTS: 'effects',
  UI: 'ui'
}

// Camera system for scene rendering
class Camera {
  constructor(x = 0, y = 0, zoom = 1, rotation = 0) {
    this.x = x
    this.y = y
    this.zoom = zoom
    this.rotation = rotation
  }

  // Apply camera transformation to canvas context
  applyTransform(ctx, canvasWidth, canvasHeight) {
    ctx.save()

    // Center the camera
    ctx.translate(canvasWidth / 2, canvasHeight / 2)

    // Apply zoom
    ctx.scale(this.zoom, this.zoom)

    // Apply rotation
    if (this.rotation !== 0) {
      ctx.rotate(this.rotation)
    }

    // Apply position offset
    ctx.translate(-this.x, -this.y)
  }

  // Reset camera transformation
  resetTransform(ctx) {
    ctx.restore()
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX, worldY, canvasWidth, canvasHeight) {
    const screenX = (worldX - this.x) * this.zoom + canvasWidth / 2
    const screenY = (worldY - this.y) * this.zoom + canvasHeight / 2
    return { x: screenX, y: screenY }
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX, screenY, canvasWidth, canvasHeight) {
    const worldX = (screenX - canvasWidth / 2) / this.zoom + this.x
    const worldY = (screenY - canvasHeight / 2) / this.zoom + this.y
    return { x: worldX, y: worldY }
  }
}

// Entity class for scene entities
class SceneEntity {
  constructor(name, position, animationData, options = {}) {
    this.name = name
    this.position = position
    this.animationData = animationData
    this.rotation = options.rotation || 0
    this.tint = options.tint || { r: 1, g: 1, b: 1, a: 1 }
    this.state = options.state || 'idle'
    this.visible = options.visible !== false
    this.scale = options.scale || 1
    this.animationSpeed = options.animationSpeed || 1
    this.frame = options.frame || 0
  }

  // Update entity animation frame
  update(deltaTime) {
    // Simply advance the frame time - let the animation engine handle the rest
    this.frame += deltaTime * this.animationSpeed
  }

  // Get rendering properties for the animation engine
  getRenderProps(currentTime = 0, startTime = 0) {
    // Calculate the frame that should be displayed at the current time
    const elapsedTime = (currentTime - startTime) / 1000 // Convert to seconds
    const currentFrame = elapsedTime * this.animationSpeed * 60 // 60 FPS equivalent

    const renderProps = {
      frame: Math.floor(currentFrame),
      time: currentFrame / 60, // Frame-based timing at 60 FPS (like FactorioSprite)
      tint: this.tint,
      rotation: this.rotation,
      scale: this.scale,
      animation_speed: this.animationSpeed,
      animationSpeedMultiplier: 1.0 // Use normal speed (like FactorioSprite)
    }

    return renderProps
  }
}

// Tile class for background tiles
class SceneTile {
  constructor(tileType, position, options = {}) {
    this.tileType = tileType
    this.position = position
    this.tint = options.tint || { r: 1, g: 1, b: 1, a: 1 }
    this.visible = options.visible !== false
  }
}

// Main scene engine class
export class FactorioSceneEngine {
  constructor(animationEngine) {
    this.animationEngine = animationEngine
    this.camera = new Camera()
    this.entities = new Map()
    this.tiles = new Map()
    this.effects = []
    this.sceneSize = { width: 32, height: 32 }
    this.tileSize = 32 // Factorio tile size in pixels
    this.startTime = Date.now()
    this.tileData = new Map() // Cache for tile data
    this.tileImages = new Map() // Cache for loaded tile images
  }

  // Set scene size in tiles
  setSceneSize(width, height) {
    this.sceneSize = { width, height }
  }

  // Load tile data from Factorio data
  loadTileData(tileName, factorioData) {
    if (this.tileData.has(tileName)) {
      return this.tileData.get(tileName)
    }

    const tileData = factorioData.tile[tileName]

    if (tileData) {
      this.tileData.set(tileName, tileData)
      console.log(`✅ Loaded tile data for: ${tileName}`)
    } else {
      console.warn(`⚠️ No tile data found for: ${tileName}`)
    }

    return tileData
  }

  // Load tile image - only main sprite for now
  async loadTileImage(tileName, tileData) {
    if (this.tileImages.has(tileName)) {
      return this.tileImages.get(tileName)
    }

    if (!tileData) {
      return null
    }

    // Get the first variant from the variants.main array
    let spriteDescriptor = null
    if (tileData.variants && tileData.variants.main && tileData.variants.main[0]) {
      spriteDescriptor = tileData.variants.main[0]
    }

    if (!spriteDescriptor || !spriteDescriptor.picture) {
      return null
    }

    try {
      // Use the animation engine's image loader
      const image = await this.animationEngine.imageLoader(spriteDescriptor.picture)
      this.tileImages.set(tileName, image)
      return image
    } catch (error) {
      console.warn(`⚠️ Failed to load tile image for ${tileName}:`, error)
      return null
    }
  }

  // Camera controls
  setCameraPosition(x, y) {
    this.camera.x = x
    this.camera.y = y
  }

  setCameraZoom(zoom) {
    this.camera.zoom = Math.max(0.1, Math.min(10, zoom))
  }

  setCameraRotation(rotation) {
    this.camera.rotation = rotation
  }

  // Entity management
  addEntity(id, name, position, animationData, options = {}) {
    const entity = new SceneEntity(name, position, animationData, options)
    this.entities.set(id, entity)
    return entity
  }

  removeEntity(id) {
    return this.entities.delete(id)
  }

  getEntity(id) {
    return this.entities.get(id)
  }

  updateEntity(id, updates) {
    const entity = this.entities.get(id)
    if (entity) {
      Object.assign(entity, updates)
    }
    return entity
  }

  // Tile management
  addTile(id, tileType, position, options = {}) {
    const tile = new SceneTile(tileType, position, options)
    this.tiles.set(id, tile)
    return tile
  }

  removeTile(id) {
    return this.tiles.delete(id)
  }

  getTile(id) {
    return this.tiles.get(id)
  }

  // Update all entities in the scene
  update(deltaTime) {
    for (const entity of this.entities.values()) {
      entity.update(deltaTime)
    }
  }

  // Render the complete scene
  async render(ctx, props = {}) {
    const canvasWidth = ctx.canvas.width
    const canvasHeight = ctx.canvas.height

    // Debug logging
    if (Math.random() < 0.01) {
      // Log 1% of the time
      console.log(`🎬 SceneEngine.render: ${this.entities.size} entities, ${this.tiles.size} tiles`)
    }

    // Apply camera transformation
    this.camera.applyTransform(ctx, canvasWidth, canvasHeight)

    try {
      // Render tiles first (background)
      this.renderTiles(ctx, props)

      // Render entities
      await this.renderEntities(ctx, props)

      // Render effects
      //await this.renderEffects(ctx, props)
    } finally {
      // Always reset camera transformation
      this.camera.resetTransform(ctx)
    }
  }

  // Render all tiles in the scene
  renderTiles(ctx, props = {}) {
    // First render the background checkerboard pattern
    this.renderBackground(ctx, props)

    // Then render the actual tiles - optimized for tuple-based data
    this.renderTilesByType(ctx)
  }

  // Optimized tile rendering using tuple structure for batch operations
  renderTilesByType(ctx) {
    // Group tiles by type for efficient batch rendering
    const tilesByType = new Map()

    for (const tile of this.tiles.values()) {
      if (!tile.visible) continue

      if (!tilesByType.has(tile.tileType)) {
        tilesByType.set(tile.tileType, [])
      }
      tilesByType.get(tile.tileType).push(tile)
    }

    // Render each tile type in batches
    for (const [tileType, tiles] of tilesByType) {
      const tileData = this.tileData.get(tileType)
      const tileImage = this.tileImages.get(tileType)

      if (tileImage && tileData) {
        // Batch render using the same image
        this.renderTileBatch(ctx, tiles, tileImage)
      }
    }
  }

  // Batch render multiple tiles of the same type
  renderTileBatch(ctx, tiles, tileImage) {
    ctx.save()

    for (const tile of tiles) {
      ctx.save()
      ctx.translate(tile.position.x * this.tileSize, tile.position.y * this.tileSize)

      // Get sprite descriptor for scale and size from main variant
      const tileData = this.tileData.get(tile.tileType)
      let spriteDescriptor = null
      if (tileData.variants && tileData.variants.main && tileData.variants.main[0]) {
        spriteDescriptor = tileData.variants.main[0]
      }

      const scale = spriteDescriptor?.scale || 1
      const size = spriteDescriptor?.size || 1

      // Calculate scaled dimensions
      const scaledSize = this.tileSize * scale * size
      const offsetX = (this.tileSize - scaledSize) / 2
      const offsetY = (this.tileSize - scaledSize) / 2

      // Render with proper scaling
      try {
        // For sprite sheets, we need to draw just one tile from the sheet
        const spriteWidth = tileImage.width / spriteDescriptor.count
        const spriteHeight = tileImage.height

        // Use a deterministic "random" tile based on position for consistent appearance
        const tileIndex = Math.floor(
          (tile.position.x * 31 + tile.position.y * 17) % spriteDescriptor.count
        )
        const sourceX = tileIndex * spriteWidth
        const sourceY = 0

        this.logTileImage(tileImage)

        ctx.drawImage(
          tileImage,
          sourceX,
          sourceY,
          spriteWidth,
          spriteHeight, // Source rectangle
          offsetX,
          offsetY,
          32,
          32 // Destination rectangle
        )
      } catch (error) {
        console.warn(`⚠️ Failed to draw tile image for ${tile.tileType}:`, error)
        // Fallback to colored rectangle
        ctx.fillStyle = '#8D6E63'
        ctx.fillRect(0, 0, this.tileSize, this.tileSize)
      }

      // Apply tile tint if specified
      if (false && tile.tint) {
        ctx.globalAlpha = tile.tint.a
        ctx.fillStyle = `rgba(${Math.floor(tile.tint.r * 255)}, ${Math.floor(tile.tint.g * 255)}, ${Math.floor(tile.tint.b * 255)}, ${tile.tint.a})`
        ctx.fillRect(0, 0, this.tileSize, this.tileSize)
      }

      ctx.restore()
    }

    ctx.restore()
  }

  logTileImage = tileImage => {
    console.log(tileImage)
    debugger
    this.logTileImage = () => {}
  }

  // Render background checkerboard pattern for empty areas
  renderBackground(ctx, _props = {}) {
    const canvasWidth = ctx.canvas.width
    const canvasHeight = ctx.canvas.height

    // Calculate the visible area in world coordinates
    const cameraBounds = this.getCameraBounds(canvasWidth, canvasHeight)

    // Calculate tile bounds
    const startX = Math.floor(cameraBounds.minX / this.tileSize)
    const startY = Math.floor(cameraBounds.minY / this.tileSize)
    const endX = Math.ceil(cameraBounds.maxX / this.tileSize)
    const endY = Math.ceil(cameraBounds.maxY / this.tileSize)

    // Render checkerboard pattern for each tile position
    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        // Check if this position has a tile
        const hasTile = Array.from(this.tiles.values()).some(
          tile => tile.position.x === x && tile.position.y === y
        )

        if (!hasTile) {
          // Render checkerboard pattern for empty tiles
          this.renderCheckerboardTile(ctx, x, y)
        }
      }
    }
  }

  // Render a single checkerboard tile
  renderCheckerboardTile(ctx, tileX, tileY) {
    ctx.save()

    // Position the tile
    const worldX = tileX * this.tileSize
    const worldY = tileY * this.tileSize
    ctx.translate(worldX, worldY)

    // Determine checkerboard color
    const isEven = (tileX + tileY) % 2 === 0
    const lightColor = '#2a2a2a'
    const darkColor = '#1a1a1a'

    ctx.fillStyle = isEven ? lightColor : darkColor
    ctx.fillRect(0, 0, this.tileSize, this.tileSize)

    ctx.restore()
  }

  // Get camera bounds in world coordinates
  getCameraBounds(canvasWidth, canvasHeight) {
    const halfWidth = canvasWidth / (2 * this.camera.zoom)
    const halfHeight = canvasHeight / (2 * this.camera.zoom)

    return {
      minX: this.camera.x - halfWidth,
      maxX: this.camera.x + halfWidth,
      minY: this.camera.y - halfHeight,
      maxY: this.camera.y + halfHeight
    }
  }

  // Render all entities in the scene
  async renderEntities(ctx, _props = {}) {
    // Sort entities by position for proper layering
    const sortedEntities = Array.from(this.entities.values())
      .filter(entity => entity.visible)
      .sort((a, b) => {
        // Sort by Y position first (entities further down render on top)
        const yDiff = b.position.y - a.position.y
        if (yDiff !== 0) return yDiff
        // Then by X position
        return a.position.x - b.position.x
      })

    const entityPromises = []
    for (const entity of sortedEntities) {
      entityPromises.push(this.renderEntity(ctx, entity))
    }
    await Promise.all(entityPromises)
  }

  // Render a single entity
  async renderEntity(ctx, entity) {
    if (!entity.animationData) {
      console.warn(`⚠️ Entity ${entity.name} has no animation data`)
      return
    }

    ctx.save()

    // Position the entity in world coordinates
    const worldX = entity.position.x * this.tileSize
    const worldY = entity.position.y * this.tileSize

    // Don't translate the context - let the animation engine handle positioning
    // ctx.translate(worldX, worldY)

    // Apply entity rotation
    if (entity.rotation !== 0) {
      ctx.rotate(entity.rotation)
    }

    // Apply entity scale
    if (entity.scale !== 1) {
      ctx.scale(entity.scale, entity.scale)
    }

    // Debug: Log entity rendering
    if (Math.random() < 0.01) {
      // Log 1% of the time
      console.log(
        `🎭 Rendering entity: ${entity.name} at world (${worldX}, ${worldY}) from position (${entity.position.x}, ${entity.position.y})`
      )
    }

    // Use the animation engine's new custom positioning feature
    const renderProps = entity.getRenderProps(Date.now(), this.startTime || 0)

    // Add custom positioning to center the entity at the current context position
    // Check for NaN values and provide fallbacks
    const _width = isNaN(entity.animationData.width) ? 64 : entity.animationData.width
    const _height = isNaN(entity.animationData.height) ? 64 : entity.animationData.height

    // The customPosition should be the center of the entity
    // The animation engine will center the sprite at this position, then apply shift values
    renderProps.customPosition = {
      x: worldX, // World position (center of entity)
      y: worldY // World position (center of entity)
    }

    // Skip background rendering for scene entities
    renderProps.skipBackground = true

    // Render the entity using the animation engine with custom positioning
    try {
      await this.animationEngine.render(ctx, entity.animationData, renderProps)
    } catch (error) {
      console.error(`❌ Failed to render ${entity.name}:`, error)
    }

    ctx.restore()
  }

  // Render effects (particles, etc.)
  async renderEffects(ctx, _props = {}) {
    // Placeholder for effects rendering
    // This would handle particle systems, lighting effects, etc.
  }

  // Create a scene from data structure
  static createFromData(sceneData, animationEngine) {
    const scene = new FactorioSceneEngine(animationEngine)

    // Set scene properties
    if (sceneData.size) {
      scene.setSceneSize(sceneData.size.width, sceneData.size.height)
    }

    // Set camera
    if (sceneData.camera_position) {
      scene.setCameraPosition(sceneData.camera_position.x, sceneData.camera_position.y)
    }
    if (sceneData.camera_zoom) {
      scene.setCameraZoom(sceneData.camera_zoom)
    }
    if (sceneData.camera_rotation) {
      scene.setCameraRotation(sceneData.camera_rotation)
    }

    // Add entities
    if (sceneData.entities) {
      sceneData.entities.forEach((entityData, index) => {
        scene.addEntity(
          entityData.id || `entity-${index}`,
          entityData.name,
          entityData.position,
          entityData.animationData,
          {
            rotation: entityData.rotation,
            tint: entityData.tint,
            state: entityData.state,
            scale: entityData.scale,
            animationSpeed: entityData.animationSpeed
          }
        )
      })
    }

    // Add tiles
    if (sceneData.tiles) {
      Object.entries(sceneData.tiles).forEach(([tileType, positions]) => {
        positions.forEach((position, index) => {
          scene.addTile(`${tileType}-${index}`, tileType, { x: position[0], y: position[1] })
        })
      })
    }

    return scene
  }

  // Get scene bounds for camera positioning
  getSceneBounds() {
    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    // Check entity bounds
    for (const entity of this.entities.values()) {
      minX = Math.min(minX, entity.position.x)
      minY = Math.min(minY, entity.position.y)
      maxX = Math.max(maxX, entity.position.x)
      maxY = Math.max(maxY, entity.position.y)
    }

    // Check tile bounds
    for (const tile of this.tiles.values()) {
      minX = Math.min(minX, tile.position.x)
      minY = Math.min(minY, tile.position.y)
      maxX = Math.max(maxX, tile.position.x)
      maxY = Math.max(maxY, tile.position.y)
    }

    return {
      minX: isFinite(minX) ? minX : 0,
      minY: isFinite(minY) ? minY : 0,
      maxX: isFinite(maxX) ? maxX : this.sceneSize.width,
      maxY: isFinite(maxY) ? maxY : this.sceneSize.height,
      width: isFinite(maxX - minX) ? maxX - minX : this.sceneSize.width,
      height: isFinite(maxY - minY) ? maxY - minY : this.sceneSize.height
    }
  }

  // Center camera on scene
  centerCamera() {
    const bounds = this.getSceneBounds()
    this.setCameraPosition(bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2)
  }

  // Fit entire scene in view
  fitSceneInView(canvasWidth, canvasHeight) {
    const bounds = this.getSceneBounds()
    const sceneWidth = bounds.width * this.tileSize
    const sceneHeight = bounds.height * this.tileSize

    const scaleX = canvasWidth / sceneWidth
    const scaleY = canvasHeight / sceneHeight
    const zoom = Math.min(scaleX, scaleY) * 0.9 // 90% to leave some margin

    this.setCameraZoom(zoom)
    this.centerCamera()
  }
}

// Factory function to create a scene engine
export function createFactorioSceneEngine(animationEngine) {
  return new FactorioSceneEngine(animationEngine)
}

// Export scene layer constants
export { SCENE_LAYERS }

// Default export
export default FactorioSceneEngine
