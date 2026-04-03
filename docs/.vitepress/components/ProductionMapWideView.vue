<template>
  <div
    ref="zoomLayerRef"
    :class="$style.zoomLayer"
    :style="zoomLayerSizeStyle"
  >
    <svg
      :class="$style.edgeSvg"
      :width="svgSize.w"
      :height="svgSize.h"
      aria-hidden="true"
    >
      <path
        v-for="seg in edgePaths"
        :key="seg.key"
        :d="seg.d"
        :class="$style.edgePath"
        :style="edgePathStyle(seg)"
      />
    </svg>
    <Tooltip
      v-for="[id, node] in nodeEntries"
      :key="id"
      :item-id="node.name"
      :category="helpers.tooltipCategory(node)"
      :focusable-trigger="false"
      :enable-tooltip="helpers.productionMapTooltipEnabled(id, node)"
    >
      <div
        data-production-map-card
        :data-node-id="id"
        :class="[
          $style.card,
          node.kind === 'material' && node.type === 'item' ? $style.cardItem : '',
          node.kind === 'material' && node.type === 'fluid' ? $style.cardFluid : '',
          node.kind === 'recipe' ? $style.cardRecipe : '',
          helpers.isExpanded(id) ? $style.cardExpanded : '',
          node.isFocus ? $style.cardFocus : '',
          spineIdsForUi.has(id) ? $style.cardSpine : ''
        ]"
        :style="cardStyle(id)"
        @mousedown.stop
        @touchstart.stop
        @pointerdown.stop="e => $emit('pointer-down', e, id, node)"
        @pointermove.stop="$emit('pointer-move', $event)"
        @pointerup.stop="$emit('pointer-up')"
        @pointercancel.stop="$emit('pointer-cancel')"
        @click.stop="e => $emit('node-click', e, id, node)"
        @dblclick.stop.prevent="e => $emit('node-dblclick', e, node)"
      >
        <div :class="$style.cardRow">
          <span
            v-if="node.kind === 'material' && node.isRepeatPrototype"
            :class="$style.repeatBadge"
            :title="helpers.repeatBadgeTitle(node)"
            :aria-label="helpers.repeatBadgeTitle(node)"
          >↩</span>
          <SpriteIcon
            v-if="node.kind === 'material'"
            :sprite-key="`${node.type}-${node.name}`"
            :size="28"
            :title="helpers.cardTitle(node)"
          />
          <div v-else :class="$style.recipeGlyph" aria-hidden="true">⌗</div>
          <span
            :class="[
              $style.cardLabel,
              node.kind === 'recipe' ? $style.cardLabelRecipe : ''
            ]"
          >{{ helpers.cardTitle(node) }}</span>
          <span
            v-if="helpers.showExpandChevron(id, node)"
            :class="$style.chevron"
            aria-hidden="true"
          >
            {{ helpers.isExpanded(id) ? '▼' : '▶' }}
          </span>
        </div>
        <div
          v-if="helpers.showRecipeTouchBlock(id, node)"
          :class="$style.recipeTouchBlock"
        >
          <template v-if="helpers.recipeTouchDetail(node).ingredients.length">
            <div :class="$style.recipeTouchHeading">Ingredients</div>
            <div
              v-for="(row, ri) in helpers.recipeTouchDetail(node).ingredients"
              :key="`ing-${ri}`"
              :class="$style.recipeTouchLine"
            >
              {{ row.amount }}× {{ row.label }}
            </div>
          </template>
          <template v-if="helpers.recipeTouchDetail(node).products.length">
            <div :class="$style.recipeTouchHeading">Products</div>
            <div
              v-for="(row, pi) in helpers.recipeTouchDetail(node).products"
              :key="`prod-${pi}`"
              :class="$style.recipeTouchLine"
            >
              {{ row.amount }}× {{ row.label }}
            </div>
          </template>
        </div>
      </div>
    </Tooltip>
  </div>
</template>

<script setup>
import { inject, onMounted, ref } from 'vue'

import { useD3GraphZoom } from '../../../src/composables/useD3GraphZoom.js'

import SpriteIcon from './SpriteIcon.vue'
import Tooltip from './Tooltip.vue'

const props = defineProps({
  nodeEntries: {
    type: Array,
    default: () => []
  },
  edgePaths: {
    type: Array,
    default: () => []
  },
  svgSize: {
    type: Object,
    default: () => ({ w: 400, h: 300 })
  },
  zoomLayerSizeStyle: {
    type: Object,
    default: () => ({})
  },
  cardStyle: {
    type: Function,
    required: true
  },
  edgePathStyle: {
    type: Function,
    required: true
  },
  spineIdsForUi: {
    type: Object,
    default: () => new Set()
  },
  helpers: {
    type: Object,
    required: true
  }
})

defineEmits([
  'pointer-down',
  'pointer-move',
  'pointer-up',
  'pointer-cancel',
  'node-click',
  'node-dblclick'
])

const viewportRef = inject('pmViewportRef')
const zoomLayerRef = ref(null)

const {
  bind,
  reset,
  teardown,
  getTransform,
  animateTransformTo
} = useD3GraphZoom(viewportRef, zoomLayerRef, {
  zoomFilter: e => {
    const t = e?.target
    if (t && typeof t.closest === 'function' && t.closest('[data-production-map-card]')) {
      return false
    }
    return true
  }
})

onMounted(() => {
  bind()
})

defineExpose({
  resetZoom: reset,
  getTransform,
  animateTransformTo,
  bind,
  teardown
})

</script>

<style module>
@import './factoriopediaSharedPrimitives.css';

:deep(span.tooltip-trigger) {
  display: contents;
}

.zoomLayer {
  transform-origin: 0 0;
}

.edgeSvg {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}

.edgePath {
  fill: none;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 4px 6px;
  box-sizing: border-box;
  background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
  border: 1px solid #555;
  border-radius: 3px;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  position: absolute;
  z-index: 1;
  transition:
    top 0.22s cubic-bezier(0.34, 1.3, 0.64, 1),
    left 0.22s cubic-bezier(0.34, 1.3, 0.64, 1),
    opacity 0.18s ease-out;
}

.cardRow {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 6px;
  position: relative;
  min-width: 0;
}

.card:hover {
  border-color: #777;
}

.cardItem {
  border-left: 3px solid #6ab0e8;
  border-radius: 2px 4px 4px 2px;
}

.cardFluid {
  border-left: 3px solid #5ec8d6;
  border-radius: 10px 4px 4px 10px;
}

.cardRecipe {
  border-left: 3px solid #c9a45c;
  border-radius: 2px 6px 6px 2px;
}

.cardFocus {
  outline: 1px solid #8fd18f;
  outline-offset: 1px;
}

.cardExpanded {
  background: linear-gradient(to bottom, #505050, #404040);
}

.cardSpine {
  box-shadow: 0 0 0 1px rgba(143, 209, 143, 0.45);
}

.repeatBadge {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 11px;
  line-height: 1;
  color: #e8c060;
  pointer-events: none;
}

.recipeGlyph {
  width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #d4c090;
  flex-shrink: 0;
  margin-top: 1px;
}

.cardLabel {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  line-height: 1.25;
  color: #eaeaea;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  align-self: center;
}

.cardLabelRecipe {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  align-self: flex-start;
  padding-top: 2px;
}

.chevron {
  font-size: 9px;
  color: #aaa;
  flex-shrink: 0;
}

.recipeTouchBlock {
  font-size: 10px;
  line-height: 1.25;
  color: #c8c8c8;
  padding: 2px 0 2px 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 2px;
}

.recipeTouchHeading {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9a9a9a;
  margin-top: 4px;
}

.recipeTouchHeading:first-child {
  margin-top: 0;
}

.recipeTouchLine {
  padding-left: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
