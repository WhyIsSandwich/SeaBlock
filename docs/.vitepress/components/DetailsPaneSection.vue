<template>
  <template v-if="section.type === ''" />
  <template v-else>
    <div :class="$style.section">
      <h4 :class="$style.sectionTitle">{{ section.label }}</h4>

      <!-- Statistics for this section -->
      <Statistics v-if="section.statistics?.length > 0" :statistics="section.statistics" />

      <!-- Items for this section -->
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
          />
          <span v-if="shouldShowLabel()" :class="$style.itemLabel">{{
            getItemLabel(item) || item.name
          }}</span>
        </div>
      </div>
    </div>
  </template>
</template>

<script>
import { useLocalizedData } from '../composables/useLocalizedData'

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
    }
  },
  emits: ['select-item', 'item-selected'],
  setup() {
    const { localizedData, loadLocalizedData } = useLocalizedData()

    return {
      localizedData,
      loadLocalizedData
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
  async mounted() {
    await this.loadLocalizedData()
  },
  methods: {
    getItemLabel(item) {
      const localisedName = this.localizedData?.[item.type]?.[item.name]?.n
      if (!item.label) {
        return localisedName
      }
      return item.label?.replace(/{{item_name}}/g, localisedName)
    },
    handleItemClick(item) {
      // Emit both events for compatibility
      this.$emit('select-item', {
        type: item.type,
        name: item.name
      })
      this.$emit('item-selected', {
        type: item.type,
        name: item.name
      })
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
      return this.isGridLayout ? 32 : 24
    },
    shouldShowLabel() {
      // In grid layout, only show labels if explicitly requested
      if (this.isGridLayout) {
        return this.section.showLabels || false
      }
      // In list layout, always show labels
      return true
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
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
  background: #1f1f1f;
  border: 1px solid #4a4a4a;
  border-radius: 2px;
  padding: 2px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
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
  width: 40px;
  height: 40px;
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
</style>
