<template>
  <div :class="$style.factoripedia">
    <div :class="$style.factoripediaContainer">
      <!-- Left Panel: Item Browser -->
      <div :class="$style.factoripediaLeftPanel">
        <div :class="$style.factoripediaHeader">
          <h2>Factoriopedia</h2>
        </div>

        <!-- Category Filters -->
        <div :class="$style.categoryFilters">
          <div :class="$style.filterRow">
            <button
              v-for="category in primaryCategories"
              :key="category.key"
              :class="[
                $style.filterButton,
                {
                  [$style.active]: selectedCategory === category.key,
                  [$style.disabled]: disabledFilters.has(category.key)
                }
              ]"
              :disabled="disabledFilters.has(category.key)"
              @click="!disabledFilters.has(category.key) && selectCategory(category.key)"
            >
              <SpriteIcon v-if="category.icon" :sprite-key="category.icon" :title="category.name" />
            </button>
          </div>
        </div>

        <!-- Search -->
        <div :class="$style.searchContainer">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search recipes..."
            :class="$style.searchInput"
          />
        </div>

        <!-- Recipe Grid -->
        <div ref="gridContainer" :class="$style.itemGrid">
          <template v-for="subgroup in groupedRecipes" :key="subgroup.subgroup">
            <!-- Subgroup wrapper -->
            <div v-if="subgroup.recipes.length > 0" :class="$style.subgroupGrid">
              <template :key="item.name" v-for="item in subgroup.recipes">
                <IconButton
                  :type="getPrimaryType(item)"
                  :name="item.name"
                  :size="buttonSize"
                  :is-selected="
                    selectedItem?.name === item.name &&
                    getPrimaryType(selectedItem) === getPrimaryType(item)
                  "
                  @click="selectItem(getPrimaryType(item), item.name, item)"
                />
              </template>
            </div>
          </template>
        </div>
      </div>

      <!-- Right Panel: Details -->
      <div :class="$style.factoripediaRightPanel">
        <DetailsPane
          :name="selectedItem?.name"
          :type="selectedItem ? getPrimaryType(selectedItem) : null"
          :is-animation-paused="isAnimationPaused"
          :can-go-back="canGoBack"
          :can-go-forward="canGoForward"
          :show-history-dropdown="showMRUDropdown"
          :history-items="mruItems"
          @select-item="selectItem"
          @navigate-item="navigateItem"
          @close-details="closeDetails"
          @toggle-animation-pause="toggleAnimationPause"
          @navigate-back="navigateBack"
          @navigate-forward="navigateForward"
          @toggle-history="toggleMRUDropdown"
          @select-from-history="selectFromMRU"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

import { useUnifiedObjects, useFactorioData } from '../../../src/index.js'

import SpriteIcon from './SpriteIcon.vue'
import IconButton from './IconButton.vue'
import DetailsPane from './DetailsPane.vue'

// Use the composables
const { getPrimaryType } = useUnifiedObjects()

const { loadAllData, precomputeCategoryStructure, createUnifiedSelectionObject } = useFactorioData()
const selectedItem = ref(null)
const selectedCategory = ref('all')
const searchQuery = ref('')
const isAnimationPaused = ref(false)

// Navigation stack for forward/back functionality
const navigationStack = ref([])
const currentStackIndex = ref(-1)

// MRU (Most Recently Used) storage
const mruItems = ref([])
const maxMRUItems = 20
const showMRUDropdown = ref(false)

// Grid container width tracking
const gridContainerWidth = ref(0)
const gridContainer = ref(null)

// Pre-computed category structure
const categoryStructure = ref({})
const primaryCategories = ref([])
const secondaryCategories = ref([])

// Dynamic grid columns and button size based on actual grid container width
const gridColumns = computed(() => {
  if (gridContainerWidth.value === 0) return 10 // Default fallback

  const gap = 4 // Fixed gap between buttons
  const availableWidth = gridContainerWidth.value - 16 // Account for padding
  const minButtonSize = 44 // Minimum touch target size per accessibility guidelines (Apple, Google, WCAG)

  // Calculate maximum columns that still maintain minimum button size
  const maxColumnsWithMinSize = Math.floor((availableWidth + gap) / (minButtonSize + gap))

  // Use the maximum columns that maintain minimum button size, capped at 10
  const optimalColumns = Math.min(maxColumnsWithMinSize, 10)
  return Math.max(optimalColumns, 1) // At least 1 column
})

// Calculate button size to fit exactly in the available width
const buttonSize = computed(() => {
  if (gridContainerWidth.value === 0) return 64 // Default fallback

  const gap = 4
  const availableWidth = gridContainerWidth.value - 16 // Account for padding
  const columns = gridColumns.value
  const totalGapWidth = (columns - 1) * gap
  const buttonWidth = (availableWidth - totalGapWidth) / columns
  return Math.floor(buttonWidth) // Round down to ensure buttons fit
})

// Calculate grid cell size (button + gap) for background alignment
const gridCellSize = computed(() => {
  console.log('buttonSize.value', buttonSize.value)
  return buttonSize.value + 4 // Button size + gap
})

// Computed property for filtered and grouped recipes
const groupedRecipes = computed(() => {
  if (!categoryStructure.value || Object.keys(categoryStructure.value).length === 0) {
    return []
  }

  const category = selectedCategory.value
  let categoryData = categoryStructure.value[category]

  if (!categoryData) {
    return []
  }

  // Apply search filter if needed
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    categoryData = {
      ...categoryData,
      subgroups: categoryData.subgroups
        .map(subgroup => ({
          ...subgroup,
          recipes: subgroup.recipes.filter(recipe =>
            recipe.displayName.toLowerCase().includes(query)
          )
        }))
        .filter(subgroup => subgroup.recipes.length > 0)
    }
  }

  return categoryData.subgroups
})

// Flattened list of all recipes for the grid (currently unused but kept for potential future use)
const _allRecipes = computed(() => {
  return groupedRecipes.value.flatMap(subgroup => subgroup.recipes)
})

// Computed property to determine which filters have no items when searching
const disabledFilters = computed(() => {
  if (!searchQuery.value || !categoryStructure.value) {
    return new Set()
  }

  const query = searchQuery.value.toLowerCase()
  const disabled = new Set()

  // Check each category to see if it has any items matching the search
  Object.keys(categoryStructure.value).forEach(categoryKey => {
    const categoryData = categoryStructure.value[categoryKey]
    if (!categoryData) return

    // Apply the same search filter logic as in groupedRecipes
    const filteredSubgroups = categoryData.subgroups
      .map(subgroup => ({
        ...subgroup,
        recipes: subgroup.recipes.filter(recipe => recipe.displayName.toLowerCase().includes(query))
      }))
      .filter(subgroup => subgroup.recipes.length > 0)

    // If no subgroups have any matching recipes, disable this filter
    if (filteredSubgroups.length === 0) {
      disabled.add(categoryKey)
    }
  })

  return disabled
})

// Navigation stack computed properties
const canGoBack = computed(() => currentStackIndex.value > 0)
const canGoForward = computed(() => currentStackIndex.value < navigationStack.value.length - 1)

// Navigation functions
function addToNavigationStack(item) {
  const itemData = {
    type: getPrimaryType(item),
    name: item.name,
    data: item
  }

  // If we're not at the top of the stack, remove everything after current position
  if (currentStackIndex.value < navigationStack.value.length - 1) {
    navigationStack.value = navigationStack.value.slice(0, currentStackIndex.value + 1)
  }

  // Add new item to stack
  navigationStack.value.push(itemData)
  currentStackIndex.value = navigationStack.value.length - 1
}

function navigateBack() {
  if (canGoBack.value) {
    currentStackIndex.value--
    const item = navigationStack.value[currentStackIndex.value]
    selectedItem.value = createUnifiedSelectionObject(item.type, item.name, item.data)
  }
}

function navigateForward() {
  if (canGoForward.value) {
    currentStackIndex.value++
    const item = navigationStack.value[currentStackIndex.value]
    selectedItem.value = createUnifiedSelectionObject(item.type, item.name, item.data)
  }
}

// MRU management functions
function addToMRU(item) {
  const itemData = {
    type: getPrimaryType(item),
    name: item.name,
    displayName: item.displayName,
    data: item
  }

  // Remove existing entry if it exists (to move it to front)
  const existingIndex = mruItems.value.findIndex(
    mruItem => mruItem.name === itemData.name && mruItem.type === itemData.type
  )

  if (existingIndex !== -1) {
    mruItems.value.splice(existingIndex, 1)
  }

  // Add to front of MRU list
  mruItems.value.unshift(itemData)

  // Limit to maxMRUItems
  if (mruItems.value.length > maxMRUItems) {
    mruItems.value = mruItems.value.slice(0, maxMRUItems)
  }
}

function selectFromMRU(item) {
  selectItem(item.type, item.name, item.data)
  showMRUDropdown.value = false
}

function toggleMRUDropdown() {
  showMRUDropdown.value = !showMRUDropdown.value
}

// Function to set up category structure using composable
function setupCategoryStructure() {
  const structure = precomputeCategoryStructure()
  categoryStructure.value = structure

  // Set up primary categories - include all categories from structure
  const validCategories = Object.values(structure).sort((a, b) => a.order.localeCompare(b.order))

  primaryCategories.value = [...validCategories]
  secondaryCategories.value = []
}

// Navigation functions

function selectCategory(category) {
  selectedCategory.value = category
}

function navigateItem(direction) {
  // Create a flattened list of items (recipes and technologies) for navigation
  const allItems = []
  groupedRecipes.value.forEach(subgroup => {
    allItems.push(...subgroup.recipes)
  })

  const currentIndex = allItems.findIndex(item => item.name === selectedItem.value?.name)
  if (currentIndex === -1) return

  const newIndex = currentIndex + direction
  if (newIndex >= 0 && newIndex < allItems.length) {
    const item = allItems[newIndex]
    selectItem(getPrimaryType(item), item.name, item)
  }
}

function closeDetails() {
  selectedItem.value = null
  updateURL()
}

function toggleAnimationPause() {
  isAnimationPaused.value = !isAnimationPaused.value
}

// URL management
function updateURL() {
  const url = new URL(window.location)
  if (selectedItem.value) {
    const primaryType = getPrimaryType(selectedItem.value)
    url.hash = `#${primaryType}=${selectedItem.value.name}`
  } else {
    url.hash = ''
  }
  window.history.replaceState({}, '', url)
}

function parseURL() {
  const { hash } = window.location
  if (hash.startsWith('#item=')) {
    const itemName = hash.substring(6)
    selectItem('item', itemName)
  } else if (hash.startsWith('#recipe=')) {
    const recipeName = hash.substring(8)
    selectItem('recipe', recipeName)
  } else if (hash.startsWith('#technology=')) {
    const technologyName = hash.substring(12)
    selectItem('technology', technologyName)
  } else if (hash.startsWith('#fluid=')) {
    const fluidName = hash.substring(7)
    selectItem('fluid', fluidName)
  } else if (hash.startsWith('#tile=')) {
    const tileName = hash.substring(6)
    selectItem('tile', tileName)
  }
}

// Lifecycle
onMounted(async () => {
  await loadAllData()

  // Set up the category structure using composable
  setupCategoryStructure()

  // Parse URL after data is loaded
  nextTick(() => {
    parseURL()
  })
})

// Watch for URL changes
watch(
  () => window.location.hash,
  () => {
    parseURL()
  }
)

// Unified selection functions
function selectItem(type, name, data = null) {
  const unifiedObject = createUnifiedSelectionObject(type, name, data)

  if (unifiedObject) {
    selectedItem.value = unifiedObject
    addToNavigationStack(unifiedObject)
    addToMRU(unifiedObject)
  }
}

// Handle keyboard navigation
function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeDetails()
    showMRUDropdown.value = false
  } else if (event.key === 'ArrowLeft') {
    navigateItem(-1)
  } else if (event.key === 'ArrowRight') {
    navigateItem(1)
  }
}

// Handle click outside to close MRU dropdown
function handleClickOutside(event) {
  // Add a small delay to prevent immediate closing when opening
  setTimeout(() => {
    console.log('handleClickOutside called, showMRUDropdown:', showMRUDropdown.value)
    console.log('event.target:', event.target)
    console.log('closest historyContainer:', event.target.closest('.historyContainer'))

    if (showMRUDropdown.value && !event.target.closest('.historyContainer')) {
      console.log('Closing dropdown due to click outside')
      showMRUDropdown.value = false
    }
  }, 10)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  // Temporarily disable click outside handler to debug
  // document.addEventListener('click', handleClickOutside)

  // Set up ResizeObserver to track grid container width
  if (gridContainer.value && typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        gridContainerWidth.value = entry.contentRect.width
      }
    })
    resizeObserver.observe(gridContainer.value)

    // Store the observer for cleanup
    window._factoriopediaResizeObserver = resizeObserver
  }

  // Fallback: Set initial width after a short delay
  setTimeout(() => {
    if (gridContainer.value && gridContainerWidth.value === 0) {
      const width = gridContainer.value.offsetWidth
      gridContainerWidth.value = width
    }
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  // document.removeEventListener('click', handleClickOutside)
  if (window._factoriopediaResizeObserver) {
    window._factoriopediaResizeObserver.disconnect()
  }
})

// Parametrized SVG generation function
function generateGridPattern(cellSize, filterId = '') {
  return `url(data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="${cellSize}" height="${cellSize}">
  <defs>
    <filter id="blur${filterId}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.5"/>
    </filter>
    <filter id="shadow${filterId}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.3"/>
    </filter>
  </defs>
  
  <!-- Main grid cell background -->
  <rect x="0" y="0" width="${cellSize}" height="${cellSize}" fill="#1f1f1f"/>
  
  <!-- Inner debossed square (75% of cell size) -->
  <g transform="translate(${cellSize * 0.125}, ${cellSize * 0.125})">
    <!-- Drop shadow behind the square -->
    <rect x="1" y="1" width="${cellSize * 0.75}" height="${cellSize * 0.75}" fill="rgba(0,0,0,0.4)" filter="url(#shadow${filterId})"/>
    
    <!-- Main square background -->
    <rect x="0" y="0" width="${cellSize * 0.75}" height="${cellSize * 0.75}" fill="rgba(255,255,255,0.02)"/>
    
    <!-- Top highlight -->
    <rect x="0" y="0" width="${cellSize * 0.75}" height="2" fill="rgba(255,255,255,0.18)" filter="url(#blur${filterId})"/>
    <!-- Left highlight -->
    <rect x="0" y="0" width="2" height="${cellSize * 0.75}" fill="rgba(255,255,255,0.18)" filter="url(#blur${filterId})"/>
    
    <!-- Bottom shadow -->
    <rect x="0" y="${cellSize * 0.75 - 2}" width="${cellSize * 0.75}" height="2" fill="rgba(0,0,0,0.35)" filter="url(#shadow${filterId})"/>
    <!-- Right shadow -->
    <rect x="${cellSize * 0.75 - 2}" y="0" width="2" height="${cellSize * 0.75}" fill="rgba(0,0,0,0.35)" filter="url(#shadow${filterId})"/>
  </g>
</svg>`)})`
}

// Grid background for item subgroups
const base64Svg = computed(() => {
  return generateGridPattern(gridCellSize.value)
})

// Filter grid columns calculation - simple arithmetic: max columns that fit with minimum button size, capped at 6
const filterColumns = computed(() => {
  if (gridContainerWidth.value === 0) return 6 // Default fallback

  const gap = 4
  const availableWidth = gridContainerWidth.value - 16 // Account for padding
  const minButtonWidth = 44 // Minimum filter button width (same as item grid)
  const totalFilters = primaryCategories.value?.length || 1

  // Calculate maximum columns that can fit with minimum button size
  const maxColumnsWithMinSize = Math.floor((availableWidth + gap) / (minButtonWidth + gap))

  // Cap at 6 columns maximum, and don't exceed total number of filters
  return Math.min(6, maxColumnsWithMinSize, totalFilters)
})

// Filter button size calculation - same approach as item grid
const filterButtonSize = computed(() => {
  console.log('gridContainerWidth.value', gridContainerWidth.value)
  if (gridContainerWidth.value === 0) return 72 // Default fallback

  const gap = 4
  const availableWidth = gridContainerWidth.value - 16 // Account for padding
  const columns = filterColumns.value
  const totalGapWidth = (columns - 1) * gap
  const buttonWidth = (availableWidth - totalGapWidth) / columns
  console.log('filter.buttonWidth', buttonWidth)
  return Math.floor(buttonWidth) // Round down to ensure buttons fit
})

// Filter cell size calculation (button + gap) for background alignment
const filterCellSize = computed(() => {
  return filterButtonSize.value + 4 // Button size + gap
})

// Filter background for filter buttons
const filterBase64Svg = computed(() => {
  return generateGridPattern(filterCellSize.value, '-filter')
})
</script>

<style module>
.factoripedia {
  width: 100%;
  height: 80vh;
  min-height: 600px;
  background: #2d2d2d;
  border: 2px solid #4a4a4a;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.factoripediaContainer {
  display: flex;
  height: 100%;
}

/* Left Panel */
.factoripediaLeftPanel {
  width: 50%;
  background: #2d2d2d;
  border-right: 2px solid #4a4a4a;
  display: flex;
  flex-direction: column;
  position: relative;
}

.factoripediaHeader {
  padding: 12px 16px;
  background: linear-gradient(to bottom, #3a3a3a, #2d2d2d);
  border-bottom: 1px solid #4a4a4a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.factoripediaHeader h2 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.categoryFilters {
  display: grid;
  padding: 8px;
  grid-template-columns: repeat(v-bind(filterColumns), v-bind(filterButtonSize + 'px'));
  gap: 4px;
  background: #1f1f1f;
  border-bottom: 1px solid #4a4a4a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.filterRow {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
  column-gap: inherit;
  row-gap: inherit;
  background-image: v-bind(filterBase64Svg);
  background-size: v-bind(filterCellSize + 'px') v-bind(filterCellSize + 'px');
  background-repeat: repeat;
  background-attachment: local;
}

.filterButton {
  width: v-bind(filterButtonSize + 'px');
  height: v-bind(filterButtonSize + 'px');
  min-width: v-bind(filterButtonSize + 'px');
  min-height: v-bind(filterButtonSize + 'px');
  max-width: v-bind(filterButtonSize + 'px');
  max-height: v-bind(filterButtonSize + 'px');
  background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Override SpriteIcon styling for filter buttons */
.filterButton :global(.sprite-icon) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

.filterButton:hover {
  background: #ffa207;
  border-color: #ffa207;
  box-shadow:
    0 0 8px rgba(255, 200, 100, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.4);
}

.filterButton.active {
  background: #ffa207;
  border-color: #ffa207;
  /*box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);*/
}

.filterButton.disabled {
  background: #2a2a2a;
  border-color: #3a3a3a;
  cursor: not-allowed;
  pointer-events: none;
  filter: grayscale(100%);
}

.filterButton.disabled:hover {
  background: #2a2a2a;
  border-color: #3a3a3a;
  box-shadow: none;
}

/* Apply greyscale to the sprite icon inside disabled buttons */
.filterButton.disabled :global(.sprite-icon) {
  filter: grayscale(100%);
  opacity: 0.5;
}

.searchContainer {
  padding: 8px;
  background: linear-gradient(to bottom, #3a3a3a, #2d2d2d);
  border-bottom: 1px solid #4a4a4a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.searchInput {
  width: 100%;
  padding: 6px 8px;
  background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  color: #ffffff;
  font-size: 14px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.searchInput::placeholder {
  color: #888888;
}

.searchInput:focus {
  outline: none;
  border-color: #7a7a7a;
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.3),
    0 0 0 2px rgba(255, 165, 0, 0.3);
}

.itemGrid {
  display: grid;
  padding: 8px;
  gap: 4px;
  grid-template-columns: repeat(v-bind(gridColumns), v-bind(buttonSize + 'px'));
  overflow-y: scroll;
  background: #1f1f1f;
  border: 1px solid #4a4a4a;
  border-radius: 2px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.subgroupGrid {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
  column-gap: inherit;
  row-gap: inherit;
  background-image: v-bind(base64Svg);
  background-size: v-bind(gridCellSize + 'px') v-bind(gridCellSize + 'px');
  background-repeat: repeat;
  background-attachment: local;
}

.itemSlot {
  width: 40px;
  height: 40px;
  background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  position: relative;
}

.itemSlot:hover {
  background: linear-gradient(to bottom, #5a5a5a, #4a4a4a);
  border-color: #6a6a6a;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.itemSlot.selected {
  background: linear-gradient(to bottom, #6a6a6a, #5a5a5a);
  border-color: #ffa500;
  box-shadow:
    0 0 0 2px #ffa500,
    0 2px 4px rgba(0, 0, 0, 0.4);
}

.itemSlot.emptyCell {
  background: transparent;
  border: 1px solid #3a3a3a;
  cursor: default;
  pointer-events: none;
  box-shadow: none;
}

/* Right Panel */
.factoripediaRightPanel {
  width: 50%;
  background: #2d2d2d;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: inset 1px 0 3px rgba(0, 0, 0, 0.3);
}

.itemDetails,
.recipeDetails {
  padding: 16px;
  color: #ffffff;
}

.itemHeader,
.recipeHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #8b7355;
  border-radius: 2px;
}

.itemHeader h3,
.recipeHeader h3 {
  margin: 0;
  color: #000000;
  font-size: 16px;
  font-weight: bold;
}

.headerControls {
  display: flex;
  gap: 4px;
}

.controlButton {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: background 0.2s ease;
}

.controlButton:hover {
  background: rgba(0, 0, 0, 0.1);
}

.usageDescription {
  margin-bottom: 16px;
}

.usageDescription p {
  margin: 0 0 4px 0;
  color: #ffffff;
  font-size: 14px;
}

.statistics {
  margin-bottom: 16px;
  padding: 12px;
  background: #3a3a3a;
  border-radius: 2px;
}

.statItem {
  color: #ffffff;
  font-size: 14px;
  margin-bottom: 8px;
}

.statItem:last-child {
  margin-bottom: 0;
}

.statItem strong {
  color: #ffffff;
}

.statItem ul {
  margin: 4px 0 0 16px;
  padding: 0;
}

.statItem li {
  color: #ffffff;
  font-size: 14px;
}

.modInfo {
  color: #87ceeb;
  font-size: 12px;
  margin-bottom: 12px;
}

.itemProperties {
  margin-bottom: 16px;
}

.propertyItem {
  color: #ffffff;
  font-size: 14px;
  margin-bottom: 4px;
}

.itemSections {
  border-top: 1px solid #4a4a4a;
  padding-top: 12px;
}

.itemSection {
  margin-bottom: 16px;
}

.itemSection h4 {
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.itemList {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.itemReference {
  width: 32px;
  height: 32px;
  background: #4a4a4a;
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.itemReference:hover {
  background: #5a5a5a;
  border-color: #6a6a6a;
}

/* Recipe Details */
.recipeContent {
  border-top: 1px solid #4a4a4a;
  padding-top: 12px;
}

.recipeSection {
  margin-bottom: 16px;
}

.recipeSection h4 {
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.ingredientList,
.productList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ingredientItem,
.productItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  background: #4a4a4a;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.ingredientItem:hover,
.productItem:hover {
  background: #5a5a5a;
}

.craftingTime {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
}

.buildingList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.buildingItem {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  padding: 4px;
  background: #4a4a4a;
  border-radius: 2px;
}

.researchItem {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  padding: 4px;
  background: #4a4a4a;
  border-radius: 2px;
}

/* No Selection State */
.noSelection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888888;
}

.noSelectionContent {
  text-align: center;
}

.noSelectionContent h3 {
  margin: 0 0 8px 0;
  color: #ffffff;
}

.noSelectionContent p {
  margin: 0;
  font-size: 14px;
}

/* Mobile Responsive Layout */
@media (max-width: 768px) {
  .factoripedia {
    height: auto;
    min-height: 100vh;
  }

  .factoripediaContainer {
    flex-direction: column;
    height: auto;
  }

  /* Left Panel - Mobile */
  .factoripediaLeftPanel {
    width: 100%;
    border-right: none;
    border-bottom: 2px solid #4a4a4a;
    max-height: 90vh;
    min-height: 40vh;
  }

  /* Right Panel - Mobile */
  .factoripediaRightPanel {
    width: 100%;
    min-height: 10vh;
  }

  /* Smaller filter buttons on mobile - maintain size relative to grid */
  .filterButton {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
    max-width: 48px;
    max-height: 48px;
    flex-shrink: 0;
    background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  /* Adjust header font size */
  .factoripediaHeader h2 {
    font-size: 16px;
  }
}

/* iPhone 12 Pro and similar devices */
@media (max-width: 428px) {
  .factoripedia {
    height: auto;
    min-height: 100vh;
  }

  .factoripediaContainer {
    flex-direction: column;
  }

  .factoripediaLeftPanel {
    width: 100%;
    border-right: none;
    border-bottom: 2px solid #4a4a4a;
    max-height: 90vh;
    min-height: 40vh;
  }

  .factoripediaRightPanel {
    width: 100%;
    min-height: 10vh;
  }

  /* Smaller filter buttons - maintain minimum size */
  .filterButton {
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    max-width: 40px;
    max-height: 40px;
    flex-shrink: 0;
    background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  /* Adjust padding for mobile */
  .factoripediaHeader {
    padding: 8px 12px;
  }

  .searchContainer {
    padding: 6px;
  }
}

/* Very small screens - maintain minimum usable size */
@media (max-width: 360px) {
  .filterButton {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    max-width: 36px;
    max-height: 36px;
    flex-shrink: 0;
    background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
}

/* Scrollbar styling */
.itemGrid::-webkit-scrollbar,
.factoripediaRightPanel::-webkit-scrollbar {
  width: 8px;
}

.itemGrid::-webkit-scrollbar-track,
.factoripediaRightPanel::-webkit-scrollbar-track {
  background: #3a3a3a;
}

.itemGrid::-webkit-scrollbar-thumb,
.factoripediaRightPanel::-webkit-scrollbar-thumb {
  background: #5a5a5a;
  border-radius: 4px;
}

.itemGrid::-webkit-scrollbar-thumb:hover,
.factoripediaRightPanel::-webkit-scrollbar-thumb:hover {
  background: #6a6a6a;
}
</style>
