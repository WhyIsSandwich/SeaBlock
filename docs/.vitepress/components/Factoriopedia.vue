<template>
  <div :class="$style.factoripedia">
    <div
      v-if="isMobileViewport"
      :class="$style.mobilePanelControls"
    >
      <span :class="$style.mobilePanelToggleLabel">View</span>
      <div
        :class="$style.mobilePanelToggle"
        role="tablist"
        aria-label="Switch mobile panel"
      >
        <span
          :class="[
            $style.mobilePanelIndicator,
            { [$style.details]: activeMobilePanel === 'details' && selectedItem }
          ]"
        />
        <button
          :class="[$style.mobilePanelButton, { [$style.active]: activeMobilePanel === 'browse' }]"
          role="tab"
          :aria-selected="activeMobilePanel === 'browse'"
          @click="activeMobilePanel = 'browse'"
        >
          Browse
        </button>
        <button
          :class="[
            $style.mobilePanelButton,
            { [$style.active]: activeMobilePanel === 'details' && selectedItem }
          ]"
          role="tab"
          :aria-selected="activeMobilePanel === 'details' && !!selectedItem"
          :disabled="!selectedItem"
          @click="activeMobilePanel = 'details'"
        >
          Details
        </button>
      </div>
    </div>
    <div :class="$style.factoripediaContainer">
      <!-- Left Panel: Item Browser -->
      <div
        :class="[
          $style.factoripediaLeftPanel,
          { [$style.mobileHidden]: isMobileViewport && activeMobilePanel !== 'browse' }
        ]"
      >
        <div :class="$style.factoripediaHeader">
          <h2>Factoriopedia</h2>
        </div>

        <!-- Category Filters -->
        <div :style="{ ...categoryGrid.containerStyles, overflowY: 'visible' }">
          <div :style="categoryGrid.subgroupStyles">
            <button
              v-for="category in visiblePrimaryCategories"
              :key="category.key"
              :class="[
                $style.filterButton,
                {
                  [$style.active]: selectedCategory === category.key,
                  [$style.disabled]: disabledFilters.has(category.key)
                }
              ]"
              :disabled="disabledFilters.has(category.key)"
              :style="categoryGrid.itemStyles"
              @click="!disabledFilters.has(category.key) && selectCategory(category.key)"
            >
              <SpriteIcon
                v-if="category.icon"
                :sprite-key="category.icon"
                :size="categoryGrid.buttonSize"
                :fill-ratio="CATEGORY_ICON_FILL_RATIO"
                :title="category.name"
              />
            </button>
          </div>
        </div>

        <!-- Search -->
        <div :class="$style.searchContainer">
          <div :class="$style.sciencePackFilterSection">
            <div :class="$style.sciencePackFilterHeader">
              <span>Science packs</span>
              <div :class="$style.sciencePackHeaderRight">
                <span :class="$style.selectedCountBadge">
                  {{ selectedSciencePacks.length }}/{{ sciencePackOptions.length }}
                </span>
                <button
                  :class="$style.clearScienceFiltersButton"
                  :disabled="selectedSciencePacks.length === 0"
                  @click="clearSciencePackFilters"
                >
                  Clear
                </button>
              </div>
            </div>
            <div :class="$style.sciencePackStrip">
              <button
                v-for="pack in sciencePackOptions"
                :key="pack.name"
                :class="[
                  $style.sciencePackButton,
                  {
                    [$style.active]: selectedSciencePackSet.has(pack.name)
                  }
                ]"
                :title="pack.displayName"
                @click="toggleSciencePack(pack.name)"
              >
                <SpriteIcon
                  :sprite-key="`item-${pack.name}`"
                  :size="28"
                  :fill-ratio="CATEGORY_ICON_FILL_RATIO"
                  :title="pack.displayName"
                />
              </button>
            </div>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search recipes..."
            :class="$style.searchInput"
          >
        </div>

        <!-- Recipe Grid -->
        <div
          ref="gridContainer"
          :class="$style.itemGrid"
          :style="{ ...itemGrid.containerStyles, overflowY: 'scroll' }"
        >
          <template
            v-for="subgroup in groupedRecipes"
            :key="subgroup.subgroup"
          >
            <!-- Subgroup wrapper -->
            <div
              v-if="subgroup.recipes.length > 0"
              :class="$style.subgroupGrid"
              :style="itemGrid.subgroupStyles"
            >
              <template
                v-for="item in subgroup.recipes"
                :key="item.name"
              >
                <IconButton
                  :type="getPrimaryType(item)"
                  :name="item.name"
                  :size="itemGrid.buttonSize"
                  :is-selected="
                    selectedItem?.name === item.name &&
                      getPrimaryType(selectedItem) === getPrimaryType(item)
                  "
                  :style="itemGrid.itemStyles"
                  @click="selectItem(getPrimaryType(item), item.name, item)"
                />
              </template>
            </div>
          </template>
        </div>
      </div>

      <!-- Right Panel: Details -->
      <div
        :class="[
          $style.factoripediaRightPanel,
          { [$style.mobileHidden]: isMobileViewport && activeMobilePanel !== 'details' }
        ]"
      >
        <DetailsPane
          :name="selectedItem?.name"
          :type="selectedItem ? getPrimaryType(selectedItem) : null"
          :science-pack-visibility="sciencePackVisibility"
          :is-animation-paused="isAnimationPaused"
          :can-go-back="canGoBack"
          :can-go-forward="canGoForward"
          :show-history-dropdown="showMRUDropdown"
          :history-items="visibleMRUItems"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide } from 'vue'

import { useUnifiedObjects, useFactorioData } from '../../../src/index.js'
import { useFactorioGrid } from '../../../src/composables/useFactorioGrid.js'

import SpriteIcon from './SpriteIcon.vue'
import IconButton from './IconButton.vue'
import DetailsPane from './DetailsPane.vue'

// Use the composables
const { getPrimaryType } = useUnifiedObjects()

const {
  loadAllData,
  precomputeCategoryStructure,
  createUnifiedSelectionObject,
  getSciencePackNamesFromTechnologies,
  createSciencePackVisibility
} = useFactorioData()
const selectedItem = ref(null)
const selectedCategory = ref('logistics')
const searchQuery = ref('')
const isAnimationPaused = ref(false)
const selectedSciencePacks = ref([])

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
const isMobileViewport = ref(false)
const activeMobilePanel = ref('browse')

const selectedSciencePackSet = computed(() => new Set(selectedSciencePacks.value))
const sciencePackVisibility = computed(() => createSciencePackVisibility(selectedSciencePacks.value))
const hasActiveScienceFilter = computed(() => selectedSciencePacks.value.length > 0)
const recipeSearchTextCache = new WeakMap()

const itemGrid = computed(() =>
  useFactorioGrid({
    containerWidth: gridContainerWidth.value,
    minButtonSize: 44,
    maxColumns: 10,
    gap: 4,
    padding: 16
  })
)

const CATEGORY_ICON_FILL_RATIO = 100 / 120

const categoryGrid = computed(() =>
  useFactorioGrid({
    containerWidth: gridContainerWidth.value,
    minButtonSize: 44,
    maxColumns: 6,
    gap: 4,
    padding: 16
  })
)

function isSelectionAllowed(type, name, data = null) {
  return sciencePackVisibility.value.isObjectVisible(type, name, data)
}

function getRecipeSearchText(recipe) {
  if (!recipe || typeof recipe !== 'object') return ''
  if (recipeSearchTextCache.has(recipe)) {
    return recipeSearchTextCache.get(recipe)
  }
  const searchText = recipe.displayName?.toLowerCase?.() || ''
  recipeSearchTextCache.set(recipe, searchText)
  return searchText
}

const sciencePackOptions = computed(() => {
  const packNames = getSciencePackNamesFromTechnologies()

  return packNames
    .map(packName => {
      const packObject = createUnifiedSelectionObject('item', packName)

      return {
        name: packName,
        displayName: packObject?.displayName || packName,
        order: packObject?.order || ''
      }
    })
    .sort((a, b) => {
      if (a.order && b.order) return a.order.localeCompare(b.order)
      if (a.order) return -1
      if (b.order) return 1
      return a.displayName.localeCompare(b.displayName)
    })
})

function clearSciencePackFilters() {
  selectedSciencePacks.value = []
}

function toggleSciencePack(packName) {
  if (!packName) return

  const selected = new Set(selectedSciencePacks.value)
  if (selected.has(packName)) {
    selected.delete(packName)
  } else {
    selected.add(packName)
  }
  selectedSciencePacks.value = Array.from(selected)
}

// Computed property for filtered and grouped recipes
const filteredSubgroupsByCategory = computed(() => {
  if (!categoryStructure.value || Object.keys(categoryStructure.value).length === 0) {
    return {}
  }

  const query = searchQuery.value.trim().toLowerCase()
  const filteredByCategory = {}
  const visibleSet = sciencePackVisibility.value

  Object.entries(categoryStructure.value).forEach(([categoryKey, categoryData]) => {
    if (!categoryData) {
      filteredByCategory[categoryKey] = []
      return
    }

    const filteredSubgroups = categoryData.subgroups
      .map(subgroup => {
        const recipes = subgroup.recipes.filter(recipe => {
          if (!visibleSet.isUnifiedObjectVisible(recipe)) return false
          if (!query) return true
          return getRecipeSearchText(recipe).includes(query)
        })
        return recipes.length > 0 ? { ...subgroup, recipes } : null
      })
      .filter(Boolean)

    filteredByCategory[categoryKey] = filteredSubgroups
  })

  return filteredByCategory
})

const groupedRecipes = computed(() => {
  if (!selectedCategory.value) return []
  return filteredSubgroupsByCategory.value[selectedCategory.value] || []
})

const enabledCategoryKeys = computed(() => {
  const enabled = new Set()
  Object.entries(filteredSubgroupsByCategory.value).forEach(([categoryKey, subgroups]) => {
    if ((subgroups || []).length > 0) {
      enabled.add(categoryKey)
    }
  })
  return enabled
})

const visiblePrimaryCategories = computed(() => {
  if (!hasActiveScienceFilter.value) {
    return primaryCategories.value
  }
  return primaryCategories.value.filter(category => enabledCategoryKeys.value.has(category.key))
})

const firstEnabledCategoryKey = computed(() => {
  const sortedCategories = [...primaryCategories.value]
  for (const category of sortedCategories) {
    if (enabledCategoryKeys.value.has(category.key)) {
      return category.key
    }
  }
  return null
})

// Computed property to determine which filters have no items when searching
const disabledFilters = computed(() => {
  if (
    !categoryStructure.value ||
    (!searchQuery.value.trim() && !hasActiveScienceFilter.value)
  ) {
    return new Set()
  }

  const disabled = new Set()

  Object.keys(categoryStructure.value).forEach(categoryKey => {
    if (!enabledCategoryKeys.value.has(categoryKey)) {
      disabled.add(categoryKey)
    }
  })

  return disabled
})

// Navigation stack computed properties
const canGoBack = computed(() => currentStackIndex.value > 0)
const canGoForward = computed(() => currentStackIndex.value < navigationStack.value.length - 1)
const visibleMRUItems = computed(() =>
  mruItems.value.filter(item => isSelectionAllowed(item.type, item.name, item.data || item))
)

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
    const candidate = createUnifiedSelectionObject(item.type, item.name, item.data)
    if (candidate && isSelectionAllowed(item.type, item.name, candidate)) {
      selectedItem.value = candidate
    }
  }
}

function navigateForward() {
  if (canGoForward.value) {
    currentStackIndex.value++
    const item = navigationStack.value[currentStackIndex.value]
    const candidate = createUnifiedSelectionObject(item.type, item.name, item.data)
    if (candidate && isSelectionAllowed(item.type, item.name, candidate)) {
      selectedItem.value = candidate
    }
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
  if (isMobileViewport.value) {
    activeMobilePanel.value = 'browse'
  }
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

  if (unifiedObject && isSelectionAllowed(type, name, unifiedObject)) {
    selectedItem.value = unifiedObject
    addToNavigationStack(unifiedObject)
    addToMRU(unifiedObject)
    if (isMobileViewport.value) {
      activeMobilePanel.value = 'details'
    }
  }
}

watch(
  () => selectedSciencePacks.value,
  () => {
    if (!selectedItem.value) return
    const type = getPrimaryType(selectedItem.value)
    const isVisible = isSelectionAllowed(type, selectedItem.value.name, selectedItem.value)
    if (!isVisible) {
      selectedItem.value = null
      if (isMobileViewport.value) {
        activeMobilePanel.value = 'browse'
      }
      updateURL()
    }
  },
)

watch(
  [disabledFilters, categoryStructure, firstEnabledCategoryKey],
  () => {
    if (!selectedCategory.value || !categoryStructure.value?.[selectedCategory.value]) {
      const firstCategory = firstEnabledCategoryKey.value
      if (firstCategory) {
        selectedCategory.value = firstCategory
      }
      return
    }

    if (disabledFilters.value.has(selectedCategory.value)) {
      const firstEnabled = firstEnabledCategoryKey.value
      if (firstEnabled) {
        selectedCategory.value = firstEnabled
      }
    }
  }
)

function updateMobileViewport() {
  if (typeof window === 'undefined') return
  const isMobile = window.innerWidth <= 768
  isMobileViewport.value = isMobile

  if (!isMobile) {
    activeMobilePanel.value = 'browse'
    return
  }

  if (!selectedItem.value) {
    activeMobilePanel.value = 'browse'
  }
}

// Provide event handlers to child components
provide('onSelectItem', selectItem)
provide('onItemSelected', selectItem)

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

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', updateMobileViewport)
  updateMobileViewport()
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
  window.removeEventListener('resize', updateMobileViewport)
  // document.removeEventListener('click', handleClickOutside)
  if (window._factoriopediaResizeObserver) {
    window._factoriopediaResizeObserver.disconnect()
  }
})
const filterGrid = useFactorioGrid({
  containerWidth: gridContainerWidth,
  minButtonSize: 44,
  maxColumns: 6,
  gap: 4,
  padding: 16,
  filterId: '-filter'
})
</script>

<style module>
.factoripedia {
  width: 100%;
  height: 80vh;
  min-height: 600px;
  background: #212121;
  border: 2px solid #3e3e3e;
  border-radius: 2px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px #101010,
    0 6px 14px rgba(0, 0, 0, 0.45);
}

.factoripediaContainer {
  display: flex;
  height: 100%;
}

.mobilePanelControls {
  display: none;
}

.mobilePanelToggleLabel {
  display: none;
}

.mobilePanelToggle {
  display: none;
}

.mobilePanelIndicator {
  display: none;
}

.mobilePanelButton {
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  color: #bcbcbc;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  min-height: 34px;
  cursor: pointer;
  border-radius: 14px;
  transition: color 0.18s ease;
}

.mobilePanelButton.active {
  color: #ffffff;
}

.mobilePanelButton:disabled {
  color: #777777;
  cursor: not-allowed;
}

/* Left Panel */
.factoripediaLeftPanel {
  width: 50%;
  background: #262626;
  border-right: 2px solid #1a1a1a;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.04);
}

.factoripediaHeader {
  padding: 10px 14px;
  background: linear-gradient(to bottom, #2f2f2f, #262626);
  border-bottom: 1px solid #3f3f3f;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.factoripediaHeader h2 {
  margin: 0;
  color: #e0d2bd;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
}

.filterButton {
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
  /* Preserve inline sprite background-image while clearing only fill color */
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

.filterButton:hover {
  background: linear-gradient(to bottom, #f0b14a, #c7891f);
  border-color: #cf9428;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.4);
}

.filterButton.active {
  background: linear-gradient(to bottom, #efb046, #c5861d);
  border-color: #d89b2a;
  box-shadow:
    inset 0 0 0 1px rgba(255, 224, 160, 0.25),
    0 1px 2px rgba(0, 0, 0, 0.45);
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
  background: linear-gradient(to bottom, #2d2d2d, #242424);
  border-bottom: 1px solid #3f3f3f;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.35);
}

.sciencePackFilterSection {
  margin-bottom: 8px;
}

.sciencePackFilterHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #cfcfcf;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sciencePackHeaderRight {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.selectedCountBadge {
  font-size: 10px;
  font-weight: 700;
  color: #e6e6e6;
  background: #1f1f1f;
  border: 1px solid #4a4a4a;
  border-radius: 10px;
  padding: 1px 6px;
}

.sciencePackStrip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 116px;
  overflow-y: auto;
  padding-right: 2px;
}

.sciencePackButton {
  width: 34px;
  height: 34px;
  min-width: 34px;
  min-height: 34px;
  max-width: 34px;
  max-height: 34px;
  border: 1px solid #4f4f4f;
  border-radius: 2px;
  background: linear-gradient(to bottom, #434343, #343434);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.sciencePackButton:hover {
  border-color: #6f6f6f;
  background: linear-gradient(to bottom, #525252, #3f3f3f);
}

.sciencePackButton.active {
  background: linear-gradient(to bottom, #efb046, #c5861d);
  border-color: #d89b2a;
  box-shadow:
    inset 0 0 0 1px rgba(255, 224, 160, 0.25),
    0 1px 2px rgba(0, 0, 0, 0.45);
}

.clearScienceFiltersButton {
  background: linear-gradient(to bottom, #3a3a3a, #2a2a2a);
  border: 1px solid #575757;
  border-radius: 2px;
  color: #d5d5d5;
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
}

.clearScienceFiltersButton:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.searchInput {
  width: 100%;
  padding: 6px 8px;
  background: linear-gradient(to bottom, #3f3f3f, #333333);
  border: 1px solid #555555;
  border-radius: 2px;
  color: #e6e6e6;
  font-size: 14px;
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
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
  /* Grid properties handled by composable inline styles */
  padding: 6px;
  overflow-y: scroll;
  background: #1f1f1f;
  border: 1px solid #3b3b3b;
  border-radius: 2px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* Subgroup styling handled by composable */

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
  background: #4a4a4a;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
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
    height: 100vh;
    min-height: 100vh;
  }

  .mobilePanelControls {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-bottom: 1px solid #3b3b3b;
    background: linear-gradient(to bottom, #2f2f2f, #252525);
  }

  .mobilePanelToggleLabel {
    display: inline-block;
    color: #b0b0b0;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .mobilePanelToggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    position: relative;
    flex: 1;
    background: linear-gradient(to bottom, #222222, #1a1a1a);
    border: 1px solid #4f4f4f;
    border-radius: 16px;
    padding: 3px;
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.45),
      0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .mobilePanelIndicator {
    display: block;
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: calc(50% - 3px);
    border-radius: 13px;
    background: linear-gradient(to bottom, #3d3121, #2f2518);
    border: 1px solid #b78c45;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 1px 2px rgba(0, 0, 0, 0.4);
    transition: transform 0.18s ease;
    pointer-events: none;
  }

  .mobilePanelIndicator.details {
    transform: translateX(100%);
  }

  .mobilePanelButton {
    width: 100%;
  }

  .factoripediaContainer {
    flex-direction: column;
    height: calc(100% - 49px);
    min-height: 0;
  }

  .mobileHidden {
    display: none !important;
  }

  /* Left Panel - Mobile */
  .factoripediaLeftPanel {
    width: 100%;
    border-right: none;
    border-bottom: 2px solid #4a4a4a;
    min-height: 0;
    flex: 1;
  }

  /* Right Panel - Mobile */
  .factoripediaRightPanel {
    width: 100%;
    min-height: 0;
    flex: 1;
  }

  .itemGrid {
    flex: 1;
    min-height: 0;
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

  .sciencePackFilterSection {
    margin-bottom: 6px;
  }

  .sciencePackFilterHeader {
    margin-bottom: 4px;
  }

  .sciencePackStrip {
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    max-height: none;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }

  .sciencePackButton {
    width: 30px;
    height: 30px;
    min-width: 30px;
    min-height: 30px;
    max-width: 30px;
    max-height: 30px;
  }

  .selectedCountBadge {
    font-size: 9px;
  }
}

/* iPhone 12 Pro and similar devices */
@media (max-width: 428px) {
  .factoripedia {
    height: 100vh;
    min-height: 100vh;
  }

  .factoripediaContainer {
    height: calc(100% - 47px);
  }

  .factoripediaLeftPanel {
    width: 100%;
    border-right: none;
    border-bottom: 2px solid #4a4a4a;
    min-height: 0;
  }

  .factoripediaRightPanel {
    width: 100%;
    min-height: 0;
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

  .sciencePackButton {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    max-width: 28px;
    max-height: 28px;
  }

  .mobilePanelControls {
    padding: 6px;
    gap: 8px;
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
