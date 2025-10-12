<template>
  <ClientOnly>
    <span
      class="tooltip-trigger"
      tabindex="0"
      role="button"
      :aria-describedby="tooltipId"
      :style="style"
      @mouseenter="showTooltip"
      @mouseleave="hideTooltip"
      @focus="showTooltip"
      @blur="hideTooltip"
    >
      <slot />
      <Teleport to="body">
        <div
          v-if="isVisible && shouldShowTooltips"
          :id="tooltipId"
          :class="tooltipClasses"
          :style="tooltipStyle"
          role="tooltip"
          :aria-hidden="!isVisible"
          tabindex="0"
          @mouseenter="handleTooltipMouseEnter"
          @mouseleave="handleTooltipMouseLeave"
        >
          <div class="tooltip-content">
            <div v-if="isLoading" class="tooltip-loading">Loading...</div>
            <template v-else>
              <template v-for="(tooltipData, index) in tooltipDatas" :key="index">
                <div class="tooltip-header">
                  <div
                    v-if="tooltipData?.title"
                    class="tooltip-title"
                    :class="{
                      'tooltip-error': hasError
                    }"
                  >
                    {{ tooltipData.title }}
                  </div>
                  <button
                    class="tooltip-close-button"
                    title="Close tooltip"
                    aria-label="Close tooltip"
                    @click.stop="closeTooltip"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path
                        d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                      />
                    </svg>
                  </button>
                </div>
                <div
                  v-if="tooltipData?.description"
                  class="tooltip-description"
                  :class="{
                    'tooltip-error': hasError
                  }"
                >
                  <p>{{ tooltipData.description }}</p>
                </div>
                <Statistics
                  v-if="tooltipData.statistics?.length > 0"
                  :statistics="tooltipData.statistics"
                />
                <!-- Render sections using DetailsPaneSection components -->
                <div v-if="tooltipData?.sections?.length" class="tooltip-sections">
                  <DetailsPaneSection
                    v-for="(section, sectionIndex) in tooltipData.sections"
                    :key="`${section.type}-${sectionIndex}`"
                    :show-tooltip="false"
                    :section="section"
                  />
                </div>
              </template>
            </template>
          </div>
          <div class="tooltip-arrow" />
        </div>
      </Teleport>
    </span>
    <template #fallback>
      <slot />
    </template>
  </ClientOnly>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

import { useTooltipData } from '../../../src/composables/useTooltipData.js'

import DetailsPaneSection from './DetailsPaneSection.vue'
import Statistics from './Statistics.vue'

// Props
const props = defineProps({
  itemId: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'item' // 'items', 'recipes', 'fluids', 'buildings', etc.
  },
  delay: {
    type: Number,
    default: 0
  },
  style: {
    type: [String, Object],
    default: null
  }
})

// Reactive state
const isVisible = ref(false)
const tooltipDatas = ref(null)
const tooltipStyle = ref({})
const showTimeout = ref(null)
const hideTimeout = ref(null)
const isLoading = ref(false)
const hasError = ref(false)
const mousePosition = ref({ x: 0, y: 0 })

// Generate unique tooltip ID
const tooltipId = computed(
  () => `tooltip-${props.itemId}-${Math.random().toString(36).substr(2, 9)}`
)

// Detect if we should show tooltips (disable on mobile)
const shouldShowTooltips = computed(() => {
  // Don't show tooltips on mobile devices
  if (isTouchDevice()) {
    return false
  }
  return true
})

// Tooltip classes
const tooltipClasses = computed(() => ({
  'tooltip-visible': isVisible.value,
  tooltip: true
}))

// Use shared tooltip data composable
const { isLoadingTooltips, hasTooltipsData, loadTooltipsData, getTooltipData } = useTooltipData()

// Get tooltip data using the composable
function getTooltipDataForItem(category = props.category, itemId = props.itemId) {
  return getTooltipData(category, itemId)
}

// Position tooltip relative to cursor (Factorio-style)
function positionTooltip() {
  nextTick(() => {
    const tooltip = document.getElementById(tooltipId.value)

    if (!tooltip) {
      console.log('Missing tooltip element')
      return
    }

    // Hide tooltip while positioning to prevent visual shrinking
    tooltip.style.opacity = '0'
    tooltip.style.visibility = 'hidden'

    // Allow natural sizing but ensure content is rendered first
    // Force a reflow to get accurate dimensions after content loads
    void tooltip.offsetHeight

    // Wait for content to fully render and get final dimensions
    setTimeout(() => {
      const tooltipRect = tooltip.getBoundingClientRect()
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      }

      // Always position relative to current cursor position
      const cursorX = mousePosition.value.x
      const cursorY = mousePosition.value.y

      // Default positioning: 36px right, 24px down (top-left corner of tooltip)
      let top = cursorY + 24
      let left = cursorX + 36

      // Check if tooltip would go offscreen and adjust accordingly
      let needsHorizontalFlip = false
      let needsVerticalFlip = false

      // Check right edge
      if (left + tooltipRect.width > viewport.width - 8) {
        needsHorizontalFlip = true
      }

      // Check bottom edge
      if (top + tooltipRect.height > viewport.height - 8) {
        needsVerticalFlip = true
      }

      // Apply flips based on which edges would be exceeded
      if (needsHorizontalFlip) {
        // Move to left side: 36px left of cursor
        left = cursorX - tooltipRect.width - 36
      }

      if (needsVerticalFlip) {
        // Move to top side: 24px up from cursor
        top = cursorY - tooltipRect.height - 24
      }

      // Final boundary check to ensure tooltip stays within viewport
      if (left < 8) left = 8
      if (left + tooltipRect.width > viewport.width - 8) {
        left = viewport.width - tooltipRect.width - 8
      }
      if (top < 8) top = 8
      if (top + tooltipRect.height > viewport.height - 8) {
        top = viewport.height - tooltipRect.height - 8
      }

      // Set the final position
      tooltipStyle.value = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 9999
      }

      // Show tooltip after positioning is complete
      tooltip.style.opacity = ''
      tooltip.style.visibility = ''
    }, 0) // Use setTimeout to ensure content is fully rendered
  })
}

// Update tooltip position without hiding/showing (for cursor following)
function updateTooltipPosition() {
  const tooltip = document.getElementById(tooltipId.value)

  if (!tooltip || !isVisible.value) {
    return
  }

  const tooltipRect = tooltip.getBoundingClientRect()
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  // Always position relative to current cursor position
  const cursorX = mousePosition.value.x
  const cursorY = mousePosition.value.y

  // Default positioning: 36px right, 24px down (top-left corner of tooltip)
  let top = cursorY + 24
  let left = cursorX + 36

  // Check if tooltip would go offscreen and adjust accordingly
  let needsHorizontalFlip = false
  let needsVerticalFlip = false

  // Check right edge
  if (left + tooltipRect.width > viewport.width - 8) {
    needsHorizontalFlip = true
  }

  // Check bottom edge
  if (top + tooltipRect.height > viewport.height - 8) {
    needsVerticalFlip = true
  }

  // Apply flips based on which edges would be exceeded
  if (needsHorizontalFlip) {
    // Move to left side: 36px left of cursor
    left = cursorX - tooltipRect.width - 36
  }

  if (needsVerticalFlip) {
    // Move to top side: 24px up from cursor
    top = cursorY - tooltipRect.height - 24
  }

  // Final boundary check to ensure tooltip stays within viewport
  if (left < 8) left = 8
  if (left + tooltipRect.width > viewport.width - 8) {
    left = viewport.width - tooltipRect.width - 8
  }
  if (top < 8) top = 8
  if (top + tooltipRect.height > viewport.height - 8) {
    top = viewport.height - tooltipRect.height - 8
  }

  // Update position smoothly without hiding
  tooltipStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 9999
  }
}

// Close tooltip
function closeTooltip() {
  isVisible.value = false
  tooltipDatas.value = null
  isLoading.value = false
  hasError.value = false

  // Clear all timeouts
  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
    showTimeout.value = null
  }
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
}

// Show tooltip
function showTooltip() {
  // Don't show tooltips on mobile devices
  if (!shouldShowTooltips.value) {
    return
  }

  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
  }
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }

  showTimeout.value = setTimeout(async () => {
    isLoading.value = true
    hasError.value = false

    try {
      // Load tooltip data if not already loaded
      if (!hasTooltipsData.value && !isLoadingTooltips.value) {
        console.log('Loading tooltip data for the first time')
        await loadTooltipsData()
      }

      // Check if tooltips data is still loading
      if (isLoadingTooltips.value) {
        tooltipDatas.value = [
          {
            title: 'Loading...',
            description: 'Loading tooltip data...',
            sections: []
          }
        ]
        isVisible.value = true
        positionTooltip()
        return
      }

      const data = getTooltipDataForItem()

      if (data) {
        tooltipDatas.value = [data]

        if (data.tooltipExtras) {
          for (const extra of data.tooltipExtras) {
            const extraData = getTooltipDataForItem(extra.type, extra.name)
            if (extraData) {
              tooltipDatas.value.push(extraData)
            }
          }
        }

        isVisible.value = true
        positionTooltip()

        // Announce to screen readers
        announceTooltip(data?.title || props.itemId)
      } else {
        // Show fallback message when no data is found
        tooltipDatas.value = [
          {
            title: props.itemId,
            description: `No tooltip data available for ${props.category}`,
            sections: []
          }
        ]
        isVisible.value = true
        console.log('No tooltip data found, showing fallback')
        positionTooltip()
      }
    } catch (error) {
      console.error('Error loading tooltip data:', error)
      hasError.value = true
      tooltipDatas.value = [
        {
          title: 'Error',
          description: 'Failed to load tooltip data',
          sections: []
        }
      ]
      isVisible.value = true
      positionTooltip()
    } finally {
      isLoading.value = false
    }
  }, props.delay)
}

// Hide tooltip
function hideTooltip() {
  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
    showTimeout.value = null
  }
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
  }

  hideTimeout.value = setTimeout(() => {
    isVisible.value = false
    tooltipDatas.value = null
    isLoading.value = false
    hasError.value = false
  }, 100)
}

// Handle mouse enter on tooltip itself
function handleTooltipMouseEnter() {
  // Clear any pending hide timeout when mouse enters tooltip
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
}

// Handle mouse leave on tooltip itself
function handleTooltipMouseLeave() {
  hideTooltip()
}

// Announce tooltip to screen readers
function announceTooltip(title) {
  // Create a temporary element for screen reader announcement
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.style.position = 'absolute'
  announcement.style.left = '-10000px'
  announcement.style.width = '1px'
  announcement.style.height = '1px'
  announcement.style.overflow = 'hidden'
  announcement.textContent = `Tooltip: ${title}`

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Handle window resize
function handleResize() {
  if (isVisible.value) {
    positionTooltip()
  }
}

// Handle mouse move to track cursor position
function handleMouseMove(event) {
  mousePosition.value = {
    x: event.clientX,
    y: event.clientY
  }

  // Reposition tooltip if it's visible (without hiding/showing)
  if (isVisible.value) {
    updateTooltipPosition()
  }
}

// Detect touch device
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Handle escape key globally
function handleKeydown(event) {
  if (event.key === 'Escape' && isVisible.value) {
    closeTooltip()
  }
}

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('mousemove', handleMouseMove)
  // Don't load tooltips data on mount - only load when tooltip is shown
})

onUnmounted(() => {
  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
  }
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
  }
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousemove', handleMouseMove)
})
</script>

<style scoped>
.tooltip-trigger {
  display: inline;
  cursor: help;
  text-decoration: none;
}

.tooltip-trigger:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
  border-radius: 2px;
}

.tooltip:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.tooltip {
  position: fixed;
  background: #222222;
  border: 1px solid #444444;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  max-width: 620px;
  min-width: 200px;
  width: max-content;
  z-index: 9999;
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  pointer-events: auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.tooltip-visible {
  opacity: 1;
  transform: translateY(0);
}

.tooltip-content {
  padding: 12px 16px;
  color: #cccccc;
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.tooltip-icon {
  flex-shrink: 0;
}

.tooltip-title {
  font-weight: 600;
  font-size: 16px;
  color: #ffffff;
  margin: 0;
  flex: 1;
}

.tooltip-close-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #888888;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tooltip-close-button:hover {
  background: #333333;
  color: #cccccc;
}

.tooltip-close-button:focus {
  outline: 2px solid #666666;
  outline-offset: 1px;
}

.tooltip-description {
  font-size: 13px;
  color: #cccccc;
  margin-bottom: 8px;
  line-height: 1.4;
}

.tooltip-sections {
  margin-top: 8px;
}

.tooltip-sections :deep(.section) {
  margin-bottom: 8px;
  padding: 8px;
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 2px;
}

.tooltip-sections :deep(.sectionTitle) {
  margin: 0 0 8px 0;
  color: #ffcc66;
  font-size: 13px;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tooltip-sections :deep(.itemsList) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tooltip-sections :deep(.itemsGrid) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
  gap: 2px;
  max-height: 120px;
  overflow-y: auto;
  background: #111111;
  border: 1px solid #444444;
  border-radius: 2px;
  padding: 4px;
  width: 100%;
}

.tooltip-sections :deep(.itemEntry) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 12px;
  color: #cccccc;
}

.tooltip-sections :deep(.itemEntry:hover) {
  background-color: #333333;
}

.tooltip-sections :deep(.gridItem) {
  width: 32px;
  height: 32px;
  background: #2a2a2a;
  border: 1px solid #444444;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tooltip-sections :deep(.gridItem:hover) {
  background: #3a3a3a;
  border-color: #666666;
}

.tooltip-sections :deep(.itemLabel) {
  color: #cccccc;
  font-size: 12px;
  flex: 1;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.tooltip-loading {
  font-size: 13px;
  color: #888888;
  font-style: italic;
}

.tooltip-error {
  color: #ff6666 !important;
}
</style>
