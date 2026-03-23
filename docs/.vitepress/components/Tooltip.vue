<template>
  <ClientOnly>
    <span
      ref="triggerRef"
      class="tooltip-trigger"
      :tabindex="focusableTrigger ? 0 : -1"
      :role="focusableTrigger ? 'button' : null"
      :aria-describedby="tooltipId"
      :style="style"
      @mouseenter="showTooltip"
      @mouseleave="hideTooltip"
      @focusin="showTooltip"
      @focusout="hideTooltip"
    >
      <slot />
      <Teleport to="body">
        <div
          v-if="isVisible && shouldShowTooltips"
          ref="tooltipRef"
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
            <div
              v-if="isLoading"
              class="tooltip-loading"
            >Loading...</div>
            <template v-else>
              <template
                v-for="(tooltipData, index) in tooltipDatas"
                :key="index"
              >
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
                </div>
                <div
                  v-if="tooltipData?.description || tooltipData.statistics?.length > 0"
                  class="tooltip-info-box"
                >
                  <div
                    v-if="tooltipData?.description"
                    class="tooltip-description"
                    :class="{
                      'tooltip-error': hasError
                    }"
                  >
                    <FactorioRichText :text="tooltipData.description" />
                  </div>
                  <Statistics
                    v-if="tooltipData.statistics?.length > 0"
                    :statistics="tooltipData.statistics"
                    :embedded="true"
                  />
                </div>
                <!-- Render sections using DetailsPaneSection components -->
                <div
                  v-if="tooltipData?.sections?.length"
                  class="tooltip-sections"
                >
                  <DetailsPaneSection
                    v-for="(section, sectionIndex) in tooltipData.sections"
                    :key="`${section.type}-${sectionIndex}`"
                    :show-tooltip="false"
                    visual-context="tooltip"
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
import { computeTooltipPosition } from './tooltipPosition.js'

import DetailsPaneSection from './DetailsPaneSection.vue'
import FactorioRichText from './FactorioRichText.vue'
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
  },
  focusableTrigger: {
    type: Boolean,
    default: true
  }
})

// Reactive state
const isVisible = ref(false)
const tooltipDatas = ref(null)
const tooltipStyle = ref({})
const showTimeout = ref(null)
const hideTimeout = ref(null)
const heartbeatInterval = ref(null)
const isLoading = ref(false)
const hasError = ref(false)
const mousePosition = ref({ x: 0, y: 0 })
const triggerRef = ref(null)
const tooltipRef = ref(null)
const lastInteractiveAt = ref(Date.now())

const TOOLTIP_HIDE_GRACE_MS = 350
const TOOLTIP_HEARTBEAT_MS = 150

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

function getCurrentTooltipPosition(tooltipRect) {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  return computeTooltipPosition(
    { x: mousePosition.value.x, y: mousePosition.value.y },
    tooltipRect,
    viewport
  )
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
      const { top, left } = getCurrentTooltipPosition(tooltipRect)

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
  const { top, left } = getCurrentTooltipPosition(tooltipRect)

  // Update position smoothly without hiding
  tooltipStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 9999
  }
}

function markTooltipInteractive() {
  lastInteractiveAt.value = Date.now()
}

function isEventInsideTooltipTree() {
  const trigger = triggerRef.value
  const tooltip = tooltipRef.value
  if (!trigger && !tooltip) {
    return false
  }

  const pointElement = document.elementFromPoint(mousePosition.value.x, mousePosition.value.y)
  const isPointerInTrigger = Boolean(pointElement && trigger?.contains(pointElement))
  const isPointerInTooltip = Boolean(pointElement && tooltip?.contains(pointElement))
  const activeElement = document.activeElement
  const isFocusInTrigger = Boolean(activeElement && trigger?.contains(activeElement))
  const isFocusInTooltip = Boolean(activeElement && tooltip?.contains(activeElement))

  return isPointerInTrigger || isPointerInTooltip || isFocusInTrigger || isFocusInTooltip
}

function stopHeartbeat() {
  if (heartbeatInterval.value) {
    clearInterval(heartbeatInterval.value)
    heartbeatInterval.value = null
  }
}

function startHeartbeat() {
  stopHeartbeat()
  heartbeatInterval.value = setInterval(() => {
    if (!isVisible.value) {
      return
    }

    if (isEventInsideTooltipTree()) {
      markTooltipInteractive()
      return
    }

    if (Date.now() - lastInteractiveAt.value > TOOLTIP_HIDE_GRACE_MS) {
      closeTooltip()
    }
  }, TOOLTIP_HEARTBEAT_MS)
}

// Close tooltip
function closeTooltip() {
  isVisible.value = false
  tooltipDatas.value = null
  isLoading.value = false
  hasError.value = false
  stopHeartbeat()

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

  markTooltipInteractive()
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
        startHeartbeat()
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
        startHeartbeat()
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
      startHeartbeat()
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
    closeTooltip()
  }, 100)
}

// Handle mouse enter on tooltip itself
function handleTooltipMouseEnter() {
  markTooltipInteractive()
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

  if (isVisible.value && isEventInsideTooltipTree()) {
    markTooltipInteractive()
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
  stopHeartbeat()
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
  width: max-content;
  max-width: min(560px, calc(100vw - 16px));
  min-width: 0;
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
  display: grid;
  gap: 8px;
}

.tooltip-header {
  margin: 0;
}

.tooltip-title {
  font-weight: 600;
  font-size: 16px;
  color: #ffffff;
  margin: 0;
  line-height: 1.3;
}

.tooltip-description {
  font-size: 13px;
  color: #cccccc;
  margin: 0;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.tooltip-info-box {
  margin-bottom: 12px;
  padding: 10px;
  background: linear-gradient(135deg, #2d2d2d, #252525);
  border-radius: 2px;
  border: 1px solid #3f3f3f;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 1px 2px rgba(0, 0, 0, 0.35);
  display: grid;
  gap: 8px;
}

.tooltip-description p {
  margin: 0;
}

.tooltip-sections {
  margin-top: 0;
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
  max-height: 120px;
  overflow-y: auto;
  background: #111111;
  border: 1px solid #444444;
  border-radius: 2px;
  padding: 4px;
}

.tooltip-sections :deep(.itemEntry) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 12px;
  color: #cccccc;
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
