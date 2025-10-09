<template>
  <ClientOnly>
    <span
      class="tooltip-trigger"
      tabindex="0"
      role="button"
      :aria-describedby="tooltipId"
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
          class="tooltip"
          :class="tooltipClasses"
          :style="tooltipStyle"
          role="tooltip"
          :aria-hidden="!isVisible"
          :data-debug="`visible: ${isVisible}, data: ${!!tooltipDatas}`"
          tabindex="0"
          @mouseenter="handleTooltipMouseEnter"
          @mouseleave="handleTooltipMouseLeave"
        >
          <div class="tooltip-content">
            <div v-if="isLoading" class="tooltip-loading">Loading...</div>
            <template v-else>
              <template :key="index" v-for="(tooltipData, index) in tooltipDatas">
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
                    v-for="(section, index) in tooltipData.sections"
                    :show-tooltip="false"
                    :key="`${section.type}-${index}`"
                    :section="section"
                    @select-item="emit('select-item', $event)"
                    @item-selected="emit('item-selected', $event)"
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

import { useFactorioData } from '../../../src/index.js'
import { useDetailsData } from '../../../src/composables/useDetailsData.js'

import DetailsPaneSection from './DetailsPaneSection.vue'
import Statistics from './Statistics.vue'

// Emits
const emit = defineEmits(['select-item', 'item-selected'])

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
  position: {
    type: String,
    default: 'top',
    validator: value => ['top', 'bottom', 'left', 'right'].includes(value)
  },
  delay: {
    type: Number,
    default: 300
  },
  autoPinDelay: {
    type: Number,
    default: 10000 // Auto-pin after 2 seconds of hovering
  }
})

// Reactive state
const isVisible = ref(false)
const isPinned = ref(false)
const tooltipDatas = ref(null)
const tooltipStyle = ref({})
const showTimeout = ref(null)
const hideTimeout = ref(null)
const pinTimeout = ref(null)
const isLoading = ref(false)
const hasError = ref(false)

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
  [`tooltip-${props.position}`]: true,
  'tooltip-visible': isVisible.value,
  'tooltip-pinned': isPinned.value
}))

// Initialize composables
const { organizedData } = useFactorioData()
const { getDetailsData } = useDetailsData()

// Get tooltip data for specific item using the new system if not provided use props.category and props.itemId
function getTooltipData(category = props.category, itemId = props.itemId) {
  try {
    // Get the item data from the factorio data
    const itemData = organizedData.value[category][itemId]
    if (!itemData) {
      return null
    }

    const unifiedObject = {
      types: [category],
      [category]: itemData,
      displayName: itemData.displayName,
      description: itemData.description
    }

    if (props.category === 'entity') {
      // Include item data for entities for stack size
      unifiedObject.item = organizedData.value.item[itemId]
    }

    const { types } = unifiedObject

    // Generate details data for tooltip
    const detailsData = getDetailsData(types, unifiedObject, true, organizedData.value)

    return detailsData
  } catch (error) {
    console.error('Failed to get tooltip data:', error)
    return null
  }
}

// Position tooltip relative to trigger element
function positionTooltip() {
  nextTick(() => {
    const trigger = document.querySelector(`[aria-describedby="${tooltipId.value}"]`)
    const tooltip = document.getElementById(tooltipId.value)

    console.log('Positioning tooltip:', { trigger, tooltip, tooltipId: tooltipId.value })

    if (!trigger || !tooltip) {
      console.log('Missing trigger or tooltip element')
      return
    }

    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let top = 0
    let left = 0

    switch (props.position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'bottom':
        top = triggerRect.bottom + 8
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.left - tooltipRect.width - 8
        break
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.right + 8
        break
    }

    // Keep tooltip within viewport
    if (left < 8) left = 8
    if (left + tooltipRect.width > viewport.width - 8) {
      left = viewport.width - tooltipRect.width - 8
    }
    if (top < 8) top = 8
    if (top + tooltipRect.height > viewport.height - 8) {
      top = viewport.height - tooltipRect.height - 8
    }

    // Adjust positioning for touch devices
    if (isTouchDevice()) {
      // On touch devices, prefer positioning that doesn't cover the trigger
      const touchOffset = 20
      if (props.position === 'top' && top < triggerRect.bottom + touchOffset) {
        // Move to bottom if top would cover trigger
        top = triggerRect.bottom + touchOffset
      } else if (
        props.position === 'bottom' &&
        top + tooltipRect.height > triggerRect.top - touchOffset
      ) {
        // Move to top if bottom would cover trigger
        top = triggerRect.top - tooltipRect.height - touchOffset
      }
    }

    tooltipStyle.value = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999
    }
  })
}

// Start auto-pin timer
function startAutoPinTimer() {
  if (pinTimeout.value) {
    clearTimeout(pinTimeout.value)
  }
  return //temporarily disabled
  pinTimeout.value = setTimeout(() => {
    if (isVisible.value && !isPinned.value) {
      console.log('Auto-pinning tooltip after', props.autoPinDelay, 'ms')
      isPinned.value = true
      // Clear any hide timeout when auto-pinning
      if (hideTimeout.value) {
        clearTimeout(hideTimeout.value)
        hideTimeout.value = null
      }
    }
  }, props.autoPinDelay)
}

// Close tooltip
function closeTooltip() {
  isVisible.value = false
  isPinned.value = false
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
  if (pinTimeout.value) {
    clearTimeout(pinTimeout.value)
    pinTimeout.value = null
  }
}

// Show tooltip
function showTooltip() {
  // Don't show tooltips on mobile devices
  if (!shouldShowTooltips.value) {
    return
  }

  console.log('showTooltip called for', props.itemId, props.category)
  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
  }
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
  if (pinTimeout.value) {
    clearTimeout(pinTimeout.value)
    pinTimeout.value = null
  }

  showTimeout.value = setTimeout(() => {
    console.log('Loading tooltip data for', props.itemId, props.category)
    isLoading.value = true
    hasError.value = false

    try {
      const data = getTooltipData()
      console.log('Tooltip data loaded:', data)

      if (data) {
        tooltipDatas.value = [data]

        if (data.tooltipExtras) {
          for (const extra of data.tooltipExtras) {
            const extraData = getTooltipData(extra.type, extra.name)
            if (extraData) {
              tooltipDatas.value.push(extraData)
            }
          }
        }

        isVisible.value = true
        console.log('Setting tooltip visible, positioning...')
        positionTooltip()

        // Announce to screen readers
        announceTooltip(data?.title || props.itemId)

        // Start auto-pin timer
        startAutoPinTimer()
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

        // Start auto-pin timer
        startAutoPinTimer()
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

      // Start auto-pin timer
      startAutoPinTimer()
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
  if (pinTimeout.value) {
    clearTimeout(pinTimeout.value)
    pinTimeout.value = null
  }

  // Don't hide if pinned
  if (isPinned.value) {
    return
  }

  hideTimeout.value = setTimeout(() => {
    isVisible.value = false
    tooltipDatas.value = null
    isLoading.value = false
    hasError.value = false
    isPinned.value = false // Reset pin state when hiding
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
  // Only hide if not pinned
  if (!isPinned.value) {
    hideTooltip()
  }
}

// Handle keyboard events on tooltip itself
function handleTooltipKeydown(event) {
  // Escape to close tooltip
  if (event.key === 'Escape') {
    event.preventDefault()
    closeTooltip()
  }
  // Tab to move focus back to trigger
  else if (event.key === 'Tab') {
    // Let the browser handle tab navigation naturally
    // The tooltip will close on blur
  }
}

// Handle touch start on tooltip
function handleTooltipTouchStart(_event) {
  // Don't prevent default - let interactions work normally
  // Just keep tooltip pinned on touch
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
}

// Handle touch end on tooltip
function handleTooltipTouchEnd(_event) {
  // Don't prevent default - let interactions work normally
  // Just keep tooltip pinned on touch devices
  if (!isPinned.value) {
    isPinned.value = true
  }
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

// Handle click events on trigger element
function handleTriggerClick(event) {
  // Don't interfere with mobile devices
  if (!shouldShowTooltips.value) {
    return
  }

  // If tooltip is visible and pinned, close it
  if (isVisible.value && isPinned.value) {
    event.preventDefault()
    closeTooltip()
  }
  // If tooltip is visible but not pinned, pin it
  else if (isVisible.value && !isPinned.value) {
    event.preventDefault()
    isPinned.value = true
    // Clear any hide timeout when pinning
    if (hideTimeout.value) {
      clearTimeout(hideTimeout.value)
      hideTimeout.value = null
    }
  }
  // If tooltip is not visible, show it (but don't prevent default to allow button clicks)
  else if (!isVisible.value) {
    showTooltip()
  }
}

// Handle keyboard events on trigger element
function handleTriggerKeydown(event) {
  // Don't interfere with mobile devices
  if (!shouldShowTooltips.value) {
    return
  }

  // Enter or Space to show tooltip if not visible
  if ((event.key === 'Enter' || event.key === ' ') && !isVisible.value) {
    event.preventDefault()
    showTooltip()
  }
  // Escape to close tooltip if visible
  else if (event.key === 'Escape' && isVisible.value) {
    event.preventDefault()
    closeTooltip()
  }
}

// Handle touch start
function handleTouchStart(_event) {
  // Don't show tooltips on mobile devices
  if (!shouldShowTooltips.value) {
    return
  }

  // Just show tooltip if not visible
  if (!isVisible.value) {
    showTooltip()
  }
}

// Handle touch end
function handleTouchEnd(_event) {
  // Don't show tooltips on mobile devices
  if (!shouldShowTooltips.value) {
    return
  }

  // Just pin tooltip on touch devices after a short delay
  if (isVisible.value && !isPinned.value) {
    // Use a small delay to allow the button click to process first
    setTimeout(() => {
      if (isVisible.value && !isPinned.value) {
        isPinned.value = true
        // Clear any hide timeout when pinning
        if (hideTimeout.value) {
          clearTimeout(hideTimeout.value)
          hideTimeout.value = null
        }
      }
    }, 100)
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
})

onUnmounted(() => {
  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
  }
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
  }
  if (pinTimeout.value) {
    clearTimeout(pinTimeout.value)
  }
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.tooltip-trigger {
  display: inline;
  cursor: help;
  border-bottom: 1px dotted currentColor;
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

/* Touch device improvements */
@media (hover: none) and (pointer: coarse) {
  .tooltip-trigger {
    /* Increase touch target size on touch devices */
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
  }

  .tooltip {
    /* Larger touch targets in tooltip */
    min-width: 200px;
  }

  .tooltip-close-button {
    /* Larger close button for touch */
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
  }
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

.tooltip-pinned {
  border-color: var(--vp-c-brand-1);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 0 0 1px var(--vp-c-brand-1);
}

.tooltip-pinned .tooltip-close-button {
  color: var(--vp-c-brand-1);
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

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 6px solid transparent;
}

.tooltip-top .tooltip-arrow {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: #444444;
}

.tooltip-bottom .tooltip-arrow {
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: #444444;
}

.tooltip-left .tooltip-arrow {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: #444444;
}

.tooltip-right .tooltip-arrow {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  border-right-color: #444444;
}

/* Pinned tooltip styling */
.tooltip-pinned {
  border-color: #666666;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.6),
    0 0 0 1px #666666;
}

.tooltip-pinned .tooltip-close-button {
  color: #cccccc;
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
