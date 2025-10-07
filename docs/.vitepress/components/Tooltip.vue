<template>
  <ClientOnly>
    <span
      class="tooltip-trigger"
      tabindex="0"
      role="button"
      :aria-describedby="tooltipId"
      @mouseenter="showTooltip"
      @mouseleave="hideTooltip"
      @click="closeTooltip"
      @focus="showTooltip"
      @blur="hideTooltip"
    >
      <slot />
      <Teleport to="body">
        <div
          v-if="isVisible"
          :id="tooltipId"
          class="tooltip"
          :class="tooltipClasses"
          :style="tooltipStyle"
          role="tooltip"
          :aria-hidden="!isVisible"
          :data-debug="`visible: ${isVisible}, data: ${!!tooltipData}`"
          @mouseenter="handleTooltipMouseEnter"
          @mouseleave="handleTooltipMouseLeave"
        >
          <div class="tooltip-content">
            <div v-if="isLoading" class="tooltip-loading">Loading...</div>
            <template v-else>
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
                  :key="`${section.type}-${index}`"
                  :section="section"
                />
              </div>
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
const tooltipData = ref(null)
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

// Tooltip classes
const tooltipClasses = computed(() => ({
  [`tooltip-${props.position}`]: true,
  'tooltip-visible': isVisible.value,
  'tooltip-pinned': isPinned.value
}))

// Initialize composables
const { organizedData } = useFactorioData()
const { getDetailsData } = useDetailsData()

// Get tooltip data for specific item using the new system
function getTooltipData() {
  try {
    // Get the item data from the factorio data
    const itemData = organizedData.value[props.category][props.itemId]
    if (!itemData) {
      return null
    }

    const unifiedObject = {
      types: [props.category],
      [props.category]: itemData,
      displayName: itemData.displayName,
      description: itemData.description
    }

    if (props.category === 'entity') {
      unifiedObject.item = organizedData.value.item[props.itemId]
      if (unifiedObject.item) {
        unifiedObject.types.push('item')
      }
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
  tooltipData.value = null
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
        tooltipData.value = data
        isVisible.value = true
        console.log('Setting tooltip visible, positioning...')
        positionTooltip()

        // Start auto-pin timer
        startAutoPinTimer()
      } else {
        // Show fallback message when no data is found
        tooltipData.value = {
          title: props.itemId,
          description: `No tooltip data available for ${props.category}`,
          sections: []
        }
        isVisible.value = true
        console.log('No tooltip data found, showing fallback')
        positionTooltip()

        // Start auto-pin timer
        startAutoPinTimer()
      }
    } catch (error) {
      console.error('Error loading tooltip data:', error)
      hasError.value = true
      tooltipData.value = {
        title: 'Error',
        description: 'Failed to load tooltip data',
        sections: []
      }
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
    tooltipData.value = null
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

// Handle window resize
function handleResize() {
  if (isVisible.value) {
    positionTooltip()
  }
}

// Handle escape key
function handleKeydown(event) {
  if (event.key === 'Escape' && isVisible.value) {
    hideTooltip()
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
