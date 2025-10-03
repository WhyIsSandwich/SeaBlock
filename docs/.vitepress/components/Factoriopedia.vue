<template>
  <div class="factoripedia">
    <div class="factoripedia-container">
      <!-- Left Panel: Item Browser -->
      <div class="factoripedia-left-panel">
        <div class="factoripedia-header">
          <h2>Factoriopedia</h2>
        </div>

        <!-- Category Filters -->
        <div class="category-filters">
          <div class="filter-row">
            <button
              v-for="category in primaryCategories"
              :key="category.key"
              class="filter-button"
              :class="{ active: selectedCategory === category.key }"
              @click="selectCategory(category.key)"
            >
              <SpriteIcon v-if="category.icon" :sprite-key="category.icon" :title="category.name" />
            </button>
          </div>
        </div>

        <!-- Search -->
        <div class="search-container">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search recipes..."
            class="search-input"
          />
        </div>

        <!-- Recipe Grid -->
        <div ref="itemGrid" class="item-grid">
          <template v-for="subgroup in groupedRecipes" :key="subgroup.subgroup">
            <!-- Subgroup wrapper -->
            <div v-if="subgroup.recipes.length > 0" class="subgroup-grid">
              <IconButton
                v-for="item in subgroup.recipes"
                :key="item.name"
                :type="getPrimaryType(item)"
                :name="item.name"
                :size="36"
                :is-selected="selectedItem?.name === item.name"
                @click="selectItem(getPrimaryType(item), item.name, item)"
              />
            </div>
          </template>
        </div>
      </div>

      <!-- Right Panel: Details -->
      <div class="factoripedia-right-panel">
        <DetailsPane
          :name="selectedItem?.name"
          :type="selectedItem ? getPrimaryType(selectedItem) : null"
          :is-animation-paused="isAnimationPaused"
          @select-item="selectItem"
          @navigate-item="navigateItem"
          @close-details="closeDetails"
          @toggle-animation-pause="toggleAnimationPause"
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
const itemGrid = ref(null)
const isAnimationPaused = ref(false)

// Pre-computed category structure
const categoryStructure = ref({})
const primaryCategories = ref([])
const secondaryCategories = ref([])

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
          recipes: subgroup.recipes.filter(
            recipe =>
              recipe.displayName.toLowerCase().includes(query) ||
              recipe.name.toLowerCase().includes(query)
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

// Function to set up category structure using composable
function setupCategoryStructure() {
  const structure = precomputeCategoryStructure()
  categoryStructure.value = structure

  // Set up primary categories - include all categories from structure
  const validCategories = Object.values(structure)
    .filter(cat => cat.key !== 'all' && cat.key !== 'other') // Exclude 'all' and 'unsorted' as they're added separately
    .sort((a, b) => a.order.localeCompare(b.order))

  primaryCategories.value = [structure['all'], ...validCategories]
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
    updateURL()
  }
}

// Handle keyboard navigation
function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeDetails()
  } else if (event.key === 'ArrowLeft') {
    navigateItem(-1)
  } else if (event.key === 'ArrowRight') {
    navigateItem(1)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
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

.factoripedia-container {
  display: flex;
  height: 100%;
}

/* Left Panel */
.factoripedia-left-panel {
  width: 50%;
  background: #2d2d2d;
  border-right: 2px solid #4a4a4a;
  display: flex;
  flex-direction: column;
  position: relative;
}

.factoripedia-header {
  padding: 12px 16px;
  background: linear-gradient(to bottom, #3a3a3a, #2d2d2d);
  border-bottom: 1px solid #4a4a4a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.factoripedia-header h2 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.category-filters {
  padding: 8px;
  background: linear-gradient(to bottom, #3a3a3a, #2d2d2d);
  border-bottom: 1px solid #4a4a4a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-button {
  width: 64px;
  height: 64px;
  min-width: 64px;
  min-height: 64px;
  max-width: 64px;
  max-height: 64px;
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
.filter-button :deep(.sprite-icon) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

.filter-button:hover {
  background: linear-gradient(to bottom, #5a5a5a, #4a4a4a);
  border-color: #6a6a6a;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.filter-button.active {
  background: linear-gradient(to bottom, #6a6a6a, #5a5a5a);
  border-color: #7a7a7a;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.search-container {
  padding: 8px;
  background: linear-gradient(to bottom, #3a3a3a, #2d2d2d);
  border-bottom: 1px solid #4a4a4a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.search-input {
  width: 100%;
  padding: 6px 8px;
  background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  color: #ffffff;
  font-size: 14px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.search-input::placeholder {
  color: #888888;
}

.search-input:focus {
  outline: none;
  border-color: #7a7a7a;
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.3),
    0 0 0 2px rgba(255, 165, 0, 0.3);
}

.item-grid {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  background: #2a2a2a;
  border: 1px solid #4a4a4a;
  border-radius: 2px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.subgroup-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-auto-rows: 40px;
  gap: 2px;
  width: 100%;
  background: #2a2a2a;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: 1px 1px;
  padding: 1px;
  border-radius: 2px;
}

.item-slot {
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

.item-slot:hover {
  background: linear-gradient(to bottom, #5a5a5a, #4a4a4a);
  border-color: #6a6a6a;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.item-slot.selected {
  background: linear-gradient(to bottom, #6a6a6a, #5a5a5a);
  border-color: #ffa500;
  box-shadow:
    0 0 0 2px #ffa500,
    0 2px 4px rgba(0, 0, 0, 0.4);
}

.item-slot.empty-cell {
  background: transparent;
  border: 1px solid #3a3a3a;
  cursor: default;
  pointer-events: none;
  box-shadow: none;
}

/* Right Panel */
.factoripedia-right-panel {
  width: 50%;
  background: #2d2d2d;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: inset 1px 0 3px rgba(0, 0, 0, 0.3);
}

.item-details,
.recipe-details {
  padding: 16px;
  color: #ffffff;
}

.item-header,
.recipe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #8b7355;
  border-radius: 2px;
}

.item-header h3,
.recipe-header h3 {
  margin: 0;
  color: #000000;
  font-size: 16px;
  font-weight: bold;
}

.header-controls {
  display: flex;
  gap: 4px;
}

.control-button {
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

.control-button:hover {
  background: rgba(0, 0, 0, 0.1);
}

.usage-description {
  margin-bottom: 16px;
}

.usage-description p {
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

.stat-item {
  color: #ffffff;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-item strong {
  color: #ffffff;
}

.stat-item ul {
  margin: 4px 0 0 16px;
  padding: 0;
}

.stat-item li {
  color: #ffffff;
  font-size: 14px;
}

.mod-info {
  color: #87ceeb;
  font-size: 12px;
  margin-bottom: 12px;
}

.item-properties {
  margin-bottom: 16px;
}

.property-item {
  color: #ffffff;
  font-size: 14px;
  margin-bottom: 4px;
}

.item-sections {
  border-top: 1px solid #4a4a4a;
  padding-top: 12px;
}

.item-section {
  margin-bottom: 16px;
}

.item-section h4 {
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.item-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.item-reference {
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

.item-reference:hover {
  background: #5a5a5a;
  border-color: #6a6a6a;
}

/* Recipe Details */
.recipe-content {
  border-top: 1px solid #4a4a4a;
  padding-top: 12px;
}

.recipe-section {
  margin-bottom: 16px;
}

.recipe-section h4 {
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.ingredient-list,
.product-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ingredient-item,
.product-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  background: #4a4a4a;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.ingredient-item:hover,
.product-item:hover {
  background: #5a5a5a;
}

.crafting-time {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
}

.building-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.building-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  padding: 4px;
  background: #4a4a4a;
  border-radius: 2px;
}

.research-item {
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
.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888888;
}

.no-selection-content {
  text-align: center;
}

.no-selection-content h3 {
  margin: 0 0 8px 0;
  color: #ffffff;
}

.no-selection-content p {
  margin: 0;
  font-size: 14px;
}

/* Mobile Responsive Layout */
@media (max-width: 768px) {
  .factoripedia {
    height: auto;
    min-height: 100vh;
  }

  .factoripedia-container {
    flex-direction: column;
    height: auto;
  }

  /* Left Panel - Mobile */
  .factoripedia-left-panel {
    width: 100%;
    border-right: none;
    border-bottom: 2px solid #4a4a4a;
    max-height: 50vh;
    min-height: 300px;
  }

  /* Right Panel - Mobile */
  .factoripedia-right-panel {
    width: 100%;
    min-height: 50vh;
  }

  /* Adjust grid for mobile */
  .item-grid {
    grid-auto-rows: 36px;
    gap: 1px;
  }

  /* Smaller filter buttons on mobile */
  .filter-button {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    max-width: 32px;
    max-height: 32px;
    flex-shrink: 1;
    flex-basis: auto;
    background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .filter-row {
    gap: 4px;
    padding-bottom: 4px;
  }

  /* Adjust header font size */
  .factoripedia-header h2 {
    font-size: 16px;
  }
}

/* iPhone 12 Pro and similar devices */
@media (max-width: 428px) {
  .factoripedia {
    height: auto;
    min-height: 100vh;
  }

  .factoripedia-container {
    flex-direction: column;
  }

  .factoripedia-left-panel {
    width: 100%;
    border-right: none;
    border-bottom: 2px solid #4a4a4a;
    max-height: 45vh;
    min-height: 250px;
  }

  .factoripedia-right-panel {
    width: 100%;
    min-height: 55vh;
  }

  /* Even smaller grid for very small screens */
  .item-grid {
    grid-auto-rows: 32px;
    gap: 1px;
  }

  /* Smaller filter buttons */
  .filter-button {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    max-width: 32px;
    max-height: 32px;
    flex-shrink: 1;
    flex-basis: auto;
    background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .filter-row {
    gap: 2px;
    padding-bottom: 4px;
  }

  /* Adjust padding for mobile */
  .factoripedia-header {
    padding: 8px 12px;
  }

  .category-filters {
    padding: 6px;
  }

  .search-container {
    padding: 6px;
  }

  .item-grid {
    padding: 0 6px;
  }
}

/* Very small screens - extra aggressive shrinking */
@media (max-width: 360px) {
  .filter-button {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    max-width: 28px;
    max-height: 28px;
    flex-shrink: 1;
    background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .filter-row {
    gap: 1px;
  }
}

/* Scrollbar styling */
.item-grid::-webkit-scrollbar,
.factoripedia-right-panel::-webkit-scrollbar {
  width: 8px;
}

.item-grid::-webkit-scrollbar-track,
.factoripedia-right-panel::-webkit-scrollbar-track {
  background: #3a3a3a;
}

.item-grid::-webkit-scrollbar-thumb,
.factoripedia-right-panel::-webkit-scrollbar-thumb {
  background: #5a5a5a;
  border-radius: 4px;
}

.item-grid::-webkit-scrollbar-thumb:hover,
.factoripedia-right-panel::-webkit-scrollbar-thumb:hover {
  background: #6a6a6a;
}
</style>
