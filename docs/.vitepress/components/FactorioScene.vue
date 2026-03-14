<template>
  <div
    class="factorio-scene-container"
    :style="containerStyle"
  >
    <!-- Scene Canvas -->
    <canvas
      ref="sceneCanvas"
      :width="canvasWidth"
      :height="canvasHeight"
      class="factorio-scene-canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @wheel="onWheel"
    />

    <!-- Scene Controls -->
    <div class="scene-controls">
      <div class="control-group">
        <button
          class="control-button"
          :class="{ active: isPaused }"
          :title="isPaused ? 'Play animation' : 'Pause animation'"
          @click="togglePause"
        >
          <span v-if="isPaused">▶</span>
          <span v-else>⏸</span>
        </button>

        <button
          class="control-button"
          title="Reset camera"
          @click="resetCamera"
        >
          🎯
        </button>

        <button
          class="control-button"
          title="Fit scene in view"
          @click="fitScene"
        >
          📐
        </button>
      </div>

      <div class="control-group">
        <label class="control-label">Zoom: {{ Math.round(cameraZoom * 100) }}%</label>
        <input
          type="range"
          class="zoom-slider"
          :min="0.1"
          :max="5"
          :step="0.1"
          :value="cameraZoom"
          @input="onZoomChange"
        >
      </div>

      <div class="control-group">
        <label class="control-label">
          Camera: ({{ Math.round(cameraX) }}, {{ Math.round(cameraY) }})
        </label>
      </div>
    </div>

    <!-- Scene Info -->
    <div class="scene-info">
      <div class="info-item">
        <span class="info-label">Entities:</span>
        <span class="info-value">{{ entityCount }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Tiles:</span>
        <span class="info-value">{{ tileCount }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">FPS:</span>
        <span class="info-value">{{ Math.round(fps) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { withBase } from 'vitepress'

import { createFactorioAnimationEngine } from '../../../src/components/FactorioAnimationEngine.js'
import { createFactorioSceneEngine } from '../../../src/components/FactorioSceneEngine.js'
import { useFactorioPrototypeMapping } from '../../../src/composables/useFactorioPrototypeMapping.js'
import { resolveAssetUrl, resolveDataUrl } from '../../../src/components/assetResolver.js'

export default {
  name: 'FactorioScene',
  props: {
    sceneData: {
      type: Object,
      required: true
    },
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 600
    },
    playAnimation: {
      type: Boolean,
      default: true
    },
    showControls: {
      type: Boolean,
      default: true
    },
    showInfo: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const sceneCanvas = ref(null)
    const isPaused = ref(!props.playAnimation)
    const animationId = ref(null)
    const lastTime = ref(0)
    const fps = ref(0)
    const frameCount = ref(0)
    const lastFpsTime = ref(0)
    const lastRenderTime = ref(0)
    const startTime = ref(0)

    // Camera state
    const cameraX = ref(0)
    const cameraY = ref(0)
    const cameraZoom = ref(1)
    const cameraRotation = ref(0)

    // Mouse interaction
    const isDragging = ref(false)
    const lastMouseX = ref(0)
    const lastMouseY = ref(0)

    // Scene engine
    let sceneEngine = null
    let animationEngine = null

    // Computed properties
    const canvasWidth = computed(() => props.width)
    const canvasHeight = computed(() => props.height)

    const containerStyle = computed(() => ({
      width: `${props.width}px`,
      height: `${props.height}px`,
      position: 'relative',
      border: '2px solid #333',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#1a1a1a'
    }))

    const entityCount = computed(() => sceneEngine?.entities?.size || 0)
    const tileCount = computed(() => sceneEngine?.tiles?.size || 0)

    // Initialize scene engine
    const initializeScene = async () => {
      try {
        // Create animation engine
        animationEngine = createFactorioAnimationEngine({
          loadImage: createImageLoader(),
          applyDOMChanges: () => {
            // Handle DOM mutations for style changes
          },
          canvas: sceneCanvas.value,
          devicePixelRatio: window.devicePixelRatio || 2,
          graphicsPathMap: {}
        })

        // Create scene engine
        sceneEngine = createFactorioSceneEngine(animationEngine)

        // Load scene data
        if (props.sceneData) {
          await loadSceneData(props.sceneData)
        }

        // Set initial camera
        cameraX.value = sceneEngine.camera.x
        cameraY.value = sceneEngine.camera.y
        cameraZoom.value = sceneEngine.camera.zoom

        console.log('✅ Scene initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize scene:', error)
      }
    }

    // Load scene data
    const loadSceneData = async data => {
      if (!sceneEngine) return

      try {
        // Rebuild scene state on each load to avoid entity/tile accumulation.
        sceneEngine.entities.clear()
        sceneEngine.tiles.clear()

        // Set scene size
        if (data.size) {
          sceneEngine.setSceneSize(data.size.width, data.size.height)
        }

        // Set camera
        if (data.camera_position) {
          sceneEngine.setCameraPosition(data.camera_position.x, data.camera_position.y)
          cameraX.value = data.camera_position.x
          cameraY.value = data.camera_position.y
        }
        if (data.camera_zoom) {
          sceneEngine.setCameraZoom(data.camera_zoom)
          cameraZoom.value = data.camera_zoom
        }
        if (data.camera_rotation) {
          sceneEngine.setCameraRotation(data.camera_rotation)
          cameraRotation.value = data.camera_rotation
        }

        // Add entities
        if (data.entities) {
          console.log(`🏭 Loading ${data.entities.length} entities`)
          const entityPromises = data.entities.map(async entityData => {
            console.log(
              `🔧 Processing entity: ${entityData.name} at (${entityData.position.x}, ${entityData.position.y})`
            )

            // Load real Factorio entity data
            let resolvedEntityData = await loadEntityData(entityData.name)

            console.log(`🔍 Raw entity data for ${entityData.name}:`, resolvedEntityData)

            if (!resolvedEntityData) {
              console.warn(`⚠️ No entity data found for ${entityData.name}, creating fallback`)
              // Create a simple fallback entity data
              const fallbackData = {
                name: entityData.name,
                type: 'simple-entity',
                filename: `${entityData.name}.png`,
                width: 64,
                height: 64,
                frame_count: 1,
                line_length: 1,
                animation_speed: 1,
                layers: [
                  {
                    filename: `${entityData.name}.png`,
                    width: 64,
                    height: 64,
                    frame_count: 1,
                    line_length: 1,
                    animation_speed: 1,
                    type: 'base',
                    draw_as_shadow: false
                  }
                ]
              }
              resolvedEntityData = fallbackData
            }

            if (!resolvedEntityData) {
              console.warn(`⚠️ Skipping ${entityData.name} because animation data is unavailable`)
              return
            }

            const entity = sceneEngine.addEntity(
              entityData.id || `entity-${Math.random()}`,
              entityData.name,
              entityData.position,
              resolvedEntityData, // Use real Factorio data instead of mock
              {
                rotation: entityData.rotation || 0,
                tint: entityData.tint || { r: 1, g: 1, b: 1, a: 1 },
                state: entityData.state || 'idle',
                scale: entityData.scale || 1,
                animationSpeed: entityData.animationSpeed || 1
              }
            )

            console.log(`🏗️ Created entity with animation data:`, entity.animationData)

            console.log(`✅ Added entity: ${entityData.name}`, entity)
          })

          await Promise.all(entityPromises)
          console.log(`🎯 Scene now has ${sceneEngine.entities.size} entities`)
        }

        // Add tiles and load tile data
        if (data.tiles) {
          const tileTypes = new Set()
          Object.entries(data.tiles).forEach(([tileType, positions]) => {
            tileTypes.add(tileType)
            positions.forEach((position, index) => {
              sceneEngine.addTile(`${tileType}-${index}`, tileType, {
                x: position[0],
                y: position[1]
              })
            })
          })

          // Load tile data and images for all tile types
          console.log(`🏗️ Loading tile data for ${tileTypes.size} tile types`)
          const tileDataPromises = Array.from(tileTypes).map(async tileType => {
            try {
              const tileData = await sceneEngine.loadTileData(tileType, fullDataCache)
              if (tileData) {
                await sceneEngine.loadTileImage(tileType, tileData)
              }
            } catch (error) {
              console.warn(`⚠️ Failed to load tile data for ${tileType}:`, error)
            }
          })
          await Promise.all(tileDataPromises)
        }

        console.log(
          `✅ Scene loaded: ${sceneEngine.entities.size} entities, ${sceneEngine.tiles.size} tiles`
        )
      } catch (error) {
        console.error('❌ Failed to load scene data:', error)
      }
    }

    // Entity data cache
    const entityDataCache = new Map()
    let fullDataCache = null
    let entityTypes = null

    // Load real Factorio entity data with caching
    const loadEntityData = async entityName => {
      try {
        // Check cache first
        if (entityDataCache.has(entityName)) {
          console.log(`📋 Using cached data for: ${entityName}`)
          return entityDataCache.get(entityName)
        }

        console.log(`🔍 Loading entity data for: ${entityName}`)

        // Load full data only once
        if (!fullDataCache) {
          const response = await fetch(resolveDataUrl('data.json', withBase))
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          fullDataCache = await response.json()
          console.log('📦 Loaded data.json, keys:', Object.keys(fullDataCache))
        }

        // Get entity types only once
        if (!entityTypes) {
          entityTypes = useFactorioPrototypeMapping('en').baseTypeToSubtypes['entity']
          console.log('🏗️ Entity types:', entityTypes)
        }

        // Find the entity in the cached data
        for (const [prototypeType, prototypes] of Object.entries(fullDataCache)) {
          if (!entityTypes.includes(prototypeType)) {
            continue
          }
          console.log(`🔎 Checking ${prototypeType} for ${entityName}`)
          if (prototypes[entityName]) {
            console.log(`✅ Found ${entityName} in ${prototypeType}:`, prototypes[entityName])
            // Cache the result
            entityDataCache.set(entityName, prototypes[entityName])
            return prototypes[entityName]
          }
        }

        console.warn(`❌ Entity ${entityName} not found in data`)
        console.log(
          'Available entities:',
          Object.keys(fullDataCache).flatMap(type => Object.keys(fullDataCache[type] || {}))
        )
        // Cache null result to avoid repeated lookups
        entityDataCache.set(entityName, null)
        return null
      } catch (error) {
        console.error(`❌ Failed to load entity data for ${entityName}:`, error)
        return null
      }
    }

    // Create image loader using asset resolver (dev: local png, prod: CDN webp)
    const createImageLoader = () => {
      return filename => {
        const img = new Image()
        img.src = resolveAssetUrl(filename, withBase)
        return img
      }
    }

    // Animation loop with FPS cap but 60 FPS animation timing
    const animate = currentTime => {
      if (!sceneEngine || !sceneCanvas.value) return

      // Initialize start time on first frame
      if (startTime.value === 0) {
        startTime.value = currentTime
      }

      const deltaTime = (currentTime - lastTime.value) / 1000
      lastTime.value = currentTime

      // Always update animation at 60 FPS (continuous updates)
      if (!isPaused.value) {
        sceneEngine.update(deltaTime)
      }

      // Only render at 30 FPS for performance
      if (currentTime - lastRenderTime.value >= 33) {
        // 30 FPS = 33ms
        lastRenderTime.value = currentTime

        // Update FPS counter only for actual renders
        frameCount.value++
        if (currentTime - lastFpsTime.value >= 1000) {
          fps.value = frameCount.value
          frameCount.value = 0
          lastFpsTime.value = currentTime
        }

        renderScene()
      }

      // Continue animation at full speed
      animationId.value = requestAnimationFrame(animate)
    }

    // Render scene
    const renderScene = async () => {
      if (!sceneEngine || !sceneCanvas.value) return

      try {
        const ctx = sceneCanvas.value.getContext('2d')

        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

        // Set background
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)

        // Debug: Log scene state
        if (frameCount.value % 60 === 0) {
          // Log every 60 frames
          console.log(
            `🎨 Rendering scene: ${sceneEngine.entities.size} entities, ${sceneEngine.tiles.size} tiles`
          )
        }

        // Render scene
        await sceneEngine.render(ctx, {})

        // Update camera values
        cameraX.value = sceneEngine.camera.x
        cameraY.value = sceneEngine.camera.y
        cameraZoom.value = sceneEngine.camera.zoom
      } catch (error) {
        console.error('❌ Render error:', error)
      }
    }

    // Control functions
    const togglePause = () => {
      isPaused.value = !isPaused.value
    }

    const resetCamera = () => {
      if (!sceneEngine) return
      sceneEngine.centerCamera()
      cameraX.value = sceneEngine.camera.x
      cameraY.value = sceneEngine.camera.y
      cameraZoom.value = sceneEngine.camera.zoom
    }

    const fitScene = () => {
      if (!sceneEngine) return
      sceneEngine.fitSceneInView(canvasWidth.value, canvasHeight.value)
      cameraX.value = sceneEngine.camera.x
      cameraY.value = sceneEngine.camera.y
      cameraZoom.value = sceneEngine.camera.zoom
    }

    const onZoomChange = event => {
      const zoom = parseFloat(event.target.value)
      if (sceneEngine) {
        sceneEngine.setCameraZoom(zoom)
        cameraZoom.value = zoom
      }
    }

    // Mouse interaction
    const onMouseDown = event => {
      isDragging.value = true
      lastMouseX.value = event.clientX
      lastMouseY.value = event.clientY
    }

    const onMouseMove = event => {
      if (!isDragging.value || !sceneEngine) return

      const deltaX = event.clientX - lastMouseX.value
      const deltaY = event.clientY - lastMouseY.value

      // Convert screen delta to world delta
      const worldDeltaX = deltaX / cameraZoom.value
      const worldDeltaY = deltaY / cameraZoom.value

      // Update camera position
      sceneEngine.setCameraPosition(
        sceneEngine.camera.x - worldDeltaX,
        sceneEngine.camera.y - worldDeltaY
      )

      cameraX.value = sceneEngine.camera.x
      cameraY.value = sceneEngine.camera.y

      lastMouseX.value = event.clientX
      lastMouseY.value = event.clientY
    }

    const onMouseUp = () => {
      isDragging.value = false
    }

    const onWheel = event => {
      event.preventDefault()

      if (!sceneEngine) return

      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, cameraZoom.value * zoomFactor))

      sceneEngine.setCameraZoom(newZoom)
      cameraZoom.value = newZoom
    }

    // Lifecycle
    onMounted(async () => {
      await nextTick()
      await initializeScene()
      if (sceneEngine) {
        animationId.value = requestAnimationFrame(animate)
      }
    })

    onUnmounted(() => {
      if (animationId.value) {
        cancelAnimationFrame(animationId.value)
      }
    })

    // Watch for scene data changes
    watch(
      () => props.sceneData,
      async newData => {
        if (newData && sceneEngine) {
          await loadSceneData(newData)
        }
      },
      { deep: true }
    )

    return {
      sceneCanvas,
      isPaused,
      fps,
      cameraX,
      cameraY,
      cameraZoom,
      entityCount,
      tileCount,
      canvasWidth,
      canvasHeight,
      containerStyle,
      togglePause,
      resetCamera,
      fitScene,
      onZoomChange,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onWheel
    }
  }
}
</script>

<style scoped>
.factorio-scene-container {
  position: relative;
  display: inline-block;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.factorio-scene-canvas {
  display: block;
  cursor: grab;
  image-rendering: pixelated;
}

.factorio-scene-canvas:active {
  cursor: grabbing;
}

.scene-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.8);
  padding: 8px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

.control-button {
  background: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.control-button:hover {
  background: #444;
  border-color: #666;
}

.control-button.active {
  background: #007acc;
  border-color: #0099ff;
}

.control-label {
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

.zoom-slider {
  width: 100px;
  height: 4px;
  background: #333;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.zoom-slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  background: #007acc;
  border-radius: 50%;
  cursor: pointer;
}

.zoom-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #007acc;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.scene-info {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(0, 0, 0, 0.8);
  padding: 8px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  z-index: 10;
}

.info-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.info-label {
  color: #ccc;
}

.info-value {
  color: #fff;
  font-weight: 500;
}
</style>
