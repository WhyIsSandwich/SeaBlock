<template>
  <div
    :class="[
      $style.iconButton,
      {
        [$style.selected]: isSelected,
        [$style.clickable]: clickable,
        [$style.emptyCell]: isEmpty
      }
    ]"
    :title="resolvedTitle"
    @click="handleClick"
  >
    <SpriteIcon
      v-if="!isEmpty && resolvedSpriteKey"
      :sprite-key="resolvedSpriteKey"
      :size="size"
      :title="resolvedTitle"
    />
    <span v-if="label" :class="$style.iconLabel">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

import { useFactorioData } from '../../../src/index.js'

import SpriteIcon from './SpriteIcon.vue'

// Use the data composable
const { getItemData, getRecipeData, getTechnologyData, getFluidData, getBuildingData } =
  useFactorioData()

// Props
const props = defineProps({
  spriteKey: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  size: {
    type: [String, Number],
    default: 32
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: true
  },
  isEmpty: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['click'])

// Computed properties
const resolvedSpriteKey = computed(() => {
  // If spriteKey is provided directly, use it
  if (props.spriteKey) {
    return props.spriteKey
  }

  // Otherwise, resolve from type and name
  if (props.type && props.name) {
    return `${props.type}-${props.name}`
  }
  return ''
})

const resolvedTitle = computed(() => {
  // If title is provided directly, use it
  if (props.title) {
    return props.title
  }

  // Otherwise, resolve from type and name
  if (props.type && props.name) {
    try {
      switch (props.type) {
        case 'item':
          return getItemData(props.name)?.displayName || props.name
        case 'recipe':
          return getRecipeData(props.name)?.displayName || props.name
        case 'technology':
          return getTechnologyData(props.name)?.displayName || props.name
        case 'fluid':
          return getFluidData(props.name)?.displayName || props.name
        case 'building':
          return getBuildingData(props.name)?.displayName || props.name
        default:
          return props.name
      }
    } catch (error) {
      console.warn(`Failed to get title for ${props.type}:${props.name}:`, error.message)
      return props.name
    }
  }

  return ''
})

// Methods
function handleClick() {
  if (props.clickable && !props.isEmpty) {
    emit('click')
  }
}
</script>

<style module>
.iconButton {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: v-bind(size + 'px');
  height: v-bind(size + 'px');
  min-width: v-bind(size + 'px');
  min-height: v-bind(size + 'px');
  max-width: v-bind(size + 'px');
  max-height: v-bind(size + 'px');
  /* Factorio button styling */
  background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  position: relative;
  flex-shrink: 0;
  /* Padding calculation based on actual size prop to match grid */
  padding: v-bind('Math.max(2, Math.floor(size * 0.125)) + "px"');
  box-sizing: border-box;
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  background: #ffa207;
  border-color: #ffa207;
  box-shadow:
    0 0 8px rgba(255, 200, 100, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.4);
}

.selected {
  background: #ffa207;
  border-color: #ffa207;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.emptyCell {
  background: transparent;
  border: 1px solid #3a3a3a;
  cursor: default;
  box-shadow: none;
}

.emptyCell:hover {
  background: transparent;
  border: 1px solid #3a3a3a;
  transform: none;
  box-shadow: none;
}

.iconLabel {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-top: 4px;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected .iconLabel {
  color: #cc6600;
  font-weight: 500;
}
</style>
