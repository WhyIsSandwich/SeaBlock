<template>
  <div :class="[$style.host, fillParent ? $style.hostFill : '']">
    <header :class="[$style.header, !showTitle ? $style.headerCompact : '']">
      <h4 v-if="showTitle" :class="$style.title">Production map</h4>
      <div :class="$style.headerActions">
        <button
          v-if="!isNarrowStack"
          type="button"
          :class="[$style.headerBtn, 'fpio-button-chrome']"
          title="Reset pan and zoom"
          @click="onResetZoom"
        >
          Reset zoom
        </button>
        <button
          type="button"
          :class="[$style.headerBtn, 'fpio-button-chrome']"
          title="Collapse all expanded recipe and material nodes"
          @click="onResetExpansion"
        >
          Reset expansion
        </button>
        <button
          v-if="showChangeRootFlow"
          type="button"
          :class="[$style.headerBtn, 'fpio-button-chrome']"
          title="Choose a different production or consumption direction"
          @click="onChangeRootFlow"
        >
          Change flow
        </button>
      </div>
    </header>
    <p v-if="showTitle && flowSemanticsHint" :class="$style.hint">{{ flowSemanticsHint }}</p>
    <p v-if="showTitle" :class="$style.hint">
      Tap or click a node to make it the spine terminal: only that path from the focus stays
      expanded; sibling cards in each column stay visible as leaves (not expanded). From an item or
      fluid focus, producer recipes (right) and consumer recipes (left) both appear at the root; you
      can walk either direction along one spine. The view animates so the terminal stays centered
      horizontally with the graph top aligned. Pan the background to reach siblings. Double-click (or
      long-press on touch) opens the entry in Factoriopedia. Ctrl/Cmd + wheel zooms the map. A badge
      on a material marks when that item or fluid already appeared in an earlier column (production
      loop).
    </p>
    <p v-if="truncated" :class="$style.warn">Some nodes are hidden (limit reached).</p>
    <p v-if="mapEmptyNote" :class="$style.softNote">{{ mapEmptyNote }}</p>
    <div
      v-if="focusId"
      ref="viewportRef"
      :class="[
        isNarrowStack ? $style.viewportStack : $style.viewport,
        fillParent ? $style.viewportFill : ''
      ]"
      @pointerdown.self="onViewportPointerDown"
      @pointermove.self="onViewportPointerMove"
      @pointerup.self="onViewportPointerUp"
      @pointercancel.self="onViewportPointerUp"
    >
      <ProductionMapStackView
        v-if="isNarrowStack"
        :nodes="graph.nodes"
        :spine-ids="narrowSpineIdsOrdered"
        :peer-ids="narrowPeerIds"
        :child-ids="narrowChildIds"
        :has-leaves="hasNarrowStackLeaves"
        :needs-root-flow-picker="needsRootFlowPicker"
        :root-flow-picker-hint="rootFlowPickerHint"
        :focus-type="props.focusType"
        :helpers="stackHelpers"
        @pick-root-flow="onPickRootFlow"
        @pointer-down="onNodePointerDown"
        @pointer-move="onNodePointerMove"
        @pointer-up="onNodePointerUp"
        @pointer-cancel="onNodePointerCancel"
        @node-click="onNodeClick"
        @node-dblclick="onNodeDblClick"
      />
      <ProductionMapWideView
        v-else
        ref="wideViewRef"
        :node-entries="nodeEntries"
        :edge-paths="edgePaths"
        :svg-size="svgSize"
        :zoom-layer-size-style="zoomLayerSizeStyle"
        :card-style="cardStyle"
        :edge-path-style="edgePathStyle"
        :spine-ids-for-ui="spineIdsForUi"
        :helpers="wideHelpers"
        @pointer-down="onNodePointerDown"
        @pointer-move="onNodePointerMove"
        @pointer-up="onNodePointerUp"
        @pointer-cancel="onNodePointerCancel"
        @node-click="onNodeClick"
        @node-dblclick="onNodeDblClick"
      />
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  useCssModule,
  watch
} from 'vue'
import { formatFactoriopediaDetailTitle } from '../../../src/utils/factoriopediaDetailTitle.js'
import { isTouchDevice } from '../../../src/utils/isTouchDevice.js'
import {
  buildProductionTreeGraph,
  clampTreePathToExisting,
  expandedPathsForSpineTerminal,
  markRepeatMaterialNodes,
  materialHasExpandableConsumers,
  materialHasExpandableRecipes,
  materialKey,
  PM_TREE_ROOT_ID,
  recipeHasExpandableIngredients,
  recipeHasExpandableProducts,
  recipeNodeId,
  spinePathIdsForTerminal
} from '../../../src/utils/productionMapGraph.js'
import {
  computeProductionMapFrame,
  productionMapNarrowBreakpointPx,
  translateProductionMapPathD
} from '../../../src/utils/productionMapLayout.js'
import { computeTranslateForSpineTerminal } from '../../../src/utils/productionMapViewport.js'

import ProductionMapStackView from './ProductionMapStackView.vue'
import ProductionMapWideView from './ProductionMapWideView.vue'

const props = defineProps({
  factorioData: {
    type: Object,
    default: null
  },
  focusType: {
    type: String,
    default: ''
  },
  focusName: {
    type: String,
    default: ''
  },
  sciencePackVisibility: {
    type: Object,
    default: null
  },
  fillParent: {
    type: Boolean,
    default: false
  },
  showTitle: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['select-entry'])

const cssm = useCssModule()

const NARROW_BREAKPOINT_PX = productionMapNarrowBreakpointPx()
/** Stable empty expansion for narrow root-flow picker (graph must not include root children). */
const EMPTY_EXPANDED = new Set()

/** Touch / coarse UI: inline recipe amounts + taller layout boxes (desktop uses Tooltip for detail). */
const touchUiForLayout = ref(isTouchDevice())

const viewportRef = ref(null)
const wideViewRef = ref(null)

provide('pmViewportRef', viewportRef)

/** Which tree paths are expanded (children visible); ids equal these paths. */
const expandedTreePaths = shallowRef(new Set())
/** Narrow modal: which root branch is active (`right` = production / ingredients, `left` = consumption / products). */
const rootFlowLock = ref(null)
/** True when the map viewport cannot fit three graph columns. */
const isNarrowStack = ref(false)
/** Deepest node on the selected spine (path id); ancestors are implied. */
const spineTerminalId = ref(PM_TREE_ROOT_ID)
const layoutPositions = shallowRef(new Map())
/** Edge segments in layout space; `edgePaths` applies `displayNorm` via `translateProductionMapPathD`. */
const layoutEdgePaths = shallowRef([])

const truncated = ref(false)
const contentBounds = ref({ minX: 0, minY: 0, maxX: 400, maxY: 280 })

/** Locked on first layout after focus reset so re-centering on minX/minY does not slide the graph when only max grows. */
const displayNorm = ref({ ox: 0, oy: 0 })
const displayNormLocked = ref(false)

const visibilityFilter = computed(() => props.sciencePackVisibility || null)

const focusId = computed(() => {
  if (!props.focusName) return ''
  if (props.focusType === 'recipe') return recipeNodeId(props.focusName)
  if (props.focusType === 'item' || props.focusType === 'fluid') {
    return materialKey(props.focusType, props.focusName)
  }
  return ''
})

const emptyGraph = () => ({
  nodes: new Map(),
  edges: [],
  truncated: false,
  rootInstanceId: PM_TREE_ROOT_ID,
  focusPrototypeKey: ''
})

const bothRootBranchesExpandable = computed(() => {
  if (!props.factorioData || !focusId.value) return false
  const vf = visibilityFilter.value
  if (props.focusType === 'recipe') {
    return (
      recipeHasExpandableIngredients(props.factorioData, props.focusName, vf) &&
      recipeHasExpandableProducts(props.factorioData, props.focusName, vf)
    )
  }
  if (props.focusType === 'item' || props.focusType === 'fluid') {
    return (
      materialHasExpandableRecipes(props.factorioData, focusId.value, vf) &&
      materialHasExpandableConsumers(props.factorioData, focusId.value, vf)
    )
  }
  return false
})

const needsRootFlowPicker = computed(
  () => isNarrowStack.value && rootFlowLock.value == null && bothRootBranchesExpandable.value
)

const expandedForGraph = computed(() => {
  if (needsRootFlowPicker.value) return EMPTY_EXPANDED
  return expandedTreePaths.value
})

const rootBranchFilterForBuild = computed(() => {
  if (!isNarrowStack.value || rootFlowLock.value == null) return null
  return rootFlowLock.value
})

const graph = computed(() => {
  if (!props.factorioData || !focusId.value) {
    return emptyGraph()
  }
  return buildProductionTreeGraph(
    props.factorioData,
    props.focusType,
    props.focusName,
    expandedForGraph.value,
    {
      visibilityFilter: visibilityFilter.value,
      maxNodes: 100,
      rootBranchFilter: rootBranchFilterForBuild.value
    }
  )
})

const narrowSpineIdsOrdered = computed(() => {
  if (!isNarrowStack.value) return []
  const nodes = graph.value.nodes
  if (!nodes.size) return []
  const term = clampTreePathToExisting(nodes, spineTerminalId.value)
  const chain = []
  let id = term
  while (id && nodes.has(id)) {
    chain.push(id)
    id = nodes.get(id)?.parentInstanceId ?? null
  }
  return chain.reverse()
})

/** Other nodes in the same graph column as the spine terminal (desktop: stacked siblings). */
const narrowPeerIds = computed(() => {
  if (!isNarrowStack.value || needsRootFlowPicker.value) return []
  const nodes = graph.value.nodes
  if (!nodes.size) return []
  const term = clampTreePathToExisting(nodes, spineTerminalId.value)
  if (term === PM_TREE_ROOT_ID) return []
  const t = nodes.get(term)
  if (!t || t.parentInstanceId == null) return []
  const parentId = t.parentInstanceId
  const out = []
  for (const [id, n] of nodes) {
    if (n.parentInstanceId === parentId && id !== term) out.push(id)
  }
  out.sort((a, b) => a.localeCompare(b))
  return out
})

/** Direct children of the spine terminal (next column on desktop: ingredients, products, etc.). */
const narrowChildIds = computed(() => {
  if (!isNarrowStack.value || needsRootFlowPicker.value) return []
  const nodes = graph.value.nodes
  if (!nodes.size) return []
  const term = clampTreePathToExisting(nodes, spineTerminalId.value)
  const out = []
  for (const [id, n] of nodes) {
    if (n.parentInstanceId === term && id !== term) out.push(id)
  }
  out.sort((a, b) => a.localeCompare(b))
  return out
})

const hasNarrowStackLeaves = computed(
  () => narrowPeerIds.value.length > 0 || narrowChildIds.value.length > 0
)

const rootFlowPickerHint = computed(() => {
  if (props.focusType === 'recipe') {
    return 'Explore inputs (ingredients) or outputs (products) from this recipe.'
  }
  return 'Explore production recipes or consumption recipes for this entry.'
})

const showChangeRootFlow = computed(
  () =>
    isNarrowStack.value &&
    bothRootBranchesExpandable.value &&
    rootFlowLock.value != null &&
    spineTerminalId.value === PM_TREE_ROOT_ID
)

function mapHasExpandableBranches() {
  if (!props.factorioData || !focusId.value) return false
  const vf = visibilityFilter.value
  if (props.focusType === 'recipe') {
    return (
      recipeHasExpandableIngredients(props.factorioData, props.focusName, vf) ||
      recipeHasExpandableProducts(props.factorioData, props.focusName, vf)
    )
  }
  return (
    materialHasExpandableRecipes(props.factorioData, focusId.value, vf) ||
    materialHasExpandableConsumers(props.factorioData, focusId.value, vf)
  )
}

const hasExpandableContent = computed(() => mapHasExpandableBranches())

const flowSemanticsHint = computed(() => {
  if (props.focusType === 'recipe') {
    return (
      'From the recipe, the spine moves in one direction at a time: to the right are ingredients ' +
      '(inputs); to the left are products (outputs). Further steps on the right chain only add ' +
      'ingredients and producer recipes; on the left chain only products and consumer recipes. Within ' +
      'one column, nodes above and below are siblings.'
    )
  }
  if (props.focusType === 'item' || props.focusType === 'fluid') {
    return (
      'From the selected item or fluid, the spine moves in one direction at a time: to the right are ' +
      'recipes that produce it, then their ingredients and upstream producers; to the left are recipes ' +
      'that consume it as an ingredient, then their products and further consumers. Each chain stays ' +
      'on its own side. Within one column, nodes above and below are siblings.'
    )
  }
  return ''
})

const mapEmptyNote = computed(() => {
  if (!focusId.value || hasExpandableContent.value) return ''
  if (props.focusType === 'recipe') {
    return (
      'No visible item or fluid products or ingredients for this recipe with the current science ' +
      'filter (only this recipe is shown).'
    )
  }
  return (
    'No visible recipes produce or consume this prototype with the current science filter (only ' +
    'this entry is shown).'
  )
})

function getRecipeMap(factorioData) {
  if (!factorioData) return {}
  return factorioData.recipe || factorioData.recipes || {}
}

function rawRecipeForNode(node) {
  if (node.kind !== 'recipe' || !props.factorioData) return null
  const m = getRecipeMap(props.factorioData)
  return m[node.name] ?? null
}

function cardTitle(node) {
  if (node.kind === 'material') {
    return formatFactoriopediaDetailTitle({
      displayName: node.displayName,
      isRecipe: false,
      recipe: null
    })
  }
  return formatFactoriopediaDetailTitle({
    displayName: node.displayName,
    isRecipe: true,
    recipe: rawRecipeForNode(node)
  })
}

function tooltipCategory(node) {
  if (node.kind === 'recipe') return 'recipe'
  return node.type === 'fluid' ? 'fluid' : 'item'
}

function normalizeProductOrIngredientType(entry) {
  const t = entry?.type
  if (t === 'fluid') return 'fluid'
  if (t === 'item' || t == null || t === '') return 'item'
  return null
}

function prototypeDisplayName(materialType, materialName) {
  const fd = props.factorioData
  if (!fd) return materialName
  const items = fd.item || fd.items || {}
  const fluids = fd.fluid || fd.fluids || {}
  const proto = materialType === 'fluid' ? fluids[materialName] : items[materialName]
  return proto?.displayName != null ? String(proto.displayName) : materialName
}

function recipeTouchDetail(node) {
  const empty = { ingredients: [], products: [] }
  if (node.kind !== 'recipe' || !props.factorioData) return empty
  const raw = rawRecipeForNode(node)
  if (!raw) return empty
  const ingredients = []
  for (const ing of raw.ingredients || []) {
    const t = normalizeProductOrIngredientType(ing)
    if (!t || !ing?.name) continue
    ingredients.push({
      amount: ing.amount != null ? ing.amount : 1,
      label: prototypeDisplayName(t, ing.name)
    })
  }
  const products = []
  for (const r of raw.results || []) {
    const t = normalizeProductOrIngredientType(r)
    if (!t || !r?.name) continue
    products.push({
      amount: r.amount != null ? r.amount : 1,
      label: prototypeDisplayName(t, r.name)
    })
  }
  return { ingredients, products }
}

function recipeTouchExtraHeightPx(node) {
  const d = recipeTouchDetail(node)
  const ni = d.ingredients.length
  const np = d.products.length
  if (ni === 0 && np === 0) return 0
  const line = 13
  const head = 12
  let h = 6
  if (ni) h += head + ni * line
  if (ni && np) h += 6
  if (np) h += head + np * line
  return h
}

function productionMapTooltipEnabled(id, node) {
  if (node.kind !== 'recipe') return true
  const d = recipeTouchDetail(node)
  if (
    isNarrowStack.value &&
    (d.ingredients.length > 0 || d.products.length > 0)
  ) {
    return false
  }
  return spineIdsForUi.value.has(id)
}

function showRecipeTouchBlock(id, node) {
  if (node.kind !== 'recipe') return false
  const d = recipeTouchDetail(node)
  if (d.ingredients.length === 0 && d.products.length === 0) return false
  if (isNarrowStack.value) return true
  return touchUiForLayout.value && spineIdsForUi.value.has(id)
}

function narrowCardClassList(id, node) {
  if (!node) return [cssm.card, cssm.cardStack]
  return [
    cssm.card,
    cssm.cardStack,
    node.kind === 'material' && node.type === 'item' ? cssm.cardItem : '',
    node.kind === 'material' && node.type === 'fluid' ? cssm.cardFluid : '',
    node.kind === 'recipe' ? cssm.cardRecipe : '',
    expandedTreePaths.value.has(id) ? cssm.cardExpanded : '',
    node.isFocus ? cssm.cardFocus : '',
    spineIdsForUi.value.has(id) ? cssm.cardSpine : ''
  ]
}

function flowBadgeLabel(node) {
  if (!node || (node.flowDir !== 'right' && node.flowDir !== 'left')) return ''
  if (props.focusType === 'recipe') {
    return node.flowDir === 'right' ? 'Ingredients' : 'Products'
  }
  return node.flowDir === 'right' ? 'Production' : 'Consumption'
}

const stackHelpers = computed(() => ({
  cardTitle,
  tooltipCategory,
  recipeTouchDetail,
  showRecipeTouchBlock,
  productionMapTooltipEnabled,
  showExpandChevron,
  repeatBadgeTitle,
  flowBadgeLabel,
  narrowCardClassList,
  isExpanded: id => expandedTreePaths.value.has(id)
}))

const wideHelpers = computed(() => ({
  cardTitle,
  tooltipCategory,
  recipeTouchDetail,
  showRecipeTouchBlock,
  productionMapTooltipEnabled,
  showExpandChevron,
  repeatBadgeTitle,
  isExpanded: id => expandedTreePaths.value.has(id)
}))

function syncNarrowStack() {
  const el = viewportRef.value
  if (!el) return
  const w = el.getBoundingClientRect().width
  isNarrowStack.value = Number.isFinite(w) && w > 0 && w < NARROW_BREAKPOINT_PX
}

function applyNarrowAutoRootFlow() {
  if (!isNarrowStack.value || !props.factorioData || !focusId.value) return
  const vf = visibilityFilter.value
  if (props.focusType === 'recipe') {
    const hasIng = recipeHasExpandableIngredients(props.factorioData, props.focusName, vf)
    const hasProd = recipeHasExpandableProducts(props.factorioData, props.focusName, vf)
    if (hasIng && !hasProd) rootFlowLock.value = 'right'
    else if (!hasIng && hasProd) rootFlowLock.value = 'left'
  } else if (props.focusType === 'item' || props.focusType === 'fluid') {
    const hasR = materialHasExpandableRecipes(props.factorioData, focusId.value, vf)
    const hasL = materialHasExpandableConsumers(props.factorioData, focusId.value, vf)
    if (hasR && !hasL) rootFlowLock.value = 'right'
    else if (!hasR && hasL) rootFlowLock.value = 'left'
  }
}

function productionMapLayoutOptions(spineSet) {
  return {
    spineNodeIds: spineSet,
    getExtraCardHeight(node) {
      if (!touchUiForLayout.value || node.kind !== 'recipe') return 0
      if (!spineSet.has(node.instanceId)) return 0
      return recipeTouchExtraHeightPx(node)
    }
  }
}

const spineIdsForUi = computed(() => {
  const nodes = graph.value.nodes
  if (!nodes.size) return new Set()
  const t = clampTreePathToExisting(nodes, spineTerminalId.value)
  return spinePathIdsForTerminal(nodes, t)
})

function repeatBadgeTitle(node) {
  const col = node.repeatEarlierDepth
  if (col == null || !Number.isFinite(col)) {
    return 'This material already appears earlier in the map'
  }
  return `This material already appears in column ${col} (earlier in the flow)`
}

const lastFocusKey = ref('')
/** After focus change, true once we have applied default “focus expanded to recipes”; avoids re-forcing when user collapses. */
const expansionPrimed = ref(false)

function onPickRootFlow(dir) {
  if (dir !== 'right' && dir !== 'left') return
  rootFlowLock.value = dir
  expandedTreePaths.value = new Set([PM_TREE_ROOT_ID])
  expansionPrimed.value = true
  spineTerminalId.value = PM_TREE_ROOT_ID
}

function onChangeRootFlow() {
  rootFlowLock.value = null
  expandedTreePaths.value = new Set()
  spineTerminalId.value = PM_TREE_ROOT_ID
  expansionPrimed.value = false
}

const SPINE_PAN_ANIM_MS = 240

watch(
  () => [
    props.focusType,
    props.focusName,
    props.factorioData,
    [...expandedTreePaths.value].sort().join('\n'),
    props.sciencePackVisibility,
    spineTerminalId.value,
    touchUiForLayout.value,
    isNarrowStack.value,
    rootFlowLock.value
  ],
  () => {
    syncNarrowStack()
    const fk = `${props.focusType}\0${props.focusName}`
    const focusJustChanged = fk !== lastFocusKey.value
    if (focusJustChanged) {
      expansionPrimed.value = false
      lastFocusKey.value = fk
      expandedTreePaths.value = new Set()
      spineTerminalId.value = PM_TREE_ROOT_ID
      rootFlowLock.value = null
      layoutPositions.value = new Map()
      layoutEdgePaths.value = []
      displayNormLocked.value = false
      applyNarrowAutoRootFlow()
      if (focusId.value && props.factorioData && mapHasExpandableBranches()) {
        if (!needsRootFlowPicker.value) {
          expandedTreePaths.value = new Set([PM_TREE_ROOT_ID])
          expansionPrimed.value = true
        }
      }
    } else if (
      !expansionPrimed.value &&
      expandedTreePaths.value.size === 0 &&
      focusId.value &&
      props.factorioData &&
      mapHasExpandableBranches() &&
      !needsRootFlowPicker.value
    ) {
      expandedTreePaths.value = new Set([PM_TREE_ROOT_ID])
      expansionPrimed.value = true
    }

    if (needsRootFlowPicker.value && expandedTreePaths.value.has(PM_TREE_ROOT_ID)) {
      expandedTreePaths.value = new Set()
      expansionPrimed.value = false
    }

    const { nodes, edges, truncated: t } = graph.value
    truncated.value = t
    if (!focusId.value || nodes.size === 0) {
      contentBounds.value = { minX: 0, minY: 0, maxX: 400, maxY: 280 }
      displayNormLocked.value = false
      layoutPositions.value = new Map()
      layoutEdgePaths.value = []
      return
    }
    const term = clampTreePathToExisting(nodes, spineTerminalId.value)
    if (term !== spineTerminalId.value) {
      spineTerminalId.value = term
    }
    markRepeatMaterialNodes(nodes)
    if (isNarrowStack.value) {
      layoutPositions.value = new Map()
      layoutEdgePaths.value = []
      displayNormLocked.value = false
      return
    }
    const spineSet = spinePathIdsForTerminal(nodes, term)
    const rootId = graph.value.rootInstanceId ?? PM_TREE_ROOT_ID
    const { positions, contentBounds: b, edgePaths: segs } = computeProductionMapFrame(
      nodes,
      edges,
      rootId,
      productionMapLayoutOptions(spineSet)
    )
    const pruned = new Map()
    for (const id of nodes.keys()) {
      const p = positions.get(id)
      if (p) pruned.set(id, p)
    }
    layoutPositions.value = pruned
    layoutEdgePaths.value = segs
    contentBounds.value = b
    if (!displayNormLocked.value) {
      displayNorm.value = { ox: -b.minX, oy: -b.minY }
      displayNormLocked.value = true
    }

    if (focusJustChanged) {
      nextTick(() => {
        requestAnimationFrame(() => {
          wideViewRef.value?.resetZoom?.()
          const vp = viewportRef.value?.getBoundingClientRect()
          const t = wideViewRef.value?.getTransform?.() ?? { x: 0, y: 0, k: 1 }
          if (!vp?.width || !Number.isFinite(t.k) || t.k === 0 || nodes.size === 0) return
          let minY = Infinity
          for (const p of displayPositions.value.values()) {
            if (p && Number.isFinite(p.y)) minY = Math.min(minY, p.y)
          }
          if (!Number.isFinite(minY)) return
          const target = computeTranslateForSpineTerminal({
            terminalId: PM_TREE_ROOT_ID,
            getPosition: pid => displayPositions.value.get(pid),
            minContentY: minY,
            viewportWidth: vp.width,
            viewportHeight: vp.height,
            viewportTop: vp.top,
            k: t.k
          })
          if (!target) return
          wideViewRef.value?.animateTransformTo?.(target.tx, target.ty, t.k, SPINE_PAN_ANIM_MS)
        })
      })
    }
  },
  { deep: false }
)

const nodeEntries = computed(() => [...graph.value.nodes.entries()])

const displayPositions = computed(() => {
  const { ox, oy } = displayNorm.value
  const m = new Map()
  for (const [id, p] of layoutPositions.value) {
    m.set(id, {
      ...p,
      x: p.x + ox,
      y: p.y + oy
    })
  }
  return m
})

const edgePaths = computed(() => {
  const { ox, oy } = displayNorm.value
  const segs = layoutEdgePaths.value
  if (segs.length === 0) return segs
  if (ox === 0 && oy === 0) return segs
  return segs.map(seg => ({
    ...seg,
    d: translateProductionMapPathD(seg.d, ox, oy)
  }))
})

function edgePathStyle(seg) {
  const base = { fill: 'none', strokeWidth: '1.25px' }
  if (seg.kind === 'link') {
    return {
      ...base,
      stroke: seg.stroke || '#9a9a9a',
      opacity: 0.55,
      strokeDasharray: '5 4'
    }
  }
  if (seg.stroke) {
    return { ...base, stroke: seg.stroke, opacity: 0.92 }
  }
  return { ...base, stroke: '#8a8a8a', opacity: 0.85 }
}

const svgSize = computed(() => {
  const b = contentBounds.value
  const { ox, oy } = displayNorm.value
  const w = Math.max(120, b.maxX + ox - (b.minX + ox))
  const h = Math.max(100, b.maxY + oy - (b.minY + oy))
  return { w, h }
})

const zoomLayerSizeStyle = computed(() => ({
  width: `${svgSize.value.w}px`,
  height: `${svgSize.value.h}px`,
  position: 'relative'
}))

function cardStyle(id) {
  const p = displayPositions.value.get(id)
  if (!p) {
    return { display: 'none' }
  }
  return {
    left: `${p.x}px`,
    top: `${p.y}px`,
    width: `${p.width}px`,
    minHeight: `${p.height}px`
  }
}

function showExpandChevron(id, node) {
  if (node.kind === 'material') {
    const vf = visibilityFilter.value
    const pk = node.prototypeKey
    if (id === PM_TREE_ROOT_ID) {
      return (
        materialHasExpandableRecipes(props.factorioData, pk, vf) ||
        materialHasExpandableConsumers(props.factorioData, pk, vf)
      )
    }
    if (node.flowDir === 'right') {
      return materialHasExpandableRecipes(props.factorioData, pk, vf)
    }
    if (node.flowDir === 'left') {
      return materialHasExpandableConsumers(props.factorioData, pk, vf)
    }
    return false
  }
  if (node.kind === 'recipe') {
    const vf = visibilityFilter.value
    const nm = node.name
    const ing = recipeHasExpandableIngredients(props.factorioData, nm, vf)
    const prod = recipeHasExpandableProducts(props.factorioData, nm, vf)
    if (id === PM_TREE_ROOT_ID) {
      return ing || prod
    }
    if (node.flowDir === 'right') return ing
    if (node.flowDir === 'left') return prod
    return false
  }
  return false
}

function applySpineClick(path) {
  const nodes = graph.value.nodes
  if (!nodes.has(path)) return
  const term = clampTreePathToExisting(nodes, spineTerminalId.value)
  const spineSet = spinePathIdsForTerminal(nodes, term)
  if (spineSet.has(path)) {
    const parent = nodes.get(path)?.parentInstanceId
    const nextTerminal = parent == null ? PM_TREE_ROOT_ID : parent
    spineTerminalId.value = nextTerminal
    expandedTreePaths.value = expandedPathsForSpineTerminal(nextTerminal)
  } else {
    spineTerminalId.value = path
    expandedTreePaths.value = expandedPathsForSpineTerminal(path)
  }
}

let resizeObserver = null

onUnmounted(() => {
  clearClickTimer()
  clearLongPress()
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  viewportRef,
  el => {
    resizeObserver?.disconnect()
    resizeObserver = null
    if (el) {
      resizeObserver = new ResizeObserver(() => syncNarrowStack())
      resizeObserver.observe(el)
    }
    syncNarrowStack()
    nextTick(() => {
      if (!isNarrowStack.value) {
        wideViewRef.value?.bind?.()
      }
    })
  },
  { flush: 'post' }
)

watch(isNarrowStack, narrow => {
  if (!narrow) {
    nextTick(() => wideViewRef.value?.bind?.())
  }
})

function onResetZoom() {
  wideViewRef.value?.resetZoom?.()
}

function onResetExpansion() {
  const next = new Set()
  if (focusId.value && props.factorioData && mapHasExpandableBranches() && !needsRootFlowPicker.value) {
    next.add(PM_TREE_ROOT_ID)
  }
  expandedTreePaths.value = next
  spineTerminalId.value = PM_TREE_ROOT_ID
  expansionPrimed.value = next.size > 0
}

const SINGLE_CLICK_MS = 280
const LONG_PRESS_MS = 520
const MOVE_CANCEL_PX = 12

let clickTimer = null
let longPressTimer = null
let pressStart = null
let suppressNextClick = false

function clearClickTimer() {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }
}

function clearLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function emitSelect(node) {
  if (node.kind === 'material') {
    emit('select-entry', { type: node.type, name: node.name })
  } else if (node.kind === 'recipe') {
    emit('select-entry', { type: 'recipe', name: node.name })
  }
}

function onNodePointerDown(e, _id, node) {
  if (e.button !== 0) return
  clearLongPress()
  pressStart = { x: e.clientX, y: e.clientY, node }
  longPressTimer = window.setTimeout(() => {
    longPressTimer = null
    suppressNextClick = true
    emitSelect(node)
  }, LONG_PRESS_MS)
}

function onNodePointerMove(e) {
  if (!pressStart) return
  const dx = e.clientX - pressStart.x
  const dy = e.clientY - pressStart.y
  if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
    clearLongPress()
  }
}

function onNodePointerUp() {
  clearLongPress()
  pressStart = null
}

function onNodePointerCancel() {
  clearLongPress()
  pressStart = null
}

/** Spine-changing clicks: animate pan so the spine **terminal** is centered horizontally; vertical pan keeps the graph top aligned (not vertically centered). */
function onNodeClick(e, id, _node) {
  if (suppressNextClick) {
    suppressNextClick = false
    return
  }
  if (e.detail >= 2) {
    clearClickTimer()
    return
  }
  clearClickTimer()
  clickTimer = window.setTimeout(() => {
    clickTimer = null
    applySpineClick(id)
    if (isNarrowStack.value) return
    nextTick(() => {
      requestAnimationFrame(() => {
        const nodes = graph.value.nodes
        const vp = viewportRef.value?.getBoundingClientRect()
        const t = wideViewRef.value?.getTransform?.() ?? { x: 0, y: 0, k: 1 }
        if (!vp?.width || !Number.isFinite(t.k) || t.k === 0 || nodes.size === 0) return
        const term = clampTreePathToExisting(nodes, spineTerminalId.value)
        let minY = Infinity
        for (const p of displayPositions.value.values()) {
          if (p && Number.isFinite(p.y)) minY = Math.min(minY, p.y)
        }
        if (!Number.isFinite(minY)) return
        const target = computeTranslateForSpineTerminal({
          terminalId: term,
          getPosition: pid => displayPositions.value.get(pid),
          minContentY: minY,
          viewportWidth: vp.width,
          viewportHeight: vp.height,
          viewportTop: vp.top,
          k: t.k
        })
        if (!target) return
        wideViewRef.value?.animateTransformTo?.(target.tx, target.ty, t.k, SPINE_PAN_ANIM_MS)
      })
    })
  }, SINGLE_CLICK_MS)
}

function onNodeDblClick(_e, node) {
  clearClickTimer()
  emitSelect(node)
}

function onViewportPointerDown() {
  clearLongPress()
  pressStart = null
}

function onViewportPointerMove() {
  /* pan handled by d3 */
}

function onViewportPointerUp() {
  clearLongPress()
}
</script>

<style module>
@import './factoriopediaSharedPrimitives.css';

.host {
  margin: 10px 0 14px;
  padding: 8px;
  background: #3d3d3d;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
}

/* Tooltip.vue wraps the trigger in span.tooltip-trigger — avoid breaking card flex layout */
.host :deep(span.tooltip-trigger) {
  display: contents;
}

.hostFill {
  margin: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 6px;
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.headerCompact {
  justify-content: flex-end;
}

.title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #e8e8e8;
}

.headerActions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.headerBtn {
  padding: 4px 8px;
  font-size: 11px;
}

.hint {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.35;
  color: #b0b0b0;
}

.warn {
  margin: 0 0 6px;
  font-size: 11px;
  color: #e8c060;
}

.empty {
  font-size: 12px;
  color: #aaa;
  padding: 12px 4px;
}

.softNote {
  margin: 0 0 6px;
  font-size: 11px;
  line-height: 1.35;
  color: #a0a0a0;
}

.viewport {
  position: relative;
  height: min(320px, 45vh);
  min-height: 180px;
  overflow: hidden;
  background: #333;
  border: 1px solid #222;
  border-radius: 3px;
  touch-action: none;
}

.viewportFill {
  flex: 1;
  min-height: 220px;
  height: auto;
}

.viewportStack {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: auto;
  min-height: min(320px, 45vh);
  max-height: min(72vh, 100%);
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
  background: #333;
  border: 1px solid #222;
  border-radius: 3px;
}

.viewportStack.viewportFill {
  max-height: none;
  flex: 1;
  min-height: 220px;
}

/* Narrow stack cards: shared class names from narrowCardClassList (wide graph cards live in ProductionMapWideView). */
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
  position: relative;
  z-index: auto;
}

.cardStack {
  width: 100%;
  max-width: 100%;
  min-width: 0;
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

.cardHasLink {
  box-shadow: 0 0 0 1px rgba(200, 180, 120, 0.35);
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
