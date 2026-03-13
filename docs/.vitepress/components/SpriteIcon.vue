<template>
  <span
    ref="iconElement"
    class="sprite-icon"
    :class="iconClasses"
    :style="iconStyle"
    :title="title"
    :aria-label="ariaLabel"
  >
    <span v-if="!spriteData" class="sprite-icon-fallback">
      {{ fallbackText }}
    </span>
  </span>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { withBase } from 'vitepress'

import { loadSpritemapData } from '../../../src/index.js'

// Props
const props = defineProps({
  spriteKey: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: null
  },
  title: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  fallbackText: {
    type: String,
    default: '?'
  },
  color: {
    type: String,
    default: null
  }
})

// Reactive state
const spritemapData = ref(null)
const isLoading = ref(true)
const hasError = ref(false)
const iconElement = ref(null)
const containerSize = ref(32) // Default fallback size
const resizeObserver = ref(null)

// Computed properties
const iconSize = computed(() => {
  // If size prop is provided, use it
  if (props.size !== null) {
    const size = typeof props.size === 'string' ? parseInt(props.size) : props.size
    return Math.max(16, Math.min(128, size)) // Clamp between 16 and 128
  }

  // Otherwise, use the measured container size
  return Math.max(16, Math.min(128, containerSize.value))
})

const iconFillRatio = computed(() => {
  if (iconSize.value <= 20) return 0.9
  if (iconSize.value <= 28) return 0.88
  if (iconSize.value <= 40) return 0.86
  return 0.84
})

const iconClasses = computed(() => ({
  'sprite-icon-loading': isLoading.value,
  'sprite-icon-error': hasError.value
}))

const spriteData = computed(() => {
  if (!spritemapData.value || !spritemapData.value.sprites) {
    return null
  }
  const sprite = spritemapData.value.sprites[props.spriteKey]
  if (!sprite) {
    console.warn(`Sprite not found: ${props.spriteKey}`)
  }
  return sprite || null
})

const iconStyle = computed(() => {
  if (!spriteData.value || !spritemapData.value) {
    return {}
  }

  const targetSpriteSize = iconSize.value * iconFillRatio.value
  const scale = targetSpriteSize / Math.max(spriteData.value.width, spriteData.value.height)
  const scaledWidth = spriteData.value.width * scale
  const scaledHeight = spriteData.value.height * scale

  const style = {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    backgroundImage: `url(${withBase(`/data/${spritemapData.value.image.replace('.png', '.webp')}`)})`,
    backgroundPosition: `-${spriteData.value.x * scale}px -${spriteData.value.y * scale}px`,
    backgroundSize: `${spritemapData.value.width * scale}px ${spritemapData.value.height * scale}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated'
  }

  // Add color if color prop is provided
  if (props.color) {
    // Use CSS mask approach: set background color and use sprite as mask
    const baseUrl = withBase(`/data/${spritemapData.value.image}`)
    const scaledSheetWidth = spritemapData.value.width * scale
    const scaledSheetHeight = spritemapData.value.height * scale
    const scaledX = spriteData.value.x * scale
    const scaledY = spriteData.value.y * scale

    // Override the background image with solid color and mask
    style.background = props.color
    style.backgroundImage = 'none'
    style.webkitMask = `url(${baseUrl}) no-repeat`
    style.webkitMaskPosition = `-${scaledX}px -${scaledY}px`
    style.webkitMaskSize = `${scaledSheetWidth}px ${scaledSheetHeight}px`
    style.mask = `url(${baseUrl}) no-repeat`
    style.maskPosition = `-${scaledX}px -${scaledY}px`
    style.maskSize = `${scaledSheetWidth}px ${scaledSheetHeight}px`
  }

  // console.log(`SpriteIcon style for ${props.spriteKey}:`, style)
  return style
})

// Function to measure container size
const measureContainer = () => {
  if (!iconElement.value) return

  const rect = iconElement.value.getBoundingClientRect()
  const parentRect = iconElement.value.parentElement?.getBoundingClientRect()

  if (parentRect) {
    // Use the smaller dimension to ensure the icon fits
    const size = Math.min(parentRect.width, parentRect.height)
    if (size > 0 && size !== containerSize.value) {
      containerSize.value = size
    }
  }
}

// Set up resize observer
const setupResizeObserver = () => {
  if (!iconElement.value || props.size !== null) return

  // Clean up existing observer
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }

  // Create new observer
  resizeObserver.value = new ResizeObserver(() => {
    nextTick(() => {
      measureContainer()
    })
  })

  // Observe the parent element (the container)
  if (iconElement.value.parentElement) {
    resizeObserver.value.observe(iconElement.value.parentElement)
  }
}

// Watch for size prop changes
watch(
  () => props.size,
  newSize => {
    if (newSize === null) {
      // Size prop removed, start auto-sizing
      nextTick(() => {
        measureContainer()
        setupResizeObserver()
      })
    } else {
      // Size prop provided, stop auto-sizing
      if (resizeObserver.value) {
        resizeObserver.value.disconnect()
        resizeObserver.value = null
      }
    }
  }
)

// Load spritemap data on mount
onMounted(async () => {
  try {
    isLoading.value = true
    hasError.value = false
    spritemapData.value = await loadSpritemapData(withBase)

    if (!spritemapData.value) {
      hasError.value = true
      console.error('Failed to load spritemap data')
    } else {
      // Set up auto-sizing if no size prop is provided
      if (props.size === null) {
        nextTick(() => {
          measureContainer()
          setupResizeObserver()
        })
      }
    }
  } catch (error) {
    console.error('Error loading spritemap data:', error)
    hasError.value = true
  } finally {
    isLoading.value = false
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
    resizeObserver.value = null
  }
})
</script>

<style scoped>
.sprite-icon {
  display: inline-block;
  vertical-align: middle;
  position: relative;
  flex-shrink: 0;
  width: auto;
  height: auto;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  filter:
    drop-shadow(0 1px 0 rgba(255, 255, 255, 0.06))
    drop-shadow(0 1px 1px rgba(0, 0, 0, 0.45));
}

.sprite-icon-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 12px;
  font-weight: bold;
  color: var(--vp-c-text-3);
  text-align: center;
}

.sprite-icon-loading .sprite-icon-fallback::after {
  content: '';
  width: 12px;
  height: 12px;
  animation: spin 1s linear infinite;
}

.sprite-icon-error .sprite-icon-fallback {
  background: var(--vp-c-danger-soft);
  border-color: var(--vp-c-danger-1);
  color: var(--vp-c-danger-1);
}

/* Size variants removed - using inline styles instead */

/* Dark mode adjustments */
.dark .sprite-icon-fallback {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-border);
  color: var(--vp-c-text-3);
}

.dark .sprite-icon-error .sprite-icon-fallback {
  background: var(--vp-c-danger-soft);
  border-color: var(--vp-c-danger-2);
  color: var(--vp-c-danger-2);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
