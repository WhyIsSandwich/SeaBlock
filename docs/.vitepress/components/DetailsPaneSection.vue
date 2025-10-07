<template>
  <template v-if="section.type === ''" />
  <template v-else>
    <div :class="$style.section">
      <h4 :class="$style.sectionTitle">{{ section.type }}</h4>

      <!-- Statistics for this section -->
      <Statistics v-if="section.statistics?.length > 0" :statistics="section.statistics" />

      <!-- Items for this section -->
      <div v-if="section.items?.length > 0" :class="$style.itemsList">
        <div
          v-for="item in section.items"
          :key="`${item.type}-${item.name}`"
          :class="$style.itemEntry"
        >
          <IconButton
            :type="item.type"
            :name="item.name"
            :size="24"
            :clickable="true"
            @click="handleItemClick(item)"
          />
          <span :class="$style.itemLabel">{{ item.label || item.name }}</span>
        </div>
      </div>
    </div>
  </template>
</template>

<script>
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
  methods: {
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

.itemLabel {
  color: #ffffff;
  font-size: 13px;
  flex: 1;
}
</style>
