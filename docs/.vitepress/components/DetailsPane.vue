<template>
  <div :class="$style.detailsPane">
    <div v-if="selectedItem" :class="$style.itemDetails">
      <!-- Item Header with Controls and Tabs -->
      <div :class="$style.itemHeader">
        <div :class="$style.headerTitle">
          <IconButton
            :type="getPrimaryType(selectedItem)"
            :name="selectedItem.name"
            :size="36"
            :clickable="false"
          />
          <h3>{{ selectedItem.displayName }} ({{ itemTypeLabel }})</h3>
        </div>
        <div :class="$style.headerControls">
          <div :class="$style.headerTabs">
            <button
              :class="{ [$style.active]: activeTab === 'details' }"
              @click="activeTab = 'details'"
            >
              Details
            </button>
            <button :class="{ [$style.active]: activeTab === 'raws' }" @click="activeTab = 'raws'">
              Raws
            </button>
          </div>
          <div :class="$style.navigationControls">
            <button
              :class="[$style.navButton, { [$style.disabled]: !canGoBack }]"
              :disabled="!canGoBack"
              title="Go back"
              @click="$emit('navigate-back')"
            >
              ←
            </button>
            <button
              :class="[$style.navButton, { [$style.disabled]: !canGoForward }]"
              :disabled="!canGoForward"
              title="Go forward"
              @click="$emit('navigate-forward')"
            >
              →
            </button>
            <div :class="$style.historyContainer">
              <button
                :class="$style.historyButton"
                title="Recently viewed items"
                @click="$emit('toggle-history')"
              >
                History
              </button>
              <div v-if="showHistoryDropdown" :class="$style.historyDropdown">
                <div v-if="historyItems.length === 0" :class="$style.historyEmpty">
                  No recent items
                </div>
                <div
                  v-for="item in historyItems"
                  :key="`${item.type}-${item.name}`"
                  :class="$style.historyItem"
                  @click="$emit('select-from-history', item)"
                >
                  <SpriteIcon
                    v-if="
                      item.type === 'item' ||
                      item.type === 'recipe' ||
                      item.type === 'technology' ||
                      item.type === 'fluid' ||
                      item.type === 'tile'
                    "
                    :sprite-key="`${item.type}-${item.name}`"
                    :title="item.displayName"
                  />
                  <span :class="$style.historyItemName">{{ item.displayName }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Large Item Image (for entities and items) -->
      <div v-if="selectedItem.entity" :class="$style.itemImageContainer">
        <FactorioSprite
          v-if="selectedItem.entity"
          :key="type + name"
          :sprite-data="selectedItem.entity"
          :size="128"
          :play-animation="!isAnimationPaused"
          :is-paused="isAnimationPaused"
          @toggle-pause="emit('toggle-animation-pause')"
        />
      </div>
      <!-- Details Tab Content -->
      <div v-if="activeTab === 'details'">
        <p>{{ selectedItem.description }}</p>
        <!-- Statistics -->
        <Statistics
          v-if="detailsData.statistics?.length > 0"
          :statistics="detailsData.statistics"
        />

        <template v-for="section in detailsData.sections" :key="section.type">
          <DetailsPaneSection
            :section="section"
            @select-item="handleItemSelection"
            @item-selected="handleItemSelection"
          />
        </template>
      </div>
      <!-- Raws Tab Content -->
      <div v-if="activeTab === 'raws'" :class="$style.rawsContent">
        <!-- Recipe Raw Data -->
        <div v-if="selectedItem?.recipe" :class="$style.rawSection">
          <button :class="$style.rawSectionHeader" @click="toggleRawSection('recipe')">
            <span :class="$style.rawSectionTitle">Recipe Data</span>
            <span :class="$style.rawSectionToggle">{{ rawSectionsOpen.recipe ? '▼' : '▶' }}</span>
          </button>
          <div v-if="rawSectionsOpen.recipe" :class="$style.rawSectionContent">
            <pre :class="$style.rawsData">{{ JSON.stringify(selectedItem.recipe, null, 2) }}</pre>
          </div>
        </div>

        <!-- Item Raw Data -->
        <div v-if="selectedItem?.item" :class="$style.rawSection">
          <button :class="$style.rawSectionHeader" @click="toggleRawSection('item')">
            <span :class="$style.rawSectionTitle">Item Data</span>
            <span :class="$style.rawSectionToggle">{{ rawSectionsOpen.item ? '▼' : '▶' }}</span>
          </button>
          <div v-if="rawSectionsOpen.item" :class="$style.rawSectionContent">
            <pre :class="$style.rawsData">{{ JSON.stringify(selectedItem.item, null, 2) }}</pre>
          </div>
        </div>

        <!-- Fluid Raw Data -->
        <div v-if="selectedItem?.fluid" :class="$style.rawSection">
          <button :class="$style.rawSectionHeader" @click="toggleRawSection('fluid')">
            <span :class="$style.rawSectionTitle">Fluid Data</span>
            <span :class="$style.rawSectionToggle">{{ rawSectionsOpen.fluid ? '▼' : '▶' }}</span>
          </button>
          <div v-if="rawSectionsOpen.fluid" :class="$style.rawSectionContent">
            <pre :class="$style.rawsData">{{ JSON.stringify(selectedItem.fluid, null, 2) }}</pre>
          </div>
        </div>

        <!-- Tile Raw Data -->
        <div v-if="selectedItem?.tile" :class="$style.rawSection">
          <button :class="$style.rawSectionHeader" @click="toggleRawSection('tile')">
            <span :class="$style.rawSectionTitle">Tile Data</span>
            <span :class="$style.rawSectionToggle">{{ rawSectionsOpen.tile ? '▼' : '▶' }}</span>
          </button>
          <div v-if="rawSectionsOpen.tile" :class="$style.rawSectionContent">
            <pre :class="$style.rawsData">{{ JSON.stringify(selectedItem.tile, null, 2) }}</pre>
          </div>
        </div>

        <!-- Technology Raw Data -->
        <div v-if="selectedItem?.technology" :class="$style.rawSection">
          <button :class="$style.rawSectionHeader" @click="toggleRawSection('technology')">
            <span :class="$style.rawSectionTitle">Technology Data</span>
            <span :class="$style.rawSectionToggle">{{
              rawSectionsOpen.technology ? '▼' : '▶'
            }}</span>
          </button>
          <div v-if="rawSectionsOpen.technology" :class="$style.rawSectionContent">
            <pre :class="$style.rawsData">{{
              JSON.stringify(selectedItem.technology, null, 2)
            }}</pre>
          </div>
        </div>

        <!-- Entity Raw Data -->
        <div v-if="selectedItem?.entity" :class="$style.rawSection">
          <button :class="$style.rawSectionHeader" @click="toggleRawSection('entity')">
            <span :class="$style.rawSectionTitle">Entity Data</span>
            <span :class="$style.rawSectionToggle">{{ rawSectionsOpen.entity ? '▼' : '▶' }}</span>
          </button>
          <div v-if="rawSectionsOpen.entity" :class="$style.rawSectionContent">
            <pre :class="$style.rawsData">{{ JSON.stringify(selectedItem.entity, null, 2) }}</pre>
          </div>
        </div>

        <!-- Equipment Raw Data -->
        <div v-if="selectedItem?.equipment" :class="$style.rawSection">
          <button :class="$style.rawSectionHeader" @click="toggleRawSection('equipment')">
            <span :class="$style.rawSectionTitle">Equipment Data</span>
            <span :class="$style.rawSectionToggle">{{
              rawSectionsOpen.equipment ? '▼' : '▶'
            }}</span>
          </button>
          <div v-if="rawSectionsOpen.equipment" :class="$style.rawSectionContent">
            <pre :class="$style.rawsData">{{
              JSON.stringify(selectedItem.equipment, null, 2)
            }}</pre>
          </div>
        </div>

        <!-- Unified Raw Data -->
        <div :class="$style.rawSection">
          <button :class="$style.rawSectionHeader" @click="toggleRawSection('unified')">
            <span :class="$style.rawSectionTitle">Unified Raw Data</span>
            <span :class="$style.rawSectionToggle">{{ rawSectionsOpen.unified ? '▼' : '▶' }}</span>
          </button>
          <div v-if="rawSectionsOpen.unified" :class="$style.rawSectionContent">
            <pre :class="$style.rawsData">{{ JSON.stringify(unifiedRawData, null, 2) }}</pre>
          </div>
        </div>
      </div>

      <!-- No Selection State -->
      <div v-if="!selectedItem" :class="$style.noSelection">
        <div :class="$style.noSelectionContent">
          <h3>Select an item to view details</h3>
          <p>
            Click on any item in the left panel to see its details, ingredients, and crafting
            requirements.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

import { useFactorioData } from '../../../src/index.js'

import SpriteIcon from './SpriteIcon.vue'
import IconButton from './IconButton.vue'
import FactorioSprite from './FactorioSprite.vue'
import Statistics from './Statistics.vue'
import DetailsPaneSection from './DetailsPaneSection.vue'

import { useDetailsData } from '../../../src/composables/useDetailsData.js'
// Use the data composable
const { organizedData, createUnifiedSelectionObject } = useFactorioData()
const { getDetailsData } = useDetailsData()
// Tab state
const activeTab = ref('details')

// Raw sections state
const rawSectionsOpen = ref({
  recipe: false,
  item: false,
  fluid: false,
  tile: false,
  technology: false,
  entity: false,
  equipment: false,
  sprite: false,
  unified: false
})

// Toggle raw section
function toggleRawSection(section) {
  rawSectionsOpen.value[section] = !rawSectionsOpen.value[section]
}

// Computed property for unified raw data (excluding already shown sections)
const unifiedRawData = computed(() => {
  if (!selectedItem.value) return null

  const {
    recipe: _recipe,
    item: _item,
    fluid: _fluid,
    tile: _tile,
    technology: _technology,
    entity: _entity,
    sprite: _sprite,
    ...unifiedProps
  } = selectedItem.value

  return unifiedProps
})

// Helper function to get primary type
function getPrimaryType(item) {
  if (!item || !item.types) return 'item'
  return item.types[0] || 'item'
}

// Props
const props = defineProps({
  name: {
    type: String,
    default: null
  },
  type: {
    type: String,
    default: null
  },
  isAnimationPaused: {
    type: Boolean,
    default: false
  },
  canGoBack: {
    type: Boolean,
    default: false
  },
  canGoForward: {
    type: Boolean,
    default: false
  },
  showHistoryDropdown: {
    type: Boolean,
    default: false
  },
  historyItems: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits([
  'select-item',
  'toggle-animation-pause',
  'item-selected',
  'navigate-back',
  'navigate-forward',
  'toggle-history',
  'select-from-history'
])

// Computed property to create selectedItem from name and type
const selectedItem = computed(() => {
  if (!props.name || !props.type) {
    return null
  }
  return createUnifiedSelectionObject(props.type, props.name)
})

function handleItemSelection(item) {
  emit('select-item', item.type, item.name)
}

const itemTypeLabel = computed(() => {
  // todo sort the ordering to match in game ordering
  if (!selectedItem.value?.types) {
    return 'Unknown'
  }
  return selectedItem.value.types
    .map(type => type.charAt(0).toUpperCase() + type.slice(1))
    .join('/')
})

const detailsData = computed(() => {
  const data =
    selectedItem.value &&
    getDetailsData(selectedItem.value.types, selectedItem.value, false, organizedData.value)
  console.log('detailsData', data)
  return data
})
</script>

<style module>
.detailsPane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  border-left: 1px solid var(--vp-c-border);
  overflow-y: auto;
}

.itemDetails {
  padding: 12px;
  max-width: 100%;
}

.itemHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #8b7355, #6b5b47);
  border-radius: 2px;
  border: 1px solid #9d8563;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
  gap: 16px;
}

.headerTitle {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.headerControls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.headerTabs {
  display: flex;
  gap: 2px;
}

.navigationControls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navButton {
  width: 32px;
  height: 32px;
  background: #4a4a4a;
  border: 1px solid #6a6a6a;
  border-top: 1px solid #7a7a7a;
  border-left: 1px solid #7a7a7a;
  border-radius: 2px;
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.1);
}

.navButton:hover:not(.disabled) {
  background: #5a5a5a;
  border-color: #7a7a7a;
  border-top: 1px solid #8a8a8a;
  border-left: 1px solid #8a8a8a;
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
}

.navButton.disabled {
  background: #2a2a2a;
  border-color: #3a3a3a;
  color: #666666;
  cursor: not-allowed;
  opacity: 0.4;
  pointer-events: none;
}

.historyContainer {
  position: relative;
}

.historyDropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 300px;
  max-height: 400px;
  background: #2d2d2d;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow-y: auto;
  margin-top: 4px;
}

.historyEmpty {
  padding: 12px;
  color: #888888;
  text-align: center;
  font-size: 14px;
}

.historyItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid #3a3a3a;
}

.historyItem:hover {
  background: #3a3a3a;
}

.historyItem:last-child {
  border-bottom: none;
}

.historyItemName {
  color: #ffffff;
  font-size: 14px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.historyButton {
  background: #4a4a4a;
  border: 1px solid #6a6a6a;
  border-top: 1px solid #7a7a7a;
  border-left: 1px solid #7a7a7a;
  border-radius: 2px;
  padding: 4px 8px;
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.1);
}

.historyButton:hover {
  background: #5a5a5a;
  border-color: #7a7a7a;
  border-top: 1px solid #8a8a8a;
  border-left: 1px solid #8a8a8a;
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
}

.headerTabs button {
  background: #4a4a4a;
  border: 1px solid #6a6a6a;
  border-top: 1px solid #7a7a7a;
  border-left: 1px solid #7a7a7a;
  border-radius: 2px;
  padding: 4px 8px;
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.1);
}

.headerTabs button:hover {
  background: #5a5a5a;
  border-color: #7a7a7a;
  border-top: 1px solid #8a8a8a;
  border-left: 1px solid #8a8a8a;
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
}

.headerTabs button.active {
  background: #6a6a6a;
  border-color: #8a8a8a;
  border-top: 1px solid #9a9a9a;
  border-left: 1px solid #9a9a9a;
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.itemHeader h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #000000;
}

.headerControls {
  display: flex;
  gap: 8px;
}

.controlButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  border-radius: 2px;
  color: #000000;
  cursor: pointer;
  transition: background 0.2s ease;
}

.controlButton:hover {
  background: rgba(0, 0, 0, 0.1);
}

.itemImageContainer {
  width: 100%;
  margin-bottom: 20px;
  background: #2d2d2d;
  border-radius: 4px;
  border: 1px solid #4a4a4a;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  /* Maintain 698x265 aspect ratio (265/698 ≈ 0.3797) */
  aspect-ratio: 698 / 265;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.usageDescription {
  margin-bottom: 20px;
  padding: 15px;
  background: #3a3a3a;
  border-radius: 2px;
}

.usageDescription p {
  margin: 0;
  color: #ffffff;
  line-height: 1.6;
  font-size: 14px;
}

.stackSizeDisplay {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: #ffffff;
  font-size: 14px;
}

.stackSizeIcon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: #4a4a4a;
  border-radius: 50%;
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
  border: 1px solid #5a5a5a;
}

.powerGeneration {
  margin-bottom: 20px;
  padding: 12px;
  background: #3a3a3a;
  border-radius: 2px;
}

.powerSection {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  margin-bottom: 8px;
}

.powerOutput {
  color: #ffffff;
  font-size: 14px;
}

.powerOutput strong {
  color: #ffffff;
}

.modInfo {
  margin-bottom: 12px;
  padding: 6px 10px;
  background: #3a3a3a;
  border-radius: 2px;
  font-size: 12px;
  color: #87ceeb;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.modOrigin {
  color: #87ceeb;
  font-size: 12px;
  line-height: 1.2;
}

.electricityConsumption {
  margin-bottom: 12px;
  padding: 10px;
  background: #3a3a3a;
  border-radius: 2px;
  border: 1px solid #4a4a4a;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.electricitySection {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffeb3b; /* Vibrant electricity yellow color */
  font-size: 13px;
  margin-bottom: 8px;
}

.electricitySection .sprite-icon {
  filter: hue-rotate(45deg) saturate(2) brightness(1.2) !important; /* Convert to electricity yellow */
}

/* Alternative approach - target the background image directly */
.electricitySection .sprite-icon[style*='background-image'] {
  filter: hue-rotate(45deg) saturate(2) brightness(1.2) !important; /* Convert to electricity yellow */
}

/* Most specific approach - target the electricity icon class */
.electricity-icon {
  filter: hue-rotate(45deg) saturate(2) brightness(1.2) !important; /* Convert to electricity yellow */
}

.energyDetails {
  margin-top: 8px;
}

.energyItem {
  color: #ffffff;
  font-size: 13px;
  margin-bottom: 4px;
}

.energyItem strong {
  color: #ffffff;
  font-weight: 600;
}

.itemContent {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipeSection,
.technologySection {
  padding: 10px;
  background: linear-gradient(135deg, #3a3a3a, #2d2d2d);
  border-radius: 2px;
  border: 1px solid #4a4a4a;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  margin-bottom: 10px;
}

.recipeSection h4,
.technologySection h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: bold;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 6px;
}

.technologySection h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: bold;
  color: #ffffff;
}

/* Technology-specific styles */
.researchCost {
  margin-bottom: 15px;
  padding: 10px;
  background: #2a2a2a;
  border-radius: 2px;
  border: 1px solid #4a4a4a;
}

.researchTrigger {
  margin-bottom: 15px;
  padding: 10px;
  background: #2a2a2a;
  border-radius: 2px;
  border: 1px solid #4a4a4a;
}

.triggerDetails {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.triggerItem {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ffffff;
  font-size: 13px;
}

.costDetails {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.costItem {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ffffff;
  font-size: 13px;
}

.sciencePacksSection {
  margin-top: 8px;
}

.sciencePacksList {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.sciencePackItem {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: #3a3a3a;
  border-radius: 2px;
  color: #ffffff;
  font-size: 12px;
}

.researchTimeSection {
  margin-top: 12px;
}

.researchTimeItem {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ffffff;
  font-size: 13px;
  margin-bottom: 4px;
}

.researchTimeItem strong {
  min-width: 120px;
  display: inline-block;
}

.researchCountItem {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ffffff;
  font-size: 13px;
  padding-left: 22px; /* Account for icon width + gap in research time line */
}

.researchCountItem strong {
  min-width: 120px;
  display: inline-block;
}

/* Effect display styles */
.effectIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.fallbackIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #4a4a4a;
  border-radius: 2px;
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  border: 1px solid #5a5a5a;
}

.technologyLevel {
  margin-bottom: 15px;
  padding: 10px;
  background: #2a2a2a;
  border-radius: 2px;
  border: 1px solid #4a4a4a;
}

.levelInfo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.levelItem {
  color: #ffffff;
  font-size: 13px;
}

.ingredientsList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.ingredientList,
.resultList,
.buildingList,
.usedInList,
.used-in-recipes,
.prerequisiteList,
.effectList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ingredientItem,
.productItem,
.buildingItem,
.itemReference,
.prerequisiteItem,
.effectItem {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  background: #4a4a4a;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: #ffffff;
  font-size: 13px;
  margin-bottom: 3px;
  min-height: 36px;
}

.ingredientItem:hover,
.productItem:hover,
.buildingItem:hover,
.itemReference:hover,
.prerequisiteItem:hover {
  background: #5a5a5a;
}

.craftingTimeContainer {
  margin-top: 8px;
}

.craftingTimeHr {
  border: none;
  height: 1px;
  background: #5a5a5a;
  margin: 8px 0;
}

.craftingTime {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ffffff;
  font-size: 13px;
  padding: 4px 0;
  margin-left: 40px; /* Align with ingredient quantities */
}

.researchItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  background: #4a4a4a;
  border-radius: 2px;
  color: #ffffff;
  font-size: 14px;
}

.noSelection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #888888;
}

.noSelection-content {
  text-align: center;
}

.noSelection-content h3 {
  margin: 0 0 8px 0;
  color: #ffffff;
  font-size: 18px;
}

.noSelection-content p {
  margin: 0;
  line-height: 1.6;
  font-size: 14px;
}

/* Dark mode adjustments */
.dark .controlButton {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-border);
}

.dark .controlButton:hover {
  background: var(--vp-c-bg-soft-hover);
}

/* New section styles */
.itemSection,
.fluidSection,
.tileSection {
  padding: 15px;
  background: #3a3a3a;
  border-radius: 2px;
  border: 1px solid #4a4a4a;
}

.itemSection h4,
.fluidSection h4,
.tileSection h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  font-weight: bold;
  color: #ffffff;
}

.itemProperty,
.fluidProperty,
.tileProperty {
  margin-bottom: 8px;
  color: #ffffff;
  font-size: 14px;
}

/* Game-style Tile UI */
.tileImageContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 4px;
  border: 1px solid #4a4a4a;
}

.tileGameSections {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tileGameSection {
  background: #3a3a3a;
  border-radius: 4px;
  border: 1px solid #4a4a4a;
  padding: 12px;
}

.tileSectionHeader {
  margin-bottom: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
}

.tileSectionContent {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tileSectionIcon {
  flex-shrink: 0;
}

.tileSectionSlots {
  display: flex;
  gap: 2px;
  flex: 1;
}

.tileSlot {
  width: 32px;
  height: 32px;
  background: #4a4a4a;
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.emptyIcon {
  width: 32px;
  height: 32px;
  background: #4a4a4a;
  border: 1px solid #5a5a5a;
  border-radius: 2px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

.recipeList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipeReference {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  background: #4a4a4a;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: #ffffff;
  font-size: 14px;
}

.recipeReference:hover {
  background: #5a5a5a;
}

/* Made in Grid Styles */
.madeInGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 36px;
  gap: 1px;
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  background: #2a2a2a;
  border: 1px solid #4a4a4a;
  border-radius: 2px;
  padding: 1px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.madeInItem {
  width: 36px;
  height: 36px;
  background: #4a4a4a;
  border: 1px solid #5a5a5a;
  border-radius: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  overflow: hidden;
}

.madeInItem :deep(.icon-button) {
  border: none !important;
  background: transparent !important;
  border-radius: 0 !important;
}

.madeInItem:hover {
  background: #5a5a5a;
  border-color: #6a6a6a;
}

/* Button Grid Styles */
.buttonGrid {
  display: grid;
  grid-template-columns: repeat(13, 1fr);
  grid-auto-rows: 36px;
  gap: 1px;
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  background: #2a2a2a;
  border: 1px solid #4a4a4a;
  border-radius: 2px;
  padding: 1px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.gridItem {
  width: 36px;
  height: 36px;
  background: #4a4a4a;
  border: 1px solid #5a5a5a;
  border-radius: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  overflow: hidden;
}

.gridItem :deep(.icon-button) {
  border: none !important;
  background: transparent !important;
  border-radius: 0 !important;
}

.gridItem:hover {
  background: #5a5a5a;
  border-color: #6a6a6a;
}

/* Can Craft Grid Styles */
.canCraftGrid {
  display: grid;
  grid-template-columns: repeat(13, 1fr);
  grid-auto-rows: 36px;
  gap: 1px;
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  background: #2a2a2a;
  border: 1px solid #4a4a4a;
  border-radius: 2px;
  padding: 1px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.canCraftItem {
  width: 36px;
  height: 36px;
  background: #4a4a4a;
  border: 1px solid #5a5a5a;
  border-radius: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  overflow: hidden;
}

.canCraftItem :deep(.icon-button) {
  border: none !important;
  background: transparent !important;
  border-radius: 0 !important;
}

.canCraftItem:hover {
  background: #5a5a5a;
  border-color: #6a6a6a;
}

/* Unlock Technologies Styles */
.unlockTechnologiesList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unlockTechnologyItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #4a4a4a;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.unlockTechnologyItem:hover {
  background: #5a5a5a;
}

.technologyIcon {
  flex-shrink: 0;
}

.technologyInfo {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.technologyName {
  font-size: 14px;
  font-weight: bold;
  color: #ffffff;
}

.researchLevel {
  font-size: 12px;
  color: #cccccc;
}

.sciencePacks {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.sciencePack {
  font-size: 11px;
  color: #87ceeb;
  background: rgba(135, 206, 235, 0.1);
  padding: 2px 6px;
  border-radius: 2px;
  border: 1px solid rgba(135, 206, 235, 0.3);
}

/* Raws Content Styles */
.rawsContent {
  padding: 1rem 0;
}

.rawSection {
  margin-bottom: 12px;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  background: #3a3a3a;
  overflow: hidden;
}

.rawSectionHeader {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #4a4a4a, #3a3a3a);
  border: none;
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid #5a5a5a;
}

.rawSectionHeader:hover {
  background: linear-gradient(135deg, #5a5a5a, #4a4a4a);
}

.rawSectionTitle {
  flex: 1;
  text-align: left;
}

.rawSectionToggle {
  font-size: 12px;
  color: #cccccc;
  transition: transform 0.2s ease;
}

.rawSectionContent {
  padding: 0;
  background: #2d2d2d;
}

.rawsData {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0;
  padding: 1rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 40vh;
  overflow-y: auto;
  margin: 0;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .detailsPane {
    border-left: none;
    border-top: 1px solid var(--vp-c-border);
  }

  .itemDetails {
    padding: 8px;
  }

  .itemHeader {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
    padding: 8px;
  }

  .headerTitle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .headerTitle h3 {
    font-size: 14px;
    flex: 1;
    word-break: break-word;
  }

  .headerTabs {
    width: 100%;
    display: flex;
    gap: 4px;
  }

  .headerTabs button {
    flex: 1;
    padding: 6px 8px;
    font-size: 12px;
  }

  .itemImageContainer {
    margin: 8px 0;
    display: flex;
    justify-content: center;
  }

  /* Adjust grid layouts for mobile */
  .ingredientGrid,
  .productGrid,
  .canCraftGrid {
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 4px;
  }

  .ingredientItem,
  .productItem {
    flex-direction: column;
    text-align: center;
    padding: 4px;
    gap: 2px;
  }

  .ingredientItem .ingredientIcon,
  .productItem .productIcon {
    width: 24px;
    height: 24px;
  }

  .ingredientItem .ingredientName,
  .productItem .productName {
    font-size: 10px;
    line-height: 1.2;
  }

  /* Adjust recipe sections for mobile */
  .recipeSection {
    margin-bottom: 12px;
  }

  .recipeSection h4 {
    font-size: 13px;
    margin-bottom: 6px;
  }

  /* Adjust technology sections for mobile */
  .technologySection h4 {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .researchTrigger,
  .researchCost {
    margin-bottom: 8px;
  }

  .researchTrigger h5,
  .researchCost h5 {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .triggerItem,
  .costItem {
    font-size: 11px;
    padding: 2px 4px;
    margin-bottom: 2px;
  }

  /* Adjust raws content for mobile */
  .rawsData {
    font-size: 0.75rem;
    padding: 0.5rem;
    max-height: 30vh;
  }

  .rawSectionHeader {
    padding: 8px 12px;
    font-size: 12px;
  }
}

/* iPhone 12 Pro and similar devices */
@media (max-width: 428px) {
  .itemDetails {
    padding: 6px;
  }

  .itemHeader {
    padding: 6px;
    margin-bottom: 6px;
  }

  .headerTitle h3 {
    font-size: 13px;
  }

  .headerTabs button {
    padding: 4px 6px;
    font-size: 11px;
  }

  /* Even smaller grids for very small screens */
  .ingredientGrid,
  .productGrid,
  .canCraftGrid {
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
    gap: 2px;
  }

  .ingredientItem,
  .productItem {
    padding: 2px;
  }

  .ingredientItem .ingredientIcon,
  .productItem .productIcon {
    width: 20px;
    height: 20px;
  }

  .ingredientItem .ingredientName,
  .productItem .productName {
    font-size: 9px;
  }

  .recipeSection h4,
  .technologySection h4 {
    font-size: 12px;
  }

  .researchTrigger h5,
  .researchCost h5 {
    font-size: 11px;
  }

  .triggerItem,
  .costItem {
    font-size: 10px;
  }

  .rawsData {
    font-size: 0.7rem;
    padding: 0.4rem;
    max-height: 25vh;
  }
}
</style>
