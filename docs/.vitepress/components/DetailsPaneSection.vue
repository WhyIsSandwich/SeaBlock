<template>
  <template v-if="section.type === ''" />
  <template v-else-if="section.type === 'technology_cost'">
    <div :class="$style.section">
      <h4 :class="$style.sectionTitle">{{ section.label }}</h4>
      <div v-if="section.items?.length > 0" style="display: flex; align-items: center; gap: 4px">
        <IconButton
          v-for="item in section.items"
          :key="`${item.type}-${item.name}`"
          :type="item.type"
          :name="item.name"
          :size="getIconSize()"
          :clickable="true"
          @click="handleItemClick(item)"
          :show-tooltip="showTooltip"
        />
        <span
          style="text-align: center; display: flex; vertical-align: middle; align-items: center"
        >
          🕛{{ section.statistics[1].value }}
        </span>
        <span
          style="text-align: center; display: flex; vertical-align: middle; align-items: center"
        >
          x {{ section.statistics[0].value }}
        </span>
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
          <!-- Left side: Green technology panel -->
          <IconButton
            :type="item.type"
            :name="item.name"
            :size="128"
            :clickable="true"
            :show-tooltip="showTooltip"
            @click="handleItemClick(item)"
          >
            <template #container="{ title, click, spriteKey, class: containerClass }">
              <div :class="[containerClass, $style.technologyPanel]" :title="title" @click="click">
                <!-- Technology Icon (large, centered) -->
                <div :class="$style.technologyIconContainer">
                  <SpriteIcon v-if="spriteKey" :sprite-key="spriteKey" :size="128" />
                </div>

                <!-- Technology Level (if prototype name ends with a number) -->
                <div :class="$style.technologyLevel">
                  {{ getTechnologyLevel(item.name) }}
                </div>
                <!-- Science Pack Icons (bottom of green panel) -->
                <div :class="$style.sciencePacksContainer">
                  <IconButton
                    v-for="pack in item.items"
                    :key="pack.name"
                    :is="'div'"
                    :size="16"
                    :show-tooltip="false"
                    :clickable="false"
                    :name="pack.name"
                    :type="pack.type || 'item'"
                  />
                </div>
              </div>
            </template>
          </IconButton>

          <!-- Right side: Technology name -->
          <div :class="$style.technologyName">
            {{ getItemLabel(item) || item.name }}
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
              :size="getListIconSize()"
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
      const placeholderValue = localisedName || item.name
      const typePlaceholder = item.type ? new RegExp(`{{${item.type}_name}}`, 'g') : null
      const withTypeLabel = typePlaceholder
        ? item.label.replace(typePlaceholder, placeholderValue)
        : item.label
      return withTypeLabel
        .replace(/{{item_name}}/g, placeholderValue)
        .replace(/{{fluid_name}}/g, placeholderValue)
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
      return this.isGridLayout ? this.sectionGrid.buttonSize : this.getListIconSize()
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
    }
  }
}
</script>

<style module>
.section {
  margin-bottom: 16px;
  padding: 10px;
  background: #1f1f1f;
  border-radius: 2px;
  border: 1px solid #3f3f3f;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 1px 0 rgba(0, 0, 0, 0.45);
}

.sectionTitle {
  margin: 0 0 8px 0;
  color: #f2c15a;
  font-size: 14px;
  font-weight: 700;
  text-transform: capitalize;
  border-bottom: 1px solid #494949;
  padding-bottom: 4px;
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
  border: 1px solid #3d3d3d;
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
  border: 1px solid #3f3f3f;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.technologyEntry:hover {
  background: #2a2a2a;
}

.technologyPanel {
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  width: 128px;
  height: 180px;
  border: 2px solid #333;
  background: linear-gradient(135deg, #00c659 0%, #00a84d 50%, #008f41 100%);
  border-radius: 6px;
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.technologyPanel:hover {
  filter: brightness(1.2);
}
.technologyIconContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 128px;
  min-width: 128px;
  background: #00c659;
  border-bottom: 1px solid #333;
}

.technologyLevel {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 16px;
  height: 16px;
  width: 128px;
  background: #24d07f;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid #333;
}

.sciencePacksContainer {
  display: flex;
  gap: 1px;
  justify-content: flex-start;
  align-items: flex-start;
  height: 26px;
  width: 128px;
  background: #01711f;
  padding: 4px;
  flex-wrap: wrap;
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

.technologyName {
  color: #d9d9d9;
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  padding-left: 8px;
}
</style>
