<template>
  <!--dynamically make it a tooltip or not using showTooltip prop ie pass in compl-->
  <component
    :is="showTooltip ? Tooltip : 'div'"
    v-if="!isEmpty && type && name"
    :item-id="name"
    :category="type"
  >
    <!-- Use slot if provided, otherwise use default container -->
    <slot
      name="container"
      :class="[
        $style.iconButton,
        {
          [$style.selected]: isSelected,
          [$style.clickable]: clickable,
          [$style.emptyCell]: isEmpty
        }
      ]"
      :title="resolvedTitle"
      :click="handleClick"
      :sprite-key="resolvedSpriteKey"
      :label="label"
    >
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
        <span v-if="label" :class="$style.iconLabel">
          {{ label }}
        </span>
      </div>
    </slot>
  </component>
</template>

<script setup>
import { computed, inject } from 'vue'

import SpriteIcon from './SpriteIcon.vue'
import Tooltip from './Tooltip.vue'

// Inject event handlers from parent components
const onSelectItem = inject('onSelectItem', null)
const onItemSelected = inject('onItemSelected', null)

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
  },
  showTooltip: {
    type: Boolean,
    default: true
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
      //todo get name from locale data
      switch (props.type) {
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
    // Use injected handlers if available, otherwise emit for backward compatibility
    if (onSelectItem) {
      onSelectItem(props.type, props.name)
    } else {
      emit('click')
    }
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
  background: linear-gradient(to bottom, #3a3a3a, #2a2a2a);
  border: 1px solid #4a4a4a;
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
  border: 1px solid #2a2a2a;
  cursor: default;
  box-shadow: none;
}

.emptyCell:hover {
  background: transparent;
  border: 1px solid #2a2a2a;
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
