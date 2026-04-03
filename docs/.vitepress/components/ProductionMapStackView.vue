<template>
  <div :class="$style.stackInner">
    <div :class="$style.stackSpine">
      <Tooltip
        v-for="id in spineIds"
        :key="`sp-${id}`"
        :item-id="nodes.get(id)?.name"
        :category="helpers.tooltipCategory(nodes.get(id))"
        :focusable-trigger="false"
        :enable-tooltip="helpers.productionMapTooltipEnabled(id, nodes.get(id))"
      >
        <div
          data-production-map-card
          :data-node-id="id"
          :class="helpers.narrowCardClassList(id, nodes.get(id))"
          @mousedown.stop
          @touchstart.stop
          @pointerdown.stop="e => $emit('pointer-down', e, id, nodes.get(id))"
          @pointermove.stop="$emit('pointer-move', $event)"
          @pointerup.stop="$emit('pointer-up')"
          @pointercancel.stop="$emit('pointer-cancel')"
          @click.stop="e => $emit('node-click', e, id, nodes.get(id))"
          @dblclick.stop.prevent="e => $emit('node-dblclick', e, nodes.get(id))"
        >
          <div :class="$style.cardRow">
            <span
              v-if="nodes.get(id)?.kind === 'material' && nodes.get(id)?.isRepeatPrototype"
              :class="$style.repeatBadge"
              :title="helpers.repeatBadgeTitle(nodes.get(id))"
              :aria-label="helpers.repeatBadgeTitle(nodes.get(id))"
            >↩</span>
            <SpriteIcon
              v-if="nodes.get(id)?.kind === 'material'"
              :sprite-key="`${nodes.get(id).type}-${nodes.get(id).name}`"
              :size="28"
              :title="helpers.cardTitle(nodes.get(id))"
            />
            <div v-else :class="$style.recipeGlyph" aria-hidden="true">⌗</div>
            <span
              :class="[
                $style.cardLabel,
                nodes.get(id)?.kind === 'recipe' ? $style.cardLabelRecipe : ''
              ]"
            >{{ helpers.cardTitle(nodes.get(id)) }}</span>
            <span
              v-if="helpers.showExpandChevron(id, nodes.get(id))"
              :class="$style.chevron"
              aria-hidden="true"
            >
              {{ helpers.isExpanded(id) ? '▼' : '▶' }}
            </span>
          </div>
          <div
            v-if="helpers.showRecipeTouchBlock(id, nodes.get(id))"
            :class="$style.recipeTouchBlock"
          >
            <template v-if="helpers.recipeTouchDetail(nodes.get(id)).ingredients.length">
              <div :class="$style.recipeTouchHeading">Ingredients</div>
              <div
                v-for="(row, ri) in helpers.recipeTouchDetail(nodes.get(id)).ingredients"
                :key="`ing-${ri}`"
                :class="$style.recipeTouchLine"
              >
                {{ row.amount }}× {{ row.label }}
              </div>
            </template>
            <template v-if="helpers.recipeTouchDetail(nodes.get(id)).products.length">
              <div :class="$style.recipeTouchHeading">Products</div>
              <div
                v-for="(row, pi) in helpers.recipeTouchDetail(nodes.get(id)).products"
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
    <div v-if="needsRootFlowPicker" :class="$style.rootFlowPicker">
      <p :class="$style.rootFlowPickerHint">{{ rootFlowPickerHint }}</p>
      <div :class="$style.rootFlowPickerBtns">
        <button
          v-if="focusType === 'recipe'"
          type="button"
          :class="[$style.rootFlowBtn, 'fpio-button-chrome']"
          @click="$emit('pick-root-flow', 'right')"
        >
          Ingredients
        </button>
        <button
          v-else
          type="button"
          :class="[$style.rootFlowBtn, 'fpio-button-chrome']"
          @click="$emit('pick-root-flow', 'right')"
        >
          Production
        </button>
        <button
          v-if="focusType === 'recipe'"
          type="button"
          :class="[$style.rootFlowBtn, 'fpio-button-chrome']"
          @click="$emit('pick-root-flow', 'left')"
        >
          Products
        </button>
        <button
          v-else
          type="button"
          :class="[$style.rootFlowBtn, 'fpio-button-chrome']"
          @click="$emit('pick-root-flow', 'left')"
        >
          Consumption
        </button>
      </div>
    </div>
    <template v-else-if="hasLeaves">
      <hr :class="$style.stackDivider" />
      <div v-if="peerIds.length" :class="$style.stackLeavesSection">
        <p :class="$style.stackLeavesHeading">Same column</p>
        <div :class="$style.stackLeaves">
          <Tooltip
            v-for="id in peerIds"
            :key="`p-${id}`"
            :item-id="nodes.get(id)?.name"
            :category="helpers.tooltipCategory(nodes.get(id))"
            :focusable-trigger="false"
            :enable-tooltip="helpers.productionMapTooltipEnabled(id, nodes.get(id))"
          >
            <div
              data-production-map-card
              :data-node-id="id"
              :class="helpers.narrowCardClassList(id, nodes.get(id))"
              @mousedown.stop
              @touchstart.stop
              @pointerdown.stop="e => $emit('pointer-down', e, id, nodes.get(id))"
              @pointermove.stop="$emit('pointer-move', $event)"
              @pointerup.stop="$emit('pointer-up')"
              @pointercancel.stop="$emit('pointer-cancel')"
              @click.stop="e => $emit('node-click', e, id, nodes.get(id))"
              @dblclick.stop.prevent="e => $emit('node-dblclick', e, nodes.get(id))"
            >
              <div :class="$style.stackLeafCard">
                <span :class="$style.flowBadge">{{ helpers.flowBadgeLabel(nodes.get(id)) }}</span>
                <div :class="$style.cardRow">
                  <span
                    v-if="
                      nodes.get(id)?.kind === 'material' && nodes.get(id)?.isRepeatPrototype
                    "
                    :class="$style.repeatBadge"
                    :title="helpers.repeatBadgeTitle(nodes.get(id))"
                    :aria-label="helpers.repeatBadgeTitle(nodes.get(id))"
                  >↩</span>
                  <SpriteIcon
                    v-if="nodes.get(id)?.kind === 'material'"
                    :sprite-key="`${nodes.get(id).type}-${nodes.get(id).name}`"
                    :size="28"
                    :title="helpers.cardTitle(nodes.get(id))"
                  />
                  <div v-else :class="$style.recipeGlyph" aria-hidden="true">⌗</div>
                  <span
                    :class="[
                      $style.cardLabel,
                      nodes.get(id)?.kind === 'recipe' ? $style.cardLabelRecipe : ''
                    ]"
                  >{{ helpers.cardTitle(nodes.get(id)) }}</span>
                  <span
                    v-if="helpers.showExpandChevron(id, nodes.get(id))"
                    :class="$style.chevron"
                    aria-hidden="true"
                  >
                    {{ helpers.isExpanded(id) ? '▼' : '▶' }}
                  </span>
                </div>
                <div
                  v-if="helpers.showRecipeTouchBlock(id, nodes.get(id))"
                  :class="$style.recipeTouchBlock"
                >
                  <template v-if="helpers.recipeTouchDetail(nodes.get(id)).ingredients.length">
                    <div :class="$style.recipeTouchHeading">Ingredients</div>
                    <div
                      v-for="(row, ri) in helpers.recipeTouchDetail(nodes.get(id)).ingredients"
                      :key="`ing-${ri}`"
                      :class="$style.recipeTouchLine"
                    >
                      {{ row.amount }}× {{ row.label }}
                    </div>
                  </template>
                  <template v-if="helpers.recipeTouchDetail(nodes.get(id)).products.length">
                    <div :class="$style.recipeTouchHeading">Products</div>
                    <div
                      v-for="(row, pi) in helpers.recipeTouchDetail(nodes.get(id)).products"
                      :key="`prod-${pi}`"
                      :class="$style.recipeTouchLine"
                    >
                      {{ row.amount }}× {{ row.label }}
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </Tooltip>
        </div>
      </div>
      <hr v-if="peerIds.length && childIds.length" :class="$style.stackDivider" />
      <div v-if="childIds.length" :class="$style.stackLeavesSection">
        <p :class="$style.stackLeavesHeading">Next steps</p>
        <div :class="$style.stackLeaves">
          <Tooltip
            v-for="id in childIds"
            :key="`c-${id}`"
            :item-id="nodes.get(id)?.name"
            :category="helpers.tooltipCategory(nodes.get(id))"
            :focusable-trigger="false"
            :enable-tooltip="helpers.productionMapTooltipEnabled(id, nodes.get(id))"
          >
            <div
              data-production-map-card
              :data-node-id="id"
              :class="helpers.narrowCardClassList(id, nodes.get(id))"
              @mousedown.stop
              @touchstart.stop
              @pointerdown.stop="e => $emit('pointer-down', e, id, nodes.get(id))"
              @pointermove.stop="$emit('pointer-move', $event)"
              @pointerup.stop="$emit('pointer-up')"
              @pointercancel.stop="$emit('pointer-cancel')"
              @click.stop="e => $emit('node-click', e, id, nodes.get(id))"
              @dblclick.stop.prevent="e => $emit('node-dblclick', e, nodes.get(id))"
            >
              <div :class="$style.stackLeafCard">
                <span :class="$style.flowBadge">{{ helpers.flowBadgeLabel(nodes.get(id)) }}</span>
                <div :class="$style.cardRow">
                  <span
                    v-if="
                      nodes.get(id)?.kind === 'material' &&
                      nodes.get(id)?.isRepeatPrototype
                    "
                    :class="$style.repeatBadge"
                    :title="helpers.repeatBadgeTitle(nodes.get(id))"
                    :aria-label="helpers.repeatBadgeTitle(nodes.get(id))"
                  >↩</span>
                  <SpriteIcon
                    v-if="nodes.get(id)?.kind === 'material'"
                    :sprite-key="`${nodes.get(id).type}-${nodes.get(id).name}`"
                    :size="28"
                    :title="helpers.cardTitle(nodes.get(id))"
                  />
                  <div v-else :class="$style.recipeGlyph" aria-hidden="true">⌗</div>
                  <span
                    :class="[
                      $style.cardLabel,
                      nodes.get(id)?.kind === 'recipe' ? $style.cardLabelRecipe : ''
                    ]"
                  >{{ helpers.cardTitle(nodes.get(id)) }}</span>
                  <span
                    v-if="helpers.showExpandChevron(id, nodes.get(id))"
                    :class="$style.chevron"
                    aria-hidden="true"
                  >
                    {{ helpers.isExpanded(id) ? '▼' : '▶' }}
                  </span>
                </div>
                <div
                  v-if="helpers.showRecipeTouchBlock(id, nodes.get(id))"
                  :class="$style.recipeTouchBlock"
                >
                  <template v-if="helpers.recipeTouchDetail(nodes.get(id)).ingredients.length">
                    <div :class="$style.recipeTouchHeading">Ingredients</div>
                    <div
                      v-for="(row, ri) in helpers.recipeTouchDetail(nodes.get(id)).ingredients"
                      :key="`ing-${ri}`"
                      :class="$style.recipeTouchLine"
                    >
                      {{ row.amount }}× {{ row.label }}
                    </div>
                  </template>
                  <template v-if="helpers.recipeTouchDetail(nodes.get(id)).products.length">
                    <div :class="$style.recipeTouchHeading">Products</div>
                    <div
                      v-for="(row, pi) in helpers.recipeTouchDetail(nodes.get(id)).products"
                      :key="`prod-${pi}`"
                      :class="$style.recipeTouchLine"
                    >
                      {{ row.amount }}× {{ row.label }}
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </Tooltip>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import SpriteIcon from './SpriteIcon.vue'
import Tooltip from './Tooltip.vue'

defineProps({
  nodes: {
    type: Object,
    required: true
  },
  spineIds: {
    type: Array,
    default: () => []
  },
  peerIds: {
    type: Array,
    default: () => []
  },
  childIds: {
    type: Array,
    default: () => []
  },
  hasLeaves: {
    type: Boolean,
    default: false
  },
  needsRootFlowPicker: {
    type: Boolean,
    default: false
  },
  rootFlowPickerHint: {
    type: String,
    default: ''
  },
  focusType: {
    type: String,
    default: ''
  },
  helpers: {
    type: Object,
    required: true
  }
})

defineEmits([
  'pick-root-flow',
  'pointer-down',
  'pointer-move',
  'pointer-up',
  'pointer-cancel',
  'node-click',
  'node-dblclick'
])
</script>

<style module>
@import './factoriopediaSharedPrimitives.css';

:deep(span.tooltip-trigger) {
  display: contents;
}

.stackInner {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: min-content;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.stackSpine,
.stackLeaves {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.stackLeavesSection {
  width: 100%;
  min-width: 0;
}

.stackLeavesHeading {
  margin: 0 0 6px;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
}

.stackDivider {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  margin: 4px 0;
}

.rootFlowPicker {
  padding: 8px 10px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.rootFlowPickerHint {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.35;
  color: #b8b8b8;
}

.rootFlowPickerBtns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rootFlowBtn {
  flex: 1;
  min-width: 120px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
}

.stackLeafCard {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.flowBadge {
  align-self: flex-end;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9a9a9a;
  padding: 2px 6px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.25);
}

.cardRow {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 6px;
  position: relative;
  min-width: 0;
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

.repeatBadge {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 11px;
  line-height: 1;
  color: #e8c060;
  pointer-events: none;
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
