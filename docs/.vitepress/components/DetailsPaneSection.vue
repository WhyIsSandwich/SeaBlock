<template>
  <template v-if="shouldRenderSection">
    <template v-if="section.type === ''" />
    <template v-else-if="section.type === 'technology_cost'">
      <div :class="$style.section">
        <h4 :class="$style.sectionTitle">
          {{ section.label }}
        </h4>
        <div
          v-if="sectionEntries.length > 0"
          :class="$style.technologyCostRow"
        >
          <IconButton
            v-for="item in sectionEntries"
            :key="`${item.type}-${item.name}`"
            :type="item.type"
            :name="item.name"
            :size="getIconSize()"
            :clickable="true"
            :show-tooltip="showTooltip"
            @click="handleItemClick(item)"
          />
          <span :class="$style.technologyCostStat"> 🕛{{ section.statistics[1].value }} </span>
          <span :class="$style.technologyCostStat"> x {{ section.statistics[0].value }} </span>
        </div>
      </div>
    </template>
    <template v-else-if="section.type === 'unlock_technologies'">
      <div :class="$style.section">
        <h4 :class="$style.sectionTitle">
          {{ section.label }}
        </h4>
        <div
          v-if="sectionEntries.length > 0"
          :class="$style.unlockList"
        >
          <div
            v-for="item in sectionEntries"
            :key="`${item.type}-${item.name}`"
            :class="$style.unlockRow"
          >
            <!-- Left side: game-style technology panel -->
            <IconButton
              :type="item.type"
              :name="item.name"
              :size="128"
              :clickable="true"
              :show-tooltip="showTooltip"
              @click="handleItemClick(item)"
            >
              <template #container="{ title, click, spriteKey }">
                <div
                  :class="$style.unlockPanel"
                  :title="title"
                  @click="click"
                >
                  <div :class="$style.unlockIconPanel">
                    <SpriteIcon
                      v-if="spriteKey"
                      :sprite-key="spriteKey"
                      :size="128"
                    />
                  </div>
                  <div :class="$style.unlockLevel">
                    <span
                      v-if="getTechnologyLevel(item.name)"
                      :class="$style.unlockLevelBadge"
                    >
                      {{ getTechnologyLevel(item.name) }}
                    </span>
                  </div>
                  <div :class="$style.unlockSciencePacks">
                    <SpriteIcon
                      v-for="pack in item.items"
                      :key="pack.name"
                      :sprite-key="`${pack.type || 'item'}-${pack.name}`"
                      :size="20"
                    />
                  </div>
                </div>
              </template>
            </IconButton>
            <div :class="$style.unlockName">
              {{ getItemLabel(item) || item.name }}
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else-if="section.type === 'crafting_time'">
      <div :class="$style.section">
        🕛{{ section.statistics[0]?.value }} s Crafting time
      </div>
    </template>
    <template v-else>
      <div :class="$style.section">
        <h4 :class="$style.sectionTitle">
          {{ section.label }}
        </h4>

        <!-- Statistics for this section -->
        <Statistics
          v-if="section.statistics?.length > 0"
          :statistics="section.statistics"
        />

        <!-- Items for this section -->
        {{ sectionEntries.length > 0 && section.itemsLabel ? section.itemsLabel + ':' : null }}
        <div
          v-if="sectionEntries.length > 0"
          ref="gridContainer"
          :class="getItemsContainerClass()"
          :style="getGridContainerStyle()"
        >
          <!-- Use composable's grid structure -->
          <div
            v-if="isGridLayout"
            :style="getGridSubgroupStyle()"
          >
            <IconButton
              v-for="item in sectionEntries"
              :key="`${item.type}-${item.name}`"
              :style="getGridItemStyle()"
              :size="getGridButtonSize()"
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
              v-for="item in sectionEntries"
              :key="`${item.type}-${item.name}`"
              :class="getItemEntryClass()"
            >
              <IconButton
                :type="item.type"
                :name="item.name"
                :size="getListIconSize()"
                :clickable="true"
                :show-tooltip="showTooltip"
                @click="handleItemClick(item)"
              />
              <span
                v-if="shouldShowLabel()"
                :class="$style.itemLabel"
              >
                {{ getDisplayLabel(item) }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </template>
  </template>
</template>

<script>
import { ref, computed } from 'vue'

import { useLocalizedData } from '../composables/useLocalizedData'
import { useFactorioGrid } from '../../../src/composables/useFactorioGrid.js'

import IconButton from './IconButton.vue'
import Statistics from './Statistics.vue'
import SpriteIcon from './SpriteIcon.vue'

export default {
  name: 'DetailsPaneSection',
  components: {
    IconButton,
    Statistics,
    SpriteIcon
  },
  props: {
    section: {
      type: Object,
      required: true,
      validator: value => {
        return value
      }
    },
    showTooltip: {
      type: Boolean,
      default: true
    },
    visualContext: {
      type: String,
      default: 'details'
    }
  },
  emits: ['select-item', 'item-selected'],
  setup() {
    const { localizedData, loadLocalizedData } = useLocalizedData()

    // Grid container width tracking
    const gridContainerWidth = ref(0)
    const gridContainer = ref(null)

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
    sectionEntries() {
      if (Array.isArray(this.section?.items)) {
        return this.section.items
      }
      if (Array.isArray(this.section?.children)) {
        return this.section.children
      }
      return []
    },
    hasStatistics() {
      return Array.isArray(this.section?.statistics) && this.section.statistics.length > 0
    },
    hasSectionChildren() {
      return this.sectionEntries.length > 0
    },
    shouldRenderSection() {
      if (!this.section || this.section.type === '') {
        return false
      }

      if (this.section.type === 'crafting_time') {
        return this.hasStatistics
      }

      if (this.section.type === 'technology_cost' || this.section.type === 'unlock_technologies') {
        return this.hasSectionChildren
      }

      return this.hasStatistics || this.hasSectionChildren
    },
    isGridLayout() {
      if (this.visualContext === 'tooltip' && this.section.itemsType === 'grid') {
        const hasTextualLabels = Array.isArray(this.sectionEntries)
          ? this.sectionEntries.some(
              item => typeof item?.label === 'string' && item.label.trim().length > 0
            )
          : false

        if (hasTextualLabels) {
          return false
        }
      }
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
    isUnlockSectionType(sectionType) {
      return sectionType === 'unlock_technologies' || sectionType === 'unlocked_by'
    },
    getItemLabel(item) {
      const localisedName = this.localizedData?.[item.type]?.[item.name]?.n
      if (!item.label) {
        return localisedName
      }
      const placeholderValue = localisedName || item.name
      const typePlaceholder = item.type ? new RegExp(`{{${item.type}_name}}`, 'g') : null
      const withTypeLabel = typePlaceholder
        ? item.label.replace(typePlaceholder, placeholderValue)
        : item.label
      return withTypeLabel
        .replace(/{{item_name}}/g, placeholderValue)
        .replace(/{{fluid_name}}/g, placeholderValue)
    },
    getDisplayLabel(item) {
      const label = this.getItemLabel(item)
      if (label) {
        return label
      }
      if (item?.name) {
        return item.name
      }
      return item?.type || 'unknown'
    },
    handleItemClick(_item) {
      // No need to emit - IconButton handles this directly via provide/inject
    },
    getItemsContainerClass() {
      if (this.isGridLayout) {
        return [
          this.$style.itemsGrid,
          this.visualContext === 'tooltip' ? this.$style.tooltipItemsGrid : null
        ]
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
      return this.isGridLayout ? this.getGridButtonSize() : this.getListIconSize()
    },
    getGridButtonSize() {
      if (this.visualContext === 'tooltip') {
        return 32
      }
      return this.sectionGrid.buttonSize
    },
    getGridContainerStyle() {
      if (!this.isGridLayout) {
        return {}
      }
      if (this.visualContext === 'tooltip') {
        return {}
      }
      return this.sectionGrid.containerStyles
    },
    getGridSubgroupStyle() {
      if (this.visualContext === 'tooltip') {
        const maxColumns = 10
        const itemCount = this.sectionEntries.length || 1
        const columns = Math.min(itemCount, maxColumns)
        return {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 32px)`,
          gap: '2px',
          justifyContent: 'start'
        }
      }
      return this.sectionGrid.subgroupStyles
    },
    getGridItemStyle() {
      if (this.visualContext === 'tooltip') {
        return {}
      }
      return this.sectionGrid.itemStyles
    },
    getListIconSize() {
      if (this.visualContext === 'tooltip') {
        return 32
      }
      return 36
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
    }
  }
}
</script>

<style module>
.section {
  margin-bottom: 12px;
  padding: 8px;
  background: #1f1f1f;
  border-radius: 2px;
  border: 1px solid #3f3f3f;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 1px 0 rgba(0, 0, 0, 0.45);
}

.sectionTitle {
  margin: 0 0 6px 0;
  color: #f2c15a;
  font-size: 14px;
  font-weight: 700;
  text-transform: capitalize;
  border-bottom: 1px solid #494949;
  padding-bottom: 3px;
}

.unlockSectionTitle {
  text-transform: none;
}

.technologyCostRow {
  display: flex;
  align-items: center;
  gap: 4px;
}

.technologyCostStat {
  display: inline-flex;
  align-items: center;
  text-align: center;
  color: #d9d9d9;
  font-size: 13px;
  line-height: 1;
}

.itemsList {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.itemsGrid {
  display: grid;
  /* Grid properties are handled by composable inline styles */
  max-height: 200px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #1f1f1f;
  border: 1px solid #3d3d3d;
  border-radius: 2px;
  padding: 1px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Fallback grid layout if JavaScript calculations fail */
.itemsGrid:not(.tooltipItemsGrid):not([style*='grid-template-columns']) {
  display: grid;
  grid-template-columns: repeat(
    v-bind('sectionGrid.columns.value'),
    v-bind('sectionGrid.buttonSize.value + "px"')
  );
  gap: 2px;
  justify-content: start;
}

.tooltipItemsGrid {
  display: block;
  width: max-content;
  max-width: calc((32px * 10) + (2px * 9) + 8px);
}

.itemEntry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 2px;
  cursor: pointer;
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

/* Shared Unlock/Unlocked Styles */
.unlockList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.unlockRow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
}

.unlockPanel {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  width: 128px !important;
  min-width: 128px !important;
  max-width: 128px !important;
  height: 180px !important;
  min-height: 180px !important;
  max-height: 180px !important;
  border: 1px solid #1a6f3f;
  background: #00c659;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.unlockPanel:hover {
  filter: brightness(1.05);
}
.unlockIconPanel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 128px;
  min-width: 128px;
  background: #00c659;
  border-bottom: 1px solid #0d8c4a;
}

.unlockLevel {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 16px;
  height: 16px;
  width: 128px;
  background: #00b857;
  border-bottom: 1px solid #0d8c4a;
}

.unlockLevelBadge {
  margin-left: 0;
  width: 33%;
  height: 14px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #9ff3b8;
  color: #083b1f;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  border: 1px solid #56c97a;
  border-radius: 1px;
}

.unlockSciencePacks {
  display: flex;
  gap: 1px;
  justify-content: flex-start;
  align-items: center;
  flex: 1;
  min-height: 26px;
  width: 128px;
  background: #026f27;
  padding: 1px 2px;
  overflow: hidden;
}

.sciencePackIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sciencePackIcon:hover {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.unlockName {
  color: #e4e4e4;
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  padding-left: 2px;
}
</style>
