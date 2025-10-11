<template>
  <template v-if="section.type === ''" />
  <template v-else-if="section.type === 'technology_cost'">
    <div :class="$style.section">
      <h4 :class="$style.sectionTitle">{{ section.label }}</h4>
      <div v-if="section.items?.length > 0" :class="getItemsContainerClass()">
        <div
          v-for="item in section.items"
          :key="`${item.type}-${item.name}`"
          :class="getItemEntryClass()"
        >
          <IconButton
            :type="item.type"
            :name="item.name"
            :size="getIconSize()"
            :clickable="true"
            @click="handleItemClick(item)"
            :show-tooltip="showTooltip"
          />
        </div>
        <div style="text-align: center; display: flex; vertical-align: middle; align-items: center">
          🕛{{ section.statistics[1].value }}
        </div>
        <div style="text-align: center; display: flex; vertical-align: middle; align-items: center">
          x {{ section.statistics[0].value }}
        </div>
      </div>
    </div>
  </template>
  <template v-else-if="section.type === 'unlock_technologies'">
    <div :class="$style.section">
      <h4 :class="$style.sectionTitle">{{ section.label }}</h4>
      <div v-if="section.items?.length > 0" :class="$style.unlockTechnologies">
        <div
          v-for="item in section.items"
          :key="`${item.type}-${item.name}`"
          :class="$style.technologyEntry"
        >
          <!-- Technology Icon with Tooltip (3 boxes high) -->
          <div :class="$style.technologyIcon" @click="handleItemClick(item)">
            <IconButton
              :type="item.type"
              :name="item.name"
              :size="32"
              :clickable="true"
              :show-tooltip="showTooltip"
              @click="handleItemClick(item)"
            />
          </div>

          <!-- Technology Level (if prototype name ends with a number) -->
          <div :class="$style.technologyLevel">
            {{ getTechnologyLevel(item.name) }}
          </div>

          <!-- Science Pack Icons / Unlock Requirements -->
          <div :class="$style.sciencePacks">
            <IconButton
              v-for="pack in getSciencePacks(item.name)"
              :key="pack.name"
              :type="'item'"
              :name="pack.name"
              :size="16"
              :clickable="true"
              :show-tooltip="showTooltip"
              @click="handleItemClick(pack)"
            />
          </div>
        </div>
      </div>
    </div>
  </template>
  <template v-else-if="section.type === 'crafting_time'">
    <div :class="$style.section">🕛{{ section.statistics[0]?.value }} s Crafting time</div>
  </template>
  <template v-else>
    <div :class="$style.section">
      <h4 :class="$style.sectionTitle">{{ section.label }}</h4>

      <!-- Statistics for this section -->
      <Statistics v-if="section.statistics?.length > 0" :statistics="section.statistics" />

      <!-- Items for this section -->
      {{ section.items?.length > 0 && section.itemsLabel ? section.itemsLabel + ':' : null }}
      <div
        v-if="section.items?.length > 0"
        :class="getItemsContainerClass()"
        :style="isGridLayout ? sectionGrid.containerStyles : {}"
        ref="gridContainer"
      >
        <!-- Use composable's grid structure -->
        <div v-if="isGridLayout" :style="sectionGrid.subgroupStyles">
          <IconButton
            v-for="item in section.items"
            :key="`${item.type}-${item.name}`"
            :style="sectionGrid.itemStyles"
            :size="sectionGrid.buttonSize"
            :type="item.type"
            :name="item.name"
            :clickable="true"
            :show-tooltip="showTooltip"
            @click="handleItemClick(item)"
          />
        </div>
        <!-- List layout without subgroup wrapper -->
        <template v-else>
          <div
            v-for="item in section.items"
            :key="`${item.type}-${item.name}`"
            :class="getItemEntryClass()"
          >
            <IconButton
              :type="item.type"
              :name="item.name"
              :size="40"
              :clickable="true"
              :show-tooltip="showTooltip"
              @click="handleItemClick(item)"
            />
            <span v-if="shouldShowLabel()" :class="$style.itemLabel">{{
              getItemLabel(item) || item.name
            }}</span>
          </div>
        </template>
      </div>
    </div>
  </template>
</template>

<script>
import { ref, computed } from 'vue'

import { useLocalizedData } from '../composables/useLocalizedData'
import { useFactorioGrid } from '../../../src/composables/useFactorioGrid.js'

import IconButton from './IconButton.vue'
import Statistics from './Statistics.vue'

export default {
  name: 'DetailsPaneSection',
  components: {
    IconButton,
    Statistics
  },
  props: {
    section: {
      type: Object,
      required: true,
      validator: value => {
        return value && typeof value.type === 'string'
      }
    },
    showTooltip: {
      type: Boolean,
      default: true
    }
  },
  emits: ['select-item', 'item-selected'],
  setup() {
    const { localizedData, loadLocalizedData } = useLocalizedData()

    // Grid container width tracking
    const gridContainerWidth = ref(0)
    const gridContainer = ref(null)

    // Use the grid composable for section grids
    const itemCount = ref(0)

    const sectionGrid = computed(() =>
      useFactorioGrid({
        containerWidth: gridContainerWidth.value,
        minButtonSize: 32,
        maxColumns: 10,
        gap: 2,
        padding: 4,
        filterId: '-section'
      })
    )

    return {
      localizedData,
      loadLocalizedData,
      gridContainerWidth,
      gridContainer,
      sectionGrid
    }
  },
  computed: {
    isGridLayout() {
      return this.section.itemsType === 'grid'
    },
    isListLayout() {
      return !this.section.itemsType || this.section.itemsType === 'list'
    }
  },
  watch: {
    section: {
      handler() {
        this.updateItemCount()
      },
      deep: true
    }
  },
  async mounted() {
    await this.loadLocalizedData()
    this.updateItemCount()
    this.setupGridResizeObserver()

    // Initialize grid container width if not set
    if (this.gridContainer && this.gridContainerWidth === 0) {
      this.gridContainerWidth = this.gridContainer.offsetWidth
    }

    // Fallback: Set initial width after a short delay (like Factoriopedia)
    setTimeout(() => {
      if (this.gridContainer && this.gridContainerWidth === 0) {
        const width = this.gridContainer.offsetWidth
        this.gridContainerWidth = width
      }
    }, 100)
  },
  beforeUnmount() {
    this.cleanupGridResizeObserver()
  },
  methods: {
    getItemLabel(item) {
      const localisedName = this.localizedData?.[item.type]?.[item.name]?.n
      if (!item.label) {
        return localisedName
      }
      return item.label?.replace(/{{item_name}}/g, localisedName)
    },
    handleItemClick(_item) {
      // No need to emit - IconButton handles this directly via provide/inject
    },
    getItemsContainerClass() {
      if (this.isGridLayout) {
        return this.$style.itemsGrid
      }
      return this.$style.itemsList
    },
    getItemEntryClass() {
      if (this.isGridLayout) {
        return this.$style.gridItem
      }
      return this.$style.itemEntry
    },
    getIconSize() {
      return this.isGridLayout ? this.sectionGrid.buttonSize.value : 24
    },
    shouldShowLabel() {
      // In grid layout, only show labels if explicitly requested
      if (this.isGridLayout) {
        return this.section.showLabels || false
      }
      // In list layout, always show labels
      return true
    },
    updateItemCount() {
      this.itemCount = this.section?.items?.length || 0
      // Force grid recalculation when item count changes
      this.$nextTick(() => {
        if (this.gridContainer && this.gridContainerWidth === 0) {
          this.gridContainerWidth = this.gridContainer.offsetWidth
        }
      })
    },
    setupGridResizeObserver() {
      // Set up ResizeObserver to track grid container width (like Factoriopedia)
      if (this.gridContainer && typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(entries => {
          for (const entry of entries) {
            this.gridContainerWidth = entry.contentRect.width
          }
        })
        this.resizeObserver.observe(this.gridContainer)
      } else if (this.gridContainer) {
        // Fallback: set initial width and use a simple interval to check for changes
        this.gridContainerWidth = this.gridContainer.offsetWidth
        this.widthCheckInterval = setInterval(() => {
          if (this.gridContainer && this.gridContainer.offsetWidth !== this.gridContainerWidth) {
            this.gridContainerWidth = this.gridContainer.offsetWidth
          }
        }, 100)
      }
    },
    cleanupGridResizeObserver() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
      }
      if (this.widthCheckInterval) {
        clearInterval(this.widthCheckInterval)
      }
    },
    getTechnologyLevel(techName) {
      // Check if technology name ends with a number (multi-level research)
      const match = techName.match(/(\d+)$/)
      return match ? match[1] : ''
    },
    getSciencePacks(techName) {
      // This would need to be implemented based on your data structure
      // For now, return empty array - you'll need to implement this based on your technology data
      return []
    }
  }
}
</script>

<style module>
.section {
  margin-bottom: 16px;
  padding: 12px;
  background: #2a2a2a;
  border-radius: 4px;
  border: 1px solid #3a3a3a;
}

.sectionTitle {
  margin: 0 0 8px 0;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  text-transform: capitalize;
}

.itemsList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.itemsGrid {
  display: grid;
  /* Grid properties are handled by composable inline styles */
  max-height: 200px;
  overflow-y: auto;
  background: #1f1f1f;
  border: 1px solid #4a4a4a;
  border-radius: 2px;
  padding: 2px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Fallback grid layout if JavaScript calculations fail */
.itemsGrid:not([style*='grid-template-columns']) {
  display: grid;
  grid-template-columns: repeat(
    v-bind('sectionGrid.columns.value'),
    v-bind('sectionGrid.buttonSize.value + "px"')
  );
  gap: 2px;
  justify-content: start;
}

.itemEntry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.itemEntry:hover {
  background-color: #3a3a3a;
}

.gridItem {
  /* Sizing handled by composable's gridItemClasses */
  background: #4a4a4a;
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

.gridItem:hover {
  background: #5a5a5a;
  border-color: #7a7a7a;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.3),
    0 0 4px rgba(255, 165, 0, 0.3);
}

.itemLabel {
  color: #ffffff;
  font-size: 13px;
  flex: 1;
}

/* Unlock Technologies Styles */
.unlockTechnologies {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.technologyEntry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #1f1f1f;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.technologyEntry:hover {
  background: #2a2a2a;
}

.technologyIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.technologyIcon:hover {
  background: #4a4a4a;
  border-color: #6a6a6a;
  box-shadow: 0 0 8px rgba(255, 200, 100, 0.3);
}

.technologyLevel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  background: #2a2a2a;
  border: 1px solid #4a4a4a;
  border-radius: 2px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
}

.sciencePacks {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
</style>
