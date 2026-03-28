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
        <div :class="$style.browseHeaderStack">
          <div :class="$style.factoripediaHeader">
            <h2>Factoriopedia</h2>
            <div :class="$style.factoripediaHeaderActions">
              <button
                v-if="sciencePackTriggerIconPack"
                ref="sciencePackTriggerRef"
                type="button"
                :class="[
                  $style.sciencePackHeaderTrigger,
                  {
                    [$style.sciencePackHeaderTriggerOpen]: sciencePackPanelOpen,
                    [$style.sciencePackHeaderTriggerActive]: hasActiveScienceFilter
                  }
                ]"
                aria-haspopup="dialog"
                :aria-expanded="sciencePackPanelOpen"
                aria-controls="factoriopedia-science-pack-panel"
                title="Science pack filters"
                @click="toggleSciencePackPanel"
              >
                <SpriteIcon
                  :sprite-key="`item-${sciencePackTriggerIconPack.name}`"
                  :size="22"
                  :fill-ratio="CATEGORY_ICON_FILL_RATIO"
                  :title="sciencePackTriggerIconPack.displayName"
                />
                <span :class="$style.sciencePackHeaderCount">
                  {{ selectedSciencePacks.length }}/{{ sciencePackOptions.length }}
                </span>
              </button>
              <label :class="$style.localeLabel">
                <span :class="$style.visuallyHidden">Language</span>
                <select
                  :class="$style.localeSelect"
                  :value="currentLanguage"
                  aria-label="Factoriopedia data language"
                  @change="onLocaleChange($event.target.value)"
                >
                  <option value="en">English</option>
                </select>
              </label>
              <span
                v-if="datasetVersionLabel"
                :class="$style.datasetVersionBadge"
                :title="'Dataset build metadata from data.json'"
              >
                {{ datasetVersionLabel }}
              </span>
              <button
                type="button"
                :class="[$style.headerActionButton, 'fpio-button-chrome']"
                title="Keyboard shortcuts"
                aria-label="Keyboard shortcuts"
                @click="showKeyboardHelp = true; closeSciencePackPanel()"
              >
                ?
              </button>
              <button
                type="button"
                :class="[
                  $style.headerActionButton,
                  'fpio-button-chrome',
                  { [$style.headerActionButtonFlash]: linkCopyStatus === 'copied' }
                ]"
                title="Copy link to this view"
                :aria-label="
                  linkCopyStatus === 'copied'
                    ? 'Link copied'
                    : linkCopyStatus === 'failed'
                      ? 'Copy failed'
                      : 'Copy link to this view'
                "
                @click="copyShareLink"
              >
                {{
                  linkCopyStatus === 'copied'
                    ? 'Copied!'
                    : linkCopyStatus === 'failed'
                      ? 'Copy failed'
                      : 'Link'
                }}
              </button>
              <span aria-live="polite" :class="$style.visuallyHidden">
                {{
                  linkCopyStatus === 'copied'
                    ? 'Link copied to clipboard.'
                    : linkCopyStatus === 'failed'
                      ? 'Could not copy link.'
                      : ''
                }}
              </span>
            </div>
          </div>
        </div>

        <!-- Category Filters -->
        <div :style="{ ...categoryGrid.containerStyles, overflowY: 'visible' }">
          <div
            :style="{
              ...categoryGrid.subgroupStyles,
              backgroundImage: 'none',
              background: 'transparent'
            }"
          >
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
              :aria-label="category.name || category.key"
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
          <div :class="$style.searchRow">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search recipes..."
              :class="$style.searchInput"
              aria-label="Search recipes"
              autocomplete="off"
            >
          </div>
        </div>

        <!-- Recipe Grid -->
        <div
          ref="gridContainer"
          :class="$style.itemGrid"
          :style="itemGrid.containerStyles"
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
          @open-tech-tree="openResearchMap"
        />
      </div>
    </div>

    <div
      v-if="showKeyboardHelp"
      :class="$style.modalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="factoriopedia-kbd-title"
      @click.self="showKeyboardHelp = false"
    >
      <div :class="$style.modalPanel" @keydown.esc.stop="showKeyboardHelp = false">
        <h3 id="factoriopedia-kbd-title">Keyboard shortcuts</h3>
        <ul :class="$style.kbdList">
          <li><kbd>←</kbd> <kbd>→</kbd> Previous / next item in the grid</li>
          <li><kbd>↑</kbd> <kbd>↓</kbd> Move up / down a row (keeps column, clamps to row end)</li>
          <li><kbd>Esc</kbd> Close details</li>
          <li><kbd>?</kbd> Toggle this help</li>
        </ul>
        <p :class="$style.modalHint">
          URL query parameters <code>category</code>, <code>science</code>, <code>q</code>, and
          <code>locale</code> persist browse state; the hash selects the open item.
        </p>
        <button type="button" :class="$style.modalClose" @click="showKeyboardHelp = false">
          Close
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="sciencePackPanelOpen"
        :class="$style.sciencePackPortal"
      >
        <div
          :class="$style.sciencePackBackdrop"
          aria-hidden="true"
          @click="closeSciencePackPanel"
        />
        <div
          id="factoriopedia-science-pack-panel"
          role="dialog"
          aria-label="Science pack filters"
          :class="$style.sciencePackPopover"
          :style="sciencePackPopoverStyle"
          @click.stop
        >
          <div :class="$style.sciencePackPopoverToolbar">
            <span :class="$style.sciencePackPopoverTitle">Science packs</span>
            <button
              type="button"
              :class="$style.clearScienceFiltersButton"
              :disabled="selectedSciencePacks.length === 0"
              @click="clearSciencePackFilters"
            >
              Clear
            </button>
          </div>
          <div :class="$style.sciencePackPopoverGrid">
            <button
              v-for="pack in sciencePackOptions"
              :key="pack.name"
              type="button"
              :class="[
                $style.sciencePackIconButton,
                {
                  [$style.sciencePackIconButtonActive]: selectedSciencePackSet.has(pack.name)
                }
              ]"
              :title="pack.displayName"
              :aria-label="pack.displayName"
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
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide } from 'vue'
import { useRouter, withBase } from 'vitepress'

import { useUnifiedObjects, useFactorioData } from '../../../src/index.js'
import { useFactorioGrid } from '../../../src/composables/useFactorioGrid.js'
import { fuzzyMatchQuery } from '../../../src/utils/fuzzySearch.js'
import {
  buildVisualRows,
  findSelectedGridIndex,
  getFlatGridItems,
  resolveVerticalNavigationTarget
} from '../../../src/utils/gridNavigation.js'

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
  getSciencePackDependencyMap,
  createSciencePackVisibility,
  getFactoriopediaExportMeta,
  currentLanguage
} = useFactorioData()
const router = useRouter()
const selectedItem = ref(null)
const selectedCategory = ref('logistics')
const searchQuery = ref('')
const isAnimationPaused = ref(false)
const selectedSciencePacks = ref([])

const showKeyboardHelp = ref(false)
const sciencePackPanelOpen = ref(false)
const sciencePackTriggerRef = ref(null)
/** @type {import('vue').Ref<Record<string, string>>} */
const sciencePackPopoverStyle = ref({})
let sciencePackPositionListenersCleanup = null
const verticalNavigationColumn = ref(null)
/** @type {import('vue').Ref<'idle' | 'copied' | 'failed'>} */
const linkCopyStatus = ref('idle')
let linkCopyStatusTimer = null
const isApplyingUrl = ref(false)

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
let gridResizeObserver = null

// Pre-computed category structure
const categoryStructure = ref({})
const primaryCategories = ref([])
const secondaryCategories = ref([])
const isMobileViewport = ref(false)
const activeMobilePanel = ref('browse')

const selectedSciencePackSet = computed(() => new Set(selectedSciencePacks.value))
const sciencePackVisibility = computed(() => createSciencePackVisibility(selectedSciencePacks.value))
const hasActiveScienceFilter = computed(() => selectedSciencePacks.value.length > 0)
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

/**
 * Lowercased text for search: display name + internal id (ids are unique and help fuzzy match).
 */
function getRecipeSearchText(recipe) {
  if (!recipe || typeof recipe !== 'object') return ''
  const display = recipe.displayName?.toLowerCase?.() || ''
  const internal = (recipe.name || '').toLowerCase()
  return [display, internal].filter(Boolean).join(' ')
}

function recipeMatchesSearch(recipe, queryRaw) {
  if (!queryRaw || !queryRaw.trim()) return true
  const query = queryRaw.trim().toLowerCase()
  const combined = getRecipeSearchText(recipe)
  const id = (recipe.name || '').toLowerCase()

  if (combined.includes(query) || id.includes(query)) return true

  const tokens = query.split(/\s+/).filter(t => t.length > 0)
  if (tokens.length === 0) return true

  const wordSplit = s => s.split(/[\s\-_/]+/).filter(Boolean)

  return tokens.every(token => {
    if (combined.includes(token) || id.includes(token)) return true
    if (fuzzyMatchQuery(token, combined)) return true
    if (fuzzyMatchQuery(token, id)) return true
    const hayWords = wordSplit(combined)
    return hayWords.some(
      word => word.includes(token) || fuzzyMatchQuery(token, word) || fuzzyMatchQuery(token, id)
    )
  })
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

/** Icon on the compact header control — first pack in list. */
const sciencePackTriggerIconPack = computed(() => sciencePackOptions.value[0] ?? null)

const sciencePackDependencyMap = computed(() => getSciencePackDependencyMap())

const sciencePackOrderLookup = computed(() => {
  const lookup = new Map()
  sciencePackOptions.value.forEach((pack, index) => {
    lookup.set(pack.name, index)
  })
  return lookup
})

function clearSciencePackFilters() {
  selectedSciencePacks.value = []
}

function toggleSciencePackPanel() {
  sciencePackPanelOpen.value = !sciencePackPanelOpen.value
}

function closeSciencePackPanel() {
  sciencePackPanelOpen.value = false
}

function updateSciencePackPopoverPosition() {
  if (typeof window === 'undefined' || !sciencePackTriggerRef.value) return
  const trigger = sciencePackTriggerRef.value
  const r = trigger.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const gap = 6
  const popoverWidth = Math.min(260, vw - 16)
  const totalH = Math.min(vh * 0.42, 248) + 28

  let left = r.left + r.width / 2 - popoverWidth / 2
  left = Math.max(8, Math.min(left, vw - popoverWidth - 8))

  let top = r.bottom + gap
  if (top + totalH > vh - 10) {
    top = r.top - gap - totalH
  }
  top = Math.max(10, Math.min(top, vh - totalH - 10))

  sciencePackPopoverStyle.value = {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(popoverWidth)}px`
  }
}

function bindSciencePackPositionListeners() {
  if (typeof window === 'undefined') return () => {}
  const sync = () => {
    if (sciencePackPanelOpen.value) updateSciencePackPopoverPosition()
  }
  window.addEventListener('resize', sync)
  window.addEventListener('scroll', sync, true)
  return () => {
    window.removeEventListener('resize', sync)
    window.removeEventListener('scroll', sync, true)
  }
}

function collectSciencePackDependencies(packName, dependencyMap, collected = new Set()) {
  const dependencies = dependencyMap?.[packName] || []
  dependencies.forEach(dependencyName => {
    if (!collected.has(dependencyName)) {
      collected.add(dependencyName)
      collectSciencePackDependencies(dependencyName, dependencyMap, collected)
    }
  })
  return collected
}

function pruneInaccessibleSciencePacks(selectedSet, dependencyMap) {
  let changed = true
  while (changed) {
    changed = false
    for (const packName of Array.from(selectedSet)) {
      const dependencies = dependencyMap?.[packName] || []
      const hasMissingDependency = dependencies.some(dependencyName => !selectedSet.has(dependencyName))
      if (hasMissingDependency) {
        selectedSet.delete(packName)
        changed = true
      }
    }
  }
}

function toOrderedSciencePackArray(selectedSet) {
  const orderLookup = sciencePackOrderLookup.value
  return Array.from(selectedSet).sort((left, right) => {
    const leftOrder = orderLookup.get(left) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = orderLookup.get(right) ?? Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return left.localeCompare(right)
  })
}

function toggleSciencePack(packName) {
  if (!packName) return

  const dependencyMap = sciencePackDependencyMap.value
  const selected = new Set(selectedSciencePacks.value)
  if (selected.has(packName)) {
    selected.delete(packName)
    pruneInaccessibleSciencePacks(selected, dependencyMap)
  } else {
    selected.add(packName)
    collectSciencePackDependencies(packName, dependencyMap).forEach(dependencyName => {
      selected.add(dependencyName)
    })
  }
  selectedSciencePacks.value = toOrderedSciencePackArray(selected)
}

function setSciencePacksFromUrlParam(param) {
  if (!param || !param.trim()) {
    selectedSciencePacks.value = []
    return
  }
  const names = param.split(',').map(s => s.trim()).filter(Boolean)
  const dependencyMap = sciencePackDependencyMap.value
  const selected = new Set()
  const validNames = new Set(sciencePackOptions.value.map(p => p.name))
  for (const name of names) {
    if (!validNames.has(name)) continue
    selected.add(name)
    collectSciencePackDependencies(name, dependencyMap).forEach(d => selected.add(d))
  }
  selectedSciencePacks.value = toOrderedSciencePackArray(selected)
}

const datasetVersionLabel = computed(() => {
  const meta = getFactoriopediaExportMeta()
  if (!meta?.generatedAt) return ''
  const d = new Date(meta.generatedAt)
  if (Number.isNaN(d.getTime())) return ''
  return `Data ${d.toISOString().slice(0, 10)}`
})

// Computed property for filtered and grouped recipes
const filteredSubgroupsByCategory = computed(() => {
  if (!categoryStructure.value || Object.keys(categoryStructure.value).length === 0) {
    return {}
  }

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
          return recipeMatchesSearch(recipe, searchQuery.value)
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

const accessibleCategoryKeys = computed(() => {
  const accessible = new Set()
  const visibleSet = sciencePackVisibility.value

  Object.entries(categoryStructure.value || {}).forEach(([categoryKey, categoryData]) => {
    const hasAccessibleEntries = (categoryData?.subgroups || []).some(subgroup =>
      (subgroup?.recipes || []).some(recipe => visibleSet.isUnifiedObjectVisible(recipe))
    )
    if (hasAccessibleEntries) {
      accessible.add(categoryKey)
    }
  })

  return accessible
})

const visiblePrimaryCategories = computed(() => {
  if (!hasActiveScienceFilter.value) {
    return primaryCategories.value
  }
  return primaryCategories.value.filter(category => accessibleCategoryKeys.value.has(category.key))
})

const firstEnabledCategoryKey = computed(() => {
  const sortedCategories = [...visiblePrimaryCategories.value]
  for (const category of sortedCategories) {
    if (hasActiveScienceFilter.value) {
      return category.key
    }
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
  const allItems = getFlatGridItems(groupedRecipes.value)
  const currentIndex = findSelectedGridIndex(allItems, selectedItem.value, getPrimaryType)
  if (currentIndex === -1) return

  const newIndex = currentIndex + direction
  if (newIndex >= 0 && newIndex < allItems.length) {
    verticalNavigationColumn.value = null
    const item = allItems[newIndex]
    selectItem(getPrimaryType(item), item.name, item)
  }
}

function navigateItemVertical(deltaRow) {
  const cols = Math.max(1, itemGrid.value.columns || 1)
  const allItems = getFlatGridItems(groupedRecipes.value)
  const rows = buildVisualRows(groupedRecipes.value, cols)
  const currentIndex = findSelectedGridIndex(allItems, selectedItem.value, getPrimaryType)
  if (currentIndex === -1) return

  const target = resolveVerticalNavigationTarget({
    currentIndex,
    deltaRow,
    rows,
    preferredColumn: verticalNavigationColumn.value
  })
  if (!target) return

  verticalNavigationColumn.value = target.preferredColumn
  const item = allItems[target.targetIndex]
  if (item) {
    selectItem(getPrimaryType(item), item.name, item, { preserveVerticalColumn: true })
  }
}

function closeDetails() {
  selectedItem.value = null
  if (isMobileViewport.value) {
    activeMobilePanel.value = 'browse'
  }
  updateURL()
}

function openResearchMap() {
  if (typeof window === 'undefined') return
  const selected = selectedItem.value
  if (!selected || getPrimaryType(selected) !== 'technology') return
  const target = withBase('/reference/research-map.html')
  const hash = `#technology=${encodeURIComponent(selected.name)}`
  router.go(`${target}${hash}`)
}

function toggleAnimationPause() {
  isAnimationPaused.value = !isAnimationPaused.value
}

// URL management (hash = selection; query = browse state)
function getInitialLocaleFromUrl() {
  if (typeof window === 'undefined') return 'en'
  try {
    return new URL(window.location.href).searchParams.get('locale') || 'en'
  } catch {
    return 'en'
  }
}

function updateURL() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (selectedItem.value) {
    const primaryType = getPrimaryType(selectedItem.value)
    url.hash = `#${primaryType}=${selectedItem.value.name}`
  } else {
    url.hash = ''
  }

  if (selectedCategory.value) {
    url.searchParams.set('category', selectedCategory.value)
  } else {
    url.searchParams.delete('category')
  }

  if (selectedSciencePacks.value.length > 0) {
    url.searchParams.set('science', selectedSciencePacks.value.join(','))
  } else {
    url.searchParams.delete('science')
  }

  const q = searchQuery.value.trim()
  if (q) {
    url.searchParams.set('q', q)
  } else {
    url.searchParams.delete('q')
  }

  if (currentLanguage.value && currentLanguage.value !== 'en') {
    url.searchParams.set('locale', currentLanguage.value)
  } else {
    url.searchParams.delete('locale')
  }

  window.history.replaceState({}, '', url)
}

function applyBrowseStateFromUrl() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const cat = url.searchParams.get('category')
  if (cat && categoryStructure.value[cat]) {
    selectedCategory.value = cat
  }
  setSciencePacksFromUrlParam(url.searchParams.get('science') || '')
  const q = url.searchParams.get('q')
  searchQuery.value = q !== null ? q : ''
}

function parseHashForSelection() {
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

async function copyShareLink() {
  if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
    linkCopyStatus.value = 'failed'
    if (linkCopyStatusTimer) clearTimeout(linkCopyStatusTimer)
    linkCopyStatusTimer = setTimeout(() => {
      linkCopyStatus.value = 'idle'
    }, 2200)
    return
  }
  try {
    await navigator.clipboard.writeText(window.location.href)
    linkCopyStatus.value = 'copied'
  } catch (e) {
    console.warn('Failed to copy link', e)
    linkCopyStatus.value = 'failed'
  }
  if (linkCopyStatusTimer) clearTimeout(linkCopyStatusTimer)
  linkCopyStatusTimer = setTimeout(() => {
    linkCopyStatus.value = 'idle'
  }, 2200)
}

async function onLocaleChange(lang) {
  if (!lang || lang === currentLanguage.value) return
  try {
    await loadAllData(lang)
    setupCategoryStructure()
    isApplyingUrl.value = true
    try {
      applyBrowseStateFromUrl()
      await nextTick()
      parseHashForSelection()
    } finally {
      isApplyingUrl.value = false
    }
    updateURL()
  } catch (e) {
    console.error('Failed to load locale', e)
  }
}

// Lifecycle
onMounted(async () => {
  const initialLocale = getInitialLocaleFromUrl()
  await loadAllData(initialLocale)

  setupCategoryStructure()

  isApplyingUrl.value = true
  try {
    applyBrowseStateFromUrl()
    await nextTick()
    parseHashForSelection()
  } finally {
    isApplyingUrl.value = false
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', onPopState)
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('resize', updateMobileViewport)
    updateMobileViewport()
  }

  await nextTick()
  if (gridContainer.value && typeof ResizeObserver !== 'undefined') {
    gridResizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        gridContainerWidth.value = entry.contentRect.width
      }
    })
    gridResizeObserver.observe(gridContainer.value)
  }

  setTimeout(() => {
    if (gridContainer.value && gridContainerWidth.value === 0) {
      gridContainerWidth.value = gridContainer.value.offsetWidth
    }
  }, 100)
})

function onPopState() {
  isApplyingUrl.value = true
  try {
    applyBrowseStateFromUrl()
    nextTick(() => {
      parseHashForSelection()
    })
  } finally {
    isApplyingUrl.value = false
  }
}

function onHashChange() {
  if (isApplyingUrl.value) return
  isApplyingUrl.value = true
  try {
    parseHashForSelection()
  } finally {
    isApplyingUrl.value = false
  }
}

let searchUrlTimer
watch(searchQuery, () => {
  clearTimeout(searchUrlTimer)
  searchUrlTimer = setTimeout(() => {
    if (!isApplyingUrl.value) updateURL()
  }, 350)
})

watch([selectedCategory, selectedSciencePacks, selectedItem], () => {
  if (isApplyingUrl.value) return
  updateURL()
}, { deep: true })

watch(
  sciencePackPanelOpen,
  async open => {
    await nextTick()
    if (open) {
      updateSciencePackPopoverPosition()
      if (sciencePackPositionListenersCleanup) sciencePackPositionListenersCleanup()
      sciencePackPositionListenersCleanup = bindSciencePackPositionListeners()
    } else if (sciencePackPositionListenersCleanup) {
      sciencePackPositionListenersCleanup()
      sciencePackPositionListenersCleanup = null
    }
  }
)

// Unified selection functions
function selectItem(type, name, data = null, options = {}) {
  if (!options.preserveVerticalColumn) {
    verticalNavigationColumn.value = null
  }
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
  const tag = event.target?.tagName
  const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  if (event.key === 'Escape') {
    if (showKeyboardHelp.value) {
      showKeyboardHelp.value = false
      return
    }
    if (sciencePackPanelOpen.value) {
      closeSciencePackPanel()
      return
    }
    closeDetails()
    showMRUDropdown.value = false
    return
  }
  if (inField) return
  if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault()
    closeSciencePackPanel()
    showKeyboardHelp.value = !showKeyboardHelp.value
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    navigateItem(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    navigateItem(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    navigateItemVertical(-1)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    navigateItemVertical(1)
  }
}

onUnmounted(() => {
  if (sciencePackPositionListenersCleanup) {
    sciencePackPositionListenersCleanup()
    sciencePackPositionListenersCleanup = null
  }
  if (linkCopyStatusTimer) clearTimeout(linkCopyStatusTimer)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', updateMobileViewport)
  window.removeEventListener('popstate', onPopState)
  window.removeEventListener('hashchange', onHashChange)
  if (gridResizeObserver) {
    gridResizeObserver.disconnect()
    gridResizeObserver = null
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
@import './factoriopediaSharedPrimitives.css';

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
  min-height: 0;
  background: #262626;
  border-right: 2px solid #1a1a1a;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
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
  gap: 10px;
}

.factoripediaHeader h2 {
  margin: 0;
  color: #e0d2bd;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
  flex: 1;
  min-width: 0;
}

.factoripediaHeaderActions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  justify-content: flex-end;
}

.browseHeaderStack {
  flex-shrink: 0;
}

.sciencePackHeaderTrigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px 2px 5px;
  border: 1px solid #4f4f4f;
  border-radius: 2px;
  background: linear-gradient(to bottom, #434343, #343434);
  color: #e6e6e6;
  cursor: pointer;
  font: inherit;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.sciencePackHeaderTrigger:hover {
  border-color: #6f6f6f;
  background: linear-gradient(to bottom, #525252, #3f3f3f);
}

.sciencePackHeaderTriggerOpen {
  position: relative;
  z-index: 10024;
  border-color: #b78c45;
  box-shadow:
    inset 0 0 0 1px rgba(255, 200, 100, 0.15),
    0 1px 2px rgba(0, 0, 0, 0.45);
}

.sciencePackHeaderTriggerActive {
  border-color: #d89b2a;
  background: linear-gradient(to bottom, #4a3820, #3a2a18);
}

.sciencePackHeaderCount {
  font-size: 10px;
  font-weight: 700;
  color: #e6e6e6;
  letter-spacing: 0.02em;
}

/* Teleported overlay: does not consume browse column height */
.sciencePackPortal {
  position: fixed;
  inset: 0;
  z-index: 10022;
  pointer-events: none;
}

.sciencePackBackdrop {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.42);
}

.sciencePackPopover {
  pointer-events: auto;
  z-index: 10023;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px 10px;
  max-height: min(42vh, 248px);
  background: linear-gradient(to bottom, #2e2e2e, #222);
  border: 1px solid #4a4a4a;
  border-radius: 3px;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.sciencePackPopoverToolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.sciencePackPopoverTitle {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #b8b8b8;
}

.sciencePackPopoverGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 34px);
  gap: 4px;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  padding: 2px 0 1px;
}

.sciencePackIconButton {
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
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.sciencePackIconButton:hover {
  border-color: #6f6f6f;
  background: linear-gradient(to bottom, #525252, #3f3f3f);
}

.sciencePackIconButtonActive {
  border-color: #d89b2a;
  background: linear-gradient(to bottom, #efb046, #c5861d);
  box-shadow:
    inset 0 0 0 1px rgba(255, 224, 160, 0.25),
    0 1px 2px rgba(0, 0, 0, 0.45);
}

.localeLabel {
  display: inline-flex;
  align-items: center;
}

.localeSelect {
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 2px;
  background: #333;
  color: #eee;
  border: 1px solid #555;
  max-width: 120px;
}

.visuallyHidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.headerActionButton {
  color: #e6e6e6;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
}

.headerActionButton:hover {
  border-color: #cf9428;
  color: #fff;
}

.headerActionButtonFlash {
  border-color: #56c97a;
  color: #c8ffd8;
}

.datasetVersionBadge {
  font-size: 10px;
  font-weight: 600;
  color: #a8a8a8;
  padding: 2px 6px;
  border: 1px solid #4a4a4a;
  border-radius: 2px;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modalBackdrop {
  position: fixed;
  inset: 0;
  z-index: 10030;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modalPanel {
  background: #2e2e2e;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 16px 18px;
  max-width: min(420px, 100%);
  color: #e8e8e8;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
}

.modalPanel h3 {
  margin: 0 0 10px;
  font-size: 16px;
}

.kbdList {
  margin: 0 0 12px;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.45;
}

.kbdList kbd {
  display: inline-block;
  padding: 1px 6px;
  border: 1px solid #666;
  border-radius: 2px;
  background: #1f1f1f;
  font-size: 12px;
}

.modalHint {
  font-size: 12px;
  color: #b8b8b8;
  margin: 0 0 12px;
  line-height: 1.4;
}

.modalHint code {
  font-size: 11px;
  color: #f0d090;
}

.modalClose {
  border: 1px solid #6a6a6a;
  background: #3a3a3a;
  color: #fff;
  padding: 6px 14px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 13px;
}

.searchRow {
  margin-bottom: 6px;
}

.filterButton {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
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

.clearScienceFiltersButton {
  background: linear-gradient(to bottom, #3a3a3a, #2a2a2a);
  border: 1px solid #575757;
  border-radius: 2px;
  color: #d5d5d5;
  font-size: 11px;
  padding: 1px 5px;
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
  flex-shrink: 0;
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
    background-image: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  /* Adjust header font size */
  .factoripediaHeader h2 {
    font-size: 16px;
  }

  .sciencePackPopover {
    max-height: min(48vh, 260px);
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
    background-image: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  /* Adjust padding for mobile */
  .factoripediaHeader {
    padding: 8px 12px;
  }

  .searchContainer {
    padding: 6px;
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
    background-image: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
}

/* Scrollbar styling */
.factoripediaLeftPanel::-webkit-scrollbar,
.factoripediaRightPanel::-webkit-scrollbar,
.sciencePackPopoverGrid::-webkit-scrollbar {
  width: 8px;
}

.factoripediaLeftPanel::-webkit-scrollbar-track,
.factoripediaRightPanel::-webkit-scrollbar-track,
.sciencePackPopoverGrid::-webkit-scrollbar-track {
  background: #3a3a3a;
}

.factoripediaLeftPanel::-webkit-scrollbar-thumb,
.factoripediaRightPanel::-webkit-scrollbar-thumb,
.sciencePackPopoverGrid::-webkit-scrollbar-thumb {
  background: #5a5a5a;
  border-radius: 4px;
}

.factoripediaLeftPanel::-webkit-scrollbar-thumb:hover,
.factoripediaRightPanel::-webkit-scrollbar-thumb:hover,
.sciencePackPopoverGrid::-webkit-scrollbar-thumb:hover {
  background: #6a6a6a;
}
</style>
