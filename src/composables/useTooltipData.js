import { ref, computed } from 'vue'
import { withBase } from 'vitepress/client'

import { resolveDataUrl } from '../components/assetResolver.js'

import { useFactorioPrototypeMapping } from './useFactorioPrototypeMapping.js'

// Global shared state - only one instance across the entire app
const globalTooltipsData = ref(null)
const globalIsLoadingTooltips = ref(false)
const globalLoadError = ref(null)
let globalTooltipsDataPromise = null

/**
 * Organize tooltip data by grouping subtypes into parent collections
 * Similar to how useFactorioData organizes data
 */
function organizeTooltipData(rawData) {
  const { subtypeToBaseType } = useFactorioPrototypeMapping('en')

  const organizedData = {
    tooltips: {}
  }

  // Process each prototype type in the raw data
  for (const [prototypeType, tooltips] of Object.entries(rawData.tooltips || {})) {
    const baseType = subtypeToBaseType[prototypeType]

    if (!baseType) {
      console.warn(`No base type found for ${prototypeType}, using as-is`)
      // If no mapping found, use the original type
      if (!organizedData.tooltips[prototypeType]) {
        organizedData.tooltips[prototypeType] = {}
      }
      organizedData.tooltips[prototypeType] = {
        ...organizedData.tooltips[prototypeType],
        ...tooltips
      }
      continue
    }

    // Group under the base type
    if (!organizedData.tooltips[baseType]) {
      organizedData.tooltips[baseType] = {}
    }

    // Merge the tooltips into the base type collection
    organizedData.tooltips[baseType] = { ...organizedData.tooltips[baseType], ...tooltips }
  }

  return organizedData
}

/**
 * Composable for managing shared tooltip data across all tooltip components
 * Prevents multiple components from loading the same data
 */
export function useTooltipData() {
  // Use global state
  const tooltipsData = globalTooltipsData
  const isLoadingTooltips = globalIsLoadingTooltips
  const loadError = globalLoadError
  const tooltipsDataPromise = globalTooltipsDataPromise

  // Computed properties
  const hasTooltipsData = computed(() => tooltipsData.value !== null)
  const hasLoadError = computed(() => loadError.value !== null)

  /**
   * Load tooltips data from the server
   * Only loads once, subsequent calls return the existing promise
   */
  async function loadTooltipsData() {
    // If already loading, return the existing promise
    if (globalTooltipsDataPromise) {
      return globalTooltipsDataPromise
    }

    // If already loaded, return immediately
    if (tooltipsData.value) {
      return Promise.resolve(tooltipsData.value)
    }

    // Start loading
    isLoadingTooltips.value = true
    loadError.value = null

    globalTooltipsDataPromise = (async () => {
      try {
        const response = await fetch(resolveDataUrl('en-tooltips.json', withBase))

        if (!response.ok) {
          throw new Error(`Failed to load tooltips: ${response.status} ${response.statusText}`)
        }

        const rawData = await response.json()

        // Organize the data by grouping subtypes into parent collections
        const organizedData = organizeTooltipData(rawData)
        tooltipsData.value = organizedData
        console.log('Tooltips data loaded and organized:', organizedData)
        return organizedData
      } catch (error) {
        console.error('Failed to load tooltips data:', error)
        loadError.value = error
        throw error
      } finally {
        isLoadingTooltips.value = false
      }
    })()

    return globalTooltipsDataPromise
  }

  /**
   * Get tooltip data for a specific category and item ID
   * @param {string} category - The tooltip category (e.g., 'item', 'recipe', 'technology')
   * @param {string} itemId - The item ID to look up
   * @returns {Object|null} The tooltip data or null if not found
   */
  function getTooltipData(category, itemId) {
    if (!tooltipsData.value?.tooltips || !category || !itemId) {
      return null
    }

    const tooltipType = category
    if (!tooltipsData.value.tooltips[tooltipType]) {
      return null
    }

    return tooltipsData.value.tooltips[tooltipType][itemId] || null
  }

  /**
   * Get all tooltip data for a specific category
   * @param {string} category - The tooltip category
   * @returns {Object|null} All tooltip data for the category or null if not found
   */
  function getCategoryTooltips(category) {
    if (!tooltipsData.value?.tooltips || !category) {
      return null
    }

    return tooltipsData.value.tooltips[category] || null
  }

  /**
   * Check if tooltip data is available for a specific category and item
   * @param {string} category - The tooltip category
   * @param {string} itemId - The item ID to check
   * @returns {boolean} True if tooltip data exists
   */
  function hasTooltipData(category, itemId) {
    return getTooltipData(category, itemId) !== null
  }

  /**
   * Reset the tooltip data (useful for testing or manual refresh)
   */
  function resetTooltipData() {
    tooltipsData.value = null
    loadError.value = null
    globalTooltipsDataPromise = null
  }

  /**
   * Preload tooltip data (useful for performance optimization)
   */
  async function preloadTooltipData() {
    if (!hasTooltipsData.value && !isLoadingTooltips.value) {
      await loadTooltipsData()
    }
  }

  return {
    // State
    tooltipsData: computed(() => tooltipsData.value),
    isLoadingTooltips: computed(() => isLoadingTooltips.value),
    hasLoadError: computed(() => hasLoadError.value),
    hasTooltipsData: computed(() => hasTooltipsData.value),

    // Methods
    loadTooltipsData,
    getTooltipData,
    getCategoryTooltips,
    hasTooltipData,
    resetTooltipData,
    preloadTooltipData
  }
}
