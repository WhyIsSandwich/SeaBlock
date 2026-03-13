<template>
  <!--dynamically make it a tooltip or not using showTooltip prop ie pass in compl-->
  <component
    :is="showTooltip ? Tooltip : 'div'"
    v-if="!isEmpty && type && name"
    :item-id="name"
    :category="type"
    :focusable-trigger="false"
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
      :title="showBrowserTooltip ? resolvedTitle : null"
      :aria-label="resolvedAriaLabel"
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
        :title="showBrowserTooltip ? resolvedTitle : null"
        :aria-label="resolvedAriaLabel"
        :role="clickable ? 'button' : null"
        :tabindex="clickable ? 0 : -1"
        @click="handleClick"
        @keydown.enter.prevent="handleClick"
        @keydown.space.prevent="handleClick"
      >
        <SpriteIcon
          v-if="!isEmpty && resolvedSpriteKey"
          :sprite-key="resolvedSpriteKey"
          :size="size"
          :title="showBrowserTooltip ? resolvedTitle : null"
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
  },
  showBrowserTooltip: {
    type: Boolean,
    default: false
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

const resolvedAriaLabel = computed(() => resolvedTitle.value || null)
const slotPadding = computed(() => {
  const numericSize = Number(props.size) || 32
  if (numericSize <= 20) return '1px'
  if (numericSize <= 28) return '2px'
  if (numericSize <= 40) return '3px'
  if (numericSize <= 56) return '4px'
  return '6px'
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
  background: linear-gradient(to bottom, #474747, #2d2d2d);
  border: 1px solid #5e5e5e;
  border-top-color: #787878;
  border-left-color: #747474;
  border-right-color: #3a3a3a;
  border-bottom-color: #303030;
  border-radius: 2px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.35);
  transition:
    background 0.15s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.1s ease;
  position: relative;
  flex-shrink: 0;
  padding: v-bind(slotPadding);
  box-sizing: border-box;
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  background: linear-gradient(to bottom, #575757, #373737);
  border-top-color: #8a8a8a;
  border-left-color: #858585;
  border-right-color: #4b4b4b;
  border-bottom-color: #3e3e3e;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 190, 95, 0.35),
    0 2px 4px rgba(0, 0, 0, 0.45);
}

.clickable:focus-visible {
  outline: 2px solid #ffd28a;
  outline-offset: 1px;
  background: linear-gradient(to bottom, #5a5a5a, #3a3a3a);
  border-top-color: #8f8f8f;
  border-left-color: #898989;
  border-right-color: #4f4f4f;
  border-bottom-color: #434343;
}

.selected {
  background: linear-gradient(to bottom, #5a4a30, #3d301f);
  border-top-color: #d4a55b;
  border-left-color: #ca9a52;
  border-right-color: #7d5a2f;
  border-bottom-color: #6a4a26;
  box-shadow:
    inset 0 1px 0 rgba(255, 232, 180, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 176, 74, 0.5),
    0 1px 2px rgba(0, 0, 0, 0.4);
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
  color: #ffd28a;
  font-weight: 500;
}
</style>
