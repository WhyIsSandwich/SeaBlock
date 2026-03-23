<template>
  <div :class="$style.detailsPane">
    <div v-if="selectedItem" :class="$style.itemDetails">
      <!-- Item Header with Controls and Tabs -->
      <div :class="$style.itemHeader">
        <div :class="$style.headerTitle">
          <SpriteIcon
            :sprite-key="`${getPrimaryType(selectedItem)}-${selectedItem.name}`"
            :size="36"
            :title="formattedDisplayName"
          />
          <h3>{{ formattedDisplayName }} ({{ itemTypeLabel }})</h3>
        </div>
        <div :class="$style.headerControls">
          <div :class="$style.headerTabs">
            <button
              :class="{ [$style.active]: activeTab === 'details' }"
              class="fpio-button-chrome"
              @click="activeTab = 'details'"
            >
              Details
            </button>
            <button
              :class="{ [$style.active]: activeTab === 'raws' }"
              class="fpio-button-chrome"
              @click="activeTab = 'raws'"
            >
              Raws
            </button>
            <button
              v-if="type === 'technology' && showTechnologyAction"
              type="button"
              :class="$style.researchMapButton"
              class="fpio-button-chrome"
              :title="technologyActionTitle"
              :aria-label="technologyActionTitle"
              @click="emit('open-tech-tree')"
            >
              {{ technologyActionLabel }}
            </button>
          </div>
          <div :class="$style.navigationControls">
            <button
              :class="[$style.navButton, { [$style.disabled]: !canGoBack }]"
              class="fpio-button-chrome"
              :disabled="!canGoBack"
              title="Go back"
              @click="$emit('navigate-back')"
            >
              ←
            </button>
            <button
              :class="[$style.navButton, { [$style.disabled]: !canGoForward }]"
              class="fpio-button-chrome"
              :disabled="!canGoForward"
              title="Go forward"
              @click="$emit('navigate-forward')"
            >
              →
            </button>
            <div :class="$style.historyContainer">
              <button
                :class="$style.historyButton"
                class="fpio-button-chrome"
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
                    :size="32"
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
        <div
          v-if="selectedItem?.description || detailsData.statistics?.length > 0"
          :class="$style.detailsInfoBox"
        >
          <div v-if="selectedItem?.description" :class="$style.detailsDescription">
            <FactorioRichText :text="selectedItem.description" />
          </div>
          <!-- Statistics -->
          <Statistics
            v-if="detailsData.statistics?.length > 0"
            :statistics="detailsData.statistics"
            :embedded="true"
          />
        </div>

        <template
          v-for="(section, sectionIndex) in detailsData.sections"
          :key="`${section.type || section.label || 'section'}-${sectionIndex}`"
        >
          <DetailsPaneSection :section="section" />
        </template>
      </div>
      <!-- Raws Tab Content -->
      <div v-if="activeTab === 'raws'" :class="$style.rawsContent">
        <RawSection
          v-if="selectedItem?.recipe"
          title="Recipe Data"
          :data="selectedItem.recipe"
          :is-open="rawSectionsOpen.recipe"
          @toggle="toggleRawSection('recipe')"
        />

        <RawSection
          v-if="selectedItem?.item"
          title="Item Data"
          :data="selectedItem.item"
          :is-open="rawSectionsOpen.item"
          @toggle="toggleRawSection('item')"
        />

        <RawSection
          v-if="selectedItem?.fluid"
          title="Fluid Data"
          :data="selectedItem.fluid"
          :is-open="rawSectionsOpen.fluid"
          @toggle="toggleRawSection('fluid')"
        />

        <RawSection
          v-if="selectedItem?.tile"
          title="Tile Data"
          :data="selectedItem.tile"
          :is-open="rawSectionsOpen.tile"
          @toggle="toggleRawSection('tile')"
        />

        <RawSection
          v-if="selectedItem?.technology"
          title="Technology Data"
          :data="selectedItem.technology"
          :is-open="rawSectionsOpen.technology"
          @toggle="toggleRawSection('technology')"
        />

        <RawSection
          v-if="selectedItem?.entity"
          title="Entity Data"
          :data="selectedItem.entity"
          :is-open="rawSectionsOpen.entity"
          @toggle="toggleRawSection('entity')"
        />

        <RawSection
          v-if="selectedItem?.equipment"
          title="Equipment Data"
          :data="selectedItem.equipment"
          :is-open="rawSectionsOpen.equipment"
          @toggle="toggleRawSection('equipment')"
        />

        <RawSection
          title="Unified Raw Data"
          :data="unifiedRawData"
          :is-open="rawSectionsOpen.unified"
          @toggle="toggleRawSection('unified')"
        />
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
import { useDetailsData } from '../../../src/composables/useDetailsData.js'

import SpriteIcon from './SpriteIcon.vue'
import FactorioSprite from './FactorioSprite.vue'
import Statistics from './Statistics.vue'
import DetailsPaneSection from './DetailsPaneSection.vue'
import FactorioRichText from './FactorioRichText.vue'
import RawSection from './RawSection.vue'
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
  },
  sciencePackVisibility: {
    type: Object,
    default: null
  },
  showTechnologyAction: {
    type: Boolean,
    default: true
  },
  technologyActionLabel: {
    type: String,
    default: 'Research map'
  },
  technologyActionTitle: {
    type: String,
    default: 'Show research dependency map (prerequisites converge on each technology once)'
  }
})

// Emits
const emit = defineEmits([
  'toggle-animation-pause',
  'navigate-back',
  'navigate-forward',
  'toggle-history',
  'select-from-history',
  'open-tech-tree'
])

// Computed property to create selectedItem from name and type
const selectedItem = computed(() => {
  if (!props.name || !props.type) {
    return null
  }
  return createUnifiedSelectionObject(props.type, props.name)
})

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
    getDetailsData(selectedItem.value.types, selectedItem.value, false, organizedData.value, {
      excludeHiddenFromFactorioData: true,
      visibilityFilter: props.sciencePackVisibility
    })
  return data
})

// Format display name with product amount if recipe has show_amount_in_title
const formattedDisplayName = computed(() => {
  if (!selectedItem.value?.displayName) return ''

  const { displayName, recipe, types } = selectedItem.value
  const isRecipe = types?.includes('recipe')

  if (!isRecipe || recipe?.show_amount_in_title === false || !recipe.results?.length) {
    return displayName
  }

  // Don't show amount if recipe has multiple products
  if (recipe.results.length > 1) {
    return displayName
  }

  // Get the amount from the first (and only) result in the recipe
  const firstResult = recipe.results[0]
  const amount = firstResult?.amount || 1

  // Only show amount if it's not 1
  if (amount === 1) {
    return displayName
  }

  return `${amount}x ${displayName}`
})
</script>

<style module>
@import './factoriopediaSharedPrimitives.css';

.detailsPane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #4a4a4a;
  border-left: 1px solid #1a1a1a;
  overflow-y: auto;
}

.itemDetails {
  padding: 10px;
  max-width: 100%;
  line-height: 1.35;
}

.itemHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 6px 10px;
  background: linear-gradient(to bottom, #2f2f2f, #232323);
  border-radius: 2px;
  border: 1px solid #3f3f3f;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 1px 0 rgba(0, 0, 0, 0.45);
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
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navButton:hover:not(.disabled) {
  color: #ffffff;
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
  border-radius: 2px;
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
  padding: 4px 8px;
  color: #d3d3d3;
}

.historyButton:hover {
  color: #ffffff;
}

.headerTabs button {
  padding: 4px 8px;
}

.headerTabs button:hover {
  color: #ffffff;
}

.headerTabs button.active {
  background: linear-gradient(to bottom, #3a3022, #2d2418);
  border-color: #ad8344;
  border-top: 1px solid #bc9250;
  border-left: 1px solid #bc9250;
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.researchMapButton {
  background: linear-gradient(to bottom, #2d3a2d, #1f2a1f);
  border: 1px solid #4a6b4a;
  border-top: 1px solid #5a7f5a;
  border-left: 1px solid #5a7f5a;
  padding: 4px 8px;
  color: #c8e6c8;
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}

.researchMapButton:hover {
  background: linear-gradient(to bottom, #354435, #283828);
  border-color: #6a906a;
  border-top: 1px solid #7aa07a;
  border-left: 1px solid #7aa07a;
  color: #ffffff;
}

.itemHeader h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
  color: #f2f2f2;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.65);
}

.itemImageContainer {
  width: 100%;
  background: #1e1e1e;
  border-radius: 2px;
  border: 1px solid #1b1b1b;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  padding: 0;
  margin: 0 0 12px 0;
  /* Maintain 698x265 aspect ratio (265/698 ≈ 0.3797) */
  aspect-ratio: 698 / 265;
  box-shadow:
    inset 0 0 0 1px #3a3a3a,
    inset 0 1px 4px rgba(0, 0, 0, 0.55);
}

.detailsInfoBox {
  margin-bottom: 12px;
  padding: 10px;
  background: linear-gradient(135deg, #2d2d2d, #252525);
  border-radius: 2px;
  border: 1px solid #3f3f3f;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 1px 2px rgba(0, 0, 0, 0.35);
  display: grid;
  gap: 8px;
}

.detailsDescription {
  color: #cccccc;
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
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
  line-height: 1.45;
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
  background: #1f1f1f;
  border-radius: 2px;
  font-size: 12px;
  color: #7ea4b7;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.modOrigin {
  color: #7ea4b7;
  font-size: 12px;
  line-height: 1.2;
}

.electricityConsumption {
  margin-bottom: 12px;
  padding: 10px;
  background: #1f1f1f;
  border-radius: 2px;
  border: 1px solid #3f3f3f;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.electricitySection {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffeb3b; /* Vibrant electricity yellow color */
  font-size: 14px;
  margin-bottom: 8px;
}

.electricitySection :global(.sprite-icon) {
  filter: hue-rotate(45deg) saturate(2) brightness(1.2) !important; /* Convert to electricity yellow */
}

/* Alternative approach - target the background image directly */
.electricitySection :global(.sprite-icon)[style*='background-image'] {
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
  font-size: 14px;
  margin-bottom: 4px;
  line-height: 1.35;
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
  padding: 8px;
  background: #202020;
  border-radius: 2px;
  border: 1px solid #3a3a3a;
  margin-bottom: 8px;
}

.recipeSection h4,
.technologySection h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
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
  line-height: 1.3;
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
  line-height: 1.3;
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
  line-height: 1.3;
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
  line-height: 1.3;
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
  line-height: 1.3;
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
  line-height: 1.3;
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

.noSelectionContent {
  text-align: center;
}

.noSelectionContent h3 {
  margin: 0 0 8px 0;
  color: #ffffff;
  font-size: 18px;
}

.noSelectionContent p {
  margin: 0;
  line-height: 1.6;
  font-size: 14px;
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
    font-size: 15px;
    flex: 1;
    word-break: break-word;
    line-height: 1.25;
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
    font-size: 12px;
    padding: 2px 4px;
    margin-bottom: 2px;
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
    font-size: 14px;
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
    font-size: 11px;
  }
}
</style>
