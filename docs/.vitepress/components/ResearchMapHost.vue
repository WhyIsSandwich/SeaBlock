<template>
  <div
    :class="[
      $style.host,
      showDetailsAside ? $style.hostWithDetails : '',
      fillParent ? $style.hostFillParent : ''
    ]"
  >
    <section
      :class="[
        $style.mapPane,
        showDetailsAside && $style.mapPaneWithAside,
        isNarrowViewport && $style.mapPaneNarrow
      ]"
    >
      <header :class="$style.panelHeader">
        <h3 :class="$style.title">{{ titleText }}</h3>
        <div :class="$style.headerActions">
          <button
            type="button"
            :class="[$style.headerButton, 'fpio-button-chrome']"
            title="Zoom out"
            @click="handleZoomOut"
          >
            -
          </button>
          <button
            type="button"
            :class="[$style.headerButton, 'fpio-button-chrome']"
            title="Zoom in"
            @click="handleZoomIn"
          >
            +
          </button>
          <button
            type="button"
            :class="[$style.headerButton, 'fpio-button-chrome']"
            title="Reset map zoom to default and center on the selected technology"
            @click="handleZoomReset"
          >
            Reset
          </button>
          <button
            v-if="showOpenInFactoriopediaButton"
            type="button"
            :class="[$style.headerButton, 'fpio-button-chrome']"
            :disabled="!selectedTechnologyName"
            :title="
              selectedTechnologyName
                ? 'Open this technology in Factoriopedia'
                : 'Select a technology on the map first'
            "
            @click="openInFactoriopedia"
          >
            Open in Factoriopedia
          </button>
          <button
            v-if="!isNarrowViewport"
            type="button"
            :class="[$style.headerButton, 'fpio-button-chrome']"
            :title="detailsCollapsed ? 'Show details panel' : 'Hide details panel'"
            @click="detailsCollapsed = !detailsCollapsed"
          >
            {{ detailsCollapsed ? 'Show details' : 'Hide details' }}
          </button>
        </div>
      </header>
      <p :class="$style.hint">
        <template v-if="isNarrowViewport">
          Click a technology card to select it. Use Open in Factoriopedia for full details.
        </template>
        <template v-else>
          Click any technology card to select it and redraw the map for that technology. Links in the
          details pane open Factoriopedia.
        </template>
      </p>
      <div v-if="!graph || !layoutView" :class="$style.empty">No visible technologies found.</div>
      <div v-else :class="$style.graphWrap">
        <div ref="graphViewportRef" :class="$style.graphViewport">
          <div ref="graphZoomLayerRef" :class="$style.graphZoomLayer" :style="graphZoomLayerStyle">
            <svg
              :class="$style.edgeSvg"
              :width="layoutView.width"
              :height="layoutView.height"
              aria-hidden="true"
            >
              <path
                v-for="seg in routedEdgesDisplay"
                :key="`${seg.from}\0${seg.to}`"
                :d="seg.path"
                :class="[
                  $style.edgePath,
                  highlightedEdgeKeys.has(`${seg.from}\0${seg.to}`) && $style.edgePathHighlighted
                ]"
              />
              <path
                v-if="hiddenDirectStubPath"
                :d="hiddenDirectStubPath"
                :class="$style.edgePathOffTree"
              />
            </svg>
            <div :class="$style.layers" :style="layersStyle">
              <Tooltip
                v-for="name in allLayoutNodeNames"
                :key="name"
                :item-id="name"
                category="technology"
                :focusable-trigger="false"
                :style="cardStylesByName.get(name)"
              >
                <button
                  type="button"
                  :class="[
                    $style.techCard,
                    { [$style.techCardTarget]: name === selectedTechnologyName },
                    { [$style.techCardHover]: hoveredTech === name }
                  ]"
                  :title="displayName(name)"
                  @mouseenter="hoveredTech = name"
                  @mouseleave="hoveredTech = null"
                  @click="selectedTechnologyName = name"
                >
                  <div :class="$style.techIconPanel">
                    <div :class="[$style.spriteIconSlot, $style.spriteIconSlotTech]">
                      <SpriteIcon
                        :sprite-key="`technology-${name}`"
                        :size="spriteLayoutSizes.tech"
                        :title="displayName(name)"
                      />
                    </div>
                  </div>
                  <div
                    :class="$style.techTitle"
                    :title="displayName(name)"
                  >
                    {{ displayName(name) }}
                  </div>
                  <div
                    v-if="name === selectedTechnologyName && hiddenDirectCount > 0"
                    :class="$style.offTreeBadge"
                    :title="`${hiddenDirectCount} direct descendant(s) continue off-tree`"
                  >
                    +{{ hiddenDirectCount }} off-tree
                  </div>
                  <div :class="$style.scienceStrip">
                    <div
                      v-for="ing in ingredientsFor(name)"
                      :key="ing[0]"
                      :class="[$style.spriteIconSlot, $style.spriteIconSlotScience]"
                    >
                      <SpriteIcon :sprite-key="`item-${ing[0]}`" :size="spriteLayoutSizes.science" />
                    </div>
                  </div>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
        <div
          v-if="minimapViewportWorld"
          :class="$style.minimap"
          role="region"
          aria-label="Map overview — click to pan the view"
          @click.stop="onMinimapClick"
        >
          <svg
            :class="$style.minimapSvg"
            :viewBox="`0 0 ${layoutView.width} ${layoutView.height}`"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect
              x="0"
              y="0"
              :width="layoutView.width"
              :height="layoutView.height"
              :class="$style.minimapGraphBg"
            />
            <rect
              v-for="cell in minimapNodeRects"
              :key="cell.name"
              :x="cell.x"
              :y="cell.y"
              :width="cell.width"
              :height="cell.height"
              :class="cell.isTarget ? $style.minimapNodeTarget : $style.minimapNode"
            />
            <rect
              :x="minimapViewportWorld.left"
              :y="minimapViewportWorld.top"
              :width="minimapViewportWorld.width"
              :height="minimapViewportWorld.height"
              :class="$style.minimapViewportRect"
            />
          </svg>
        </div>
      </div>
    </section>

    <aside v-if="showDetailsAside" :class="$style.detailsPane">
      <DetailsPane
        :name="selectedTechnologyName"
        type="technology"
        :science-pack-visibility="null"
        :is-animation-paused="false"
        :can-go-back="false"
        :can-go-forward="false"
        :show-history-dropdown="false"
        :history-items="[]"
        :show-technology-action="renderedInsideFactoriopedia"
        technology-action-label="Open in Factoriopedia"
        technology-action-title="Open this technology in Factoriopedia"
        @open-tech-tree="handleDetailsPaneTechnologyAction"
      />
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useRouter, withBase } from 'vitepress'

import { useFactorioData } from '../../../src/index.js'
import { useD3GraphZoom } from '../../../src/composables/useD3GraphZoom.js'
import {
  computeDagLinkSvgPaths,
  computeResearchMapLayout,
  computeRoutedOrthogonalPaths,
  RESEARCH_MAP_CARD_WIDTH,
  RESEARCH_MAP_CARD_HEIGHT,
  RESEARCH_MAP_ROW_GAP,
  RESEARCH_MAP_MIN_CENTER_GAP,
  RESEARCH_MAP_PAD,
  RESEARCH_MAP_EDGE_GUTTER_LANE_PX,
  RESEARCH_MAP_EDGE_GUTTER_LANE_MAX_PX,
  RESEARCH_MAP_EDGE_GUTTER_MARGIN_PX,
  RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX
} from '../../../src/utils/researchMapLayout.js'
import { isHiddenFactorioPrototype } from '../../../src/utils/factorioPrototypeVisibility.js'

import DetailsPane from './DetailsPane.vue'
import SpriteIcon from './SpriteIcon.vue'
import Tooltip from './Tooltip.vue'

const props = defineProps({
  technologyName: {
    type: String,
    default: ''
  },
  showFactoriopediaLink: {
    type: Boolean,
    default: false
  },
  factoriopediaPath: {
    type: String,
    default: '/reference/factoriopedia'
  },
  renderedInsideFactoriopedia: {
    type: Boolean,
    default: false
  },
  /** When true, fill a flex parent (e.g. modal or viewport-tall page) instead of a fixed min(70vh, …) block. */
  fillParent: {
    type: Boolean,
    default: false
  }
})

const { organizedData, loadAllData } = useFactorioData()
const router = useRouter()

/** Aligned with CSS stacked layout — hide DetailsPane and use Factoriopedia CTA only. */
const NARROW_BREAKPOINT = '(max-width: 1080px)'
const isNarrowViewport = ref(false)
const detailsCollapsed = ref(false)
let narrowMql = null

function syncNarrowViewport() {
  if (typeof window === 'undefined' || !narrowMql) return
  isNarrowViewport.value = narrowMql.matches
  if (narrowMql.matches) {
    detailsCollapsed.value = false
  }
}

const showDetailsAside = computed(
  () => !isNarrowViewport.value && !detailsCollapsed.value
)

const showOpenInFactoriopediaButton = computed(
  () => props.showFactoriopediaLink || isNarrowViewport.value
)

const FACTORIOPEDIA_HASH_TYPES = new Set(['item', 'recipe', 'technology', 'fluid', 'tile'])

function factoriopediaUrlForSelection(type, name) {
  if (typeof window === 'undefined') return ''
  const canonicalPath = props.factoriopediaPath.endsWith('.html')
    ? props.factoriopediaPath
    : `${props.factoriopediaPath}.html`
  const nextUrl = new URL(withBase(canonicalPath), window.location.origin)
  nextUrl.hash = `${type}=${encodeURIComponent(name)}`
  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
}

function navigateSelectionToFactoriopedia(type, name) {
  if (!type || !name || !FACTORIOPEDIA_HASH_TYPES.has(type)) return
  router.go(factoriopediaUrlForSelection(type, name))
}

function onSelectItemFromRichText(type, name) {
  navigateSelectionToFactoriopedia(type, name)
}

provide('onSelectItem', onSelectItemFromRichText)
provide('onItemSelected', onSelectItemFromRichText)

const hoveredTech = ref(null)
const selectedTechnologyName = ref('')
const graphViewportRef = ref(null)
const graphZoomLayerRef = ref(null)
const graphViewTransform = ref({ x: 0, y: 0, k: 1 })
const viewportWidth = ref(0)
const viewportHeight = ref(0)
let viewportResizeObserver = null
let centerRafId = null
let skipLayoutViewRecenter = false
/** Default map scale (layout); d3 pan/zoom is reset to identity separately. */
const DEFAULT_LAYOUT_ZOOM = 1
const layoutZoom = ref(DEFAULT_LAYOUT_ZOOM)
const LAYOUT_ZOOM_MIN = 0.35
const LAYOUT_ZOOM_MAX = 3

/** One `em` on `.graphZoomLayer` = MAP_EM_PX × layoutZoom (px); node UI uses `em` so it tracks zoom. */
const MAP_EM_PX = 10

const LAYOUT_OPTIONS = computed(() => {
  const z = layoutZoom.value
  return {
    cardWidth: Math.max(32, Math.round(RESEARCH_MAP_CARD_WIDTH * z)),
    cardHeight: Math.max(40, Math.round(RESEARCH_MAP_CARD_HEIGHT * z)),
    rowGap: Math.max(8, Math.round(RESEARCH_MAP_ROW_GAP * z)),
    minCenterGap: Math.max(8, Math.round(RESEARCH_MAP_MIN_CENTER_GAP * z)),
    pad: Math.max(4, Math.round(RESEARCH_MAP_PAD * z))
  }
})

const ROUTING_OPTIONS = computed(() => {
  const z = layoutZoom.value
  return {
    gutterLanePx: Math.max(2, RESEARCH_MAP_EDGE_GUTTER_LANE_PX * z),
    gutterLaneMaxPx: Math.max(2, RESEARCH_MAP_EDGE_GUTTER_LANE_MAX_PX * z),
    gutterMarginPx: Math.max(2, RESEARCH_MAP_EDGE_GUTTER_MARGIN_PX * z),
    portStubMinPx: Math.max(4, RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX * z)
  }
})

const MAP_CHROME = computed(() => {
  const z = layoutZoom.value
  return {
    hiddenStubMargin: Math.max(2, 8 * z),
    hiddenStubLen: Math.max(10, 22 * z)
  }
})

/** Slot size in em (48px and 16px at zoom 1 when MAP_EM_PX = 10). */
const SPRITE_TECH_EM = 4.8
const SPRITE_SCIENCE_EM = 1.6

/** SpriteIcon still needs px; keep in sync with em slots: round(SPRITE_*_EM × MAP_EM_PX × z). */
const spriteLayoutSizes = computed(() => {
  const z = layoutZoom.value
  return {
    tech: Math.max(12, Math.round(SPRITE_TECH_EM * MAP_EM_PX * z)),
    science: Math.max(8, Math.round(SPRITE_SCIENCE_EM * MAP_EM_PX * z))
  }
})

/**
 * Convert `translate(x,y) scale(k)` on the zoom layer to `translate(x',y') scale(1)` with the same
 * visible map (same layer coords under viewport center). Needed when layout zoom is clamped but d3
 * still applied k ≠ 1 — using raw x,y with k forced to 1 drifts the view (e.g. toward top-left).
 */
function flattenGestureTransformToScale1(x, y, k, vw, vh) {
  if (vw <= 0 || vh <= 0 || !Number.isFinite(k) || Math.abs(k) < 1e-9) {
    return { x, y }
  }
  return {
    x: vw / 2 - (vw / 2 - x) / k,
    y: vh / 2 - (vh / 2 - y) / k
  }
}

function commitLayoutZoomAfterGesture({ x, y, k }) {
  if (Math.abs(k - 1) < 0.008) return
  const previousZoom = layoutZoom.value
  const nextZoom = Math.min(LAYOUT_ZOOM_MAX, Math.max(LAYOUT_ZOOM_MIN, previousZoom * k))
  const zoomRatio = nextZoom / previousZoom

  const viewport = graphViewportRef.value
  const rect = viewport?.getBoundingClientRect?.()
  const vw = rect?.width || 0
  const vh = rect?.height || 0

  if (!Number.isFinite(zoomRatio) || Math.abs(zoomRatio - 1) < 1e-6) {
    const { x: x1, y: y1 } = flattenGestureTransformToScale1(x, y, k, vw, vh)
    setGraphTransform(x1, y1, 1)
    bindGraphZoom()
    return
  }

  let committedX = x
  let committedY = y
  if (vw > 0 && vh > 0 && Math.abs(k) > 1e-6) {
    const worldCenterX = (vw / 2 - x) / k
    const worldCenterY = (vh / 2 - y) / k
    committedX = vw / 2 - worldCenterX * zoomRatio
    committedY = vh / 2 - worldCenterY * zoomRatio
  }

  skipLayoutViewRecenter = true
  layoutZoom.value = nextZoom
  nextTick(() => {
    setGraphTransform(committedX, committedY, 1)
    bindGraphZoom()
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        skipLayoutViewRecenter = false
      })
    } else {
      skipLayoutViewRecenter = false
    }
  })
}

const {
  bind: bindGraphZoom,
  reset: resetGraphZoom,
  setTransform: setGraphTransform,
  zoomBy: zoomGraphBy
} = useD3GraphZoom(graphViewportRef, graphZoomLayerRef, {
  onZoomEnd: commitLayoutZoomAfterGesture,
  onTransformChange: t => {
    graphViewTransform.value = t
  }
})

const visibleTechnologies = computed(() => {
  const all = organizedData.value?.technology || {}
  return Object.keys(all)
    .filter(name => !isHiddenFactorioPrototype(all[name]))
    .sort((a, b) => a.localeCompare(b))
})

function parseTechnologyFromHash() {
  if (typeof window === 'undefined') return ''
  const raw = window.location.hash || ''
  if (!raw.startsWith('#technology=')) return ''
  return decodeURIComponent(raw.slice('#technology='.length))
}

function getDefaultTechnology() {
  return visibleTechnologies.value[0] || ''
}

function applySelectionFromHashOrFallback() {
  const fromHash = parseTechnologyFromHash()
  if (fromHash && visibleTechnologies.value.includes(fromHash)) {
    selectedTechnologyName.value = fromHash
    return
  }
  if (props.technologyName && visibleTechnologies.value.includes(props.technologyName)) {
    selectedTechnologyName.value = props.technologyName
    return
  }
  selectedTechnologyName.value = getDefaultTechnology()
}

function updateHashForSelection() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (selectedTechnologyName.value) {
    url.hash = `#technology=${encodeURIComponent(selectedTechnologyName.value)}`
  } else {
    url.hash = ''
  }
  window.history.pushState({}, '', url)
}

function onHashChange() {
  const fromHash = parseTechnologyFromHash()
  if (fromHash && visibleTechnologies.value.includes(fromHash)) {
    selectedTechnologyName.value = fromHash
    return
  }
  selectedTechnologyName.value = getDefaultTechnology()
}

const graph = computed(() => {
  const technologies = organizedData.value?.technology
  if (!technologies || !selectedTechnologyName.value) return null
  return computeResearchMapLayout(
    technologies,
    selectedTechnologyName.value,
    LAYOUT_OPTIONS.value
  )
})

const allLayoutNodeNames = computed(() => {
  const g = graph.value
  if (!g?.nodes) return []
  return [...g.nodes].sort((a, b) => a.localeCompare(b))
})

const layoutView = computed(() => {
  const g = graph.value
  if (!g?.nodeLayouts?.size || g.nodes.size === 0) return null
  let minTop = Infinity
  for (const name of g.nodes) {
    const nl = g.nodeLayouts.get(name)
    if (nl) minTop = Math.min(minTop, nl.top)
  }
  if (!Number.isFinite(minTop)) return null
  const offsetY = minTop
  let maxBottom = 0
  for (const name of g.nodes) {
    const nl = g.nodeLayouts.get(name)
    if (nl) maxBottom = Math.max(maxBottom, nl.top + nl.height - offsetY)
  }
  const pad = g.layoutConstants.pad
  return {
    offsetY,
    width: g.contentWidth,
    height: maxBottom + pad,
    pad
  }
})

const minimapViewportWorld = computed(() => {
  const lv = layoutView.value
  const tw = viewportWidth.value
  const th = viewportHeight.value
  const { x: tx, y: ty, k } = graphViewTransform.value
  if (!lv || tw <= 0 || th <= 0 || !Number.isFinite(k) || Math.abs(k) < 1e-9) return null
  return {
    left: -tx / k,
    top: -ty / k,
    width: tw / k,
    height: th / k
  }
})

/** Static “zoomed-out” node blocks in minimap coords; only recomputes when layout/graph changes, not on pan. */
const minimapNodeRects = computed(() => {
  const g = graph.value
  const lv = layoutView.value
  if (!g?.nodeLayouts?.size || !lv) return []
  const sel = selectedTechnologyName.value
  const out = []
  for (const name of g.nodes) {
    const nl = g.nodeLayouts.get(name)
    if (!nl) continue
    out.push({
      name,
      x: nl.left,
      y: nl.top - lv.offsetY,
      width: nl.width,
      height: nl.height,
      isTarget: name === sel
    })
  }
  return out
})

function onMinimapClick(event) {
  const lv = layoutView.value
  const vp = graphViewportRef.value
  if (!lv || !vp) return
  const svg = event.currentTarget?.querySelector?.('svg')
  if (!svg || typeof svg.createSVGPoint !== 'function') return
  const pt = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return
  const cur = pt.matrixTransform(ctm.inverse())
  const wx = cur.x
  const wy = cur.y
  const { k } = graphViewTransform.value
  const tw = viewportWidth.value || vp.clientWidth
  const th = viewportHeight.value || vp.clientHeight
  if (tw <= 0 || th <= 0 || !Number.isFinite(k) || Math.abs(k) < 1e-9) return
  const tx = tw / 2 - wx * k
  const ty = th / 2 - wy * k
  setGraphTransform(tx, ty, k)
  bindGraphZoom()
}

const graphZoomLayerStyle = computed(() => {
  const lv = layoutView.value
  const z = layoutZoom.value
  if (!lv) return {}
  return {
    width: `${lv.width}px`,
    minHeight: `${lv.height}px`,
    fontSize: `${MAP_EM_PX * z}px`
  }
})

const layersStyle = computed(() => {
  const lv = layoutView.value
  if (!lv) return {}
  return {
    position: 'relative',
    width: '100%',
    minHeight: `${lv.height}px`
  }
})

function cardStyleFor(name, g, lv) {
  if (!g || !lv) return null
  const nl = g.nodeLayouts.get(name)
  if (!nl) return null
  return {
    position: 'absolute',
    left: `${nl.left}px`,
    top: `${nl.top - lv.offsetY}px`,
    width: `${nl.width}px`,
    height: `${nl.height}px`
  }
}

const cardStylesByName = computed(() => {
  const g = graph.value
  const lv = layoutView.value
  const out = new Map()
  if (!g || !lv) return out
  for (const name of allLayoutNodeNames.value) {
    const style = cardStyleFor(name, g, lv)
    if (style) out.set(name, style)
  }
  return out
})

const mapChrome = computed(() => ({
  hiddenStubMargin: MAP_CHROME.value.hiddenStubMargin,
  hiddenStubLen: MAP_CHROME.value.hiddenStubLen
}))

const routedEdges = computed(() => {
  const g = graph.value
  const lv = layoutView.value
  if (!g || !lv) return []
  const edges = []
  for (const [from, to] of g.edges) {
    if (!g.nodes.has(from) || !g.nodes.has(to)) continue
    edges.push([from, to])
  }
  if (g.dag && g.dagBBox) {
    return computeDagLinkSvgPaths(
      g.dag,
      edges,
      g.nodeLayouts,
      lv.offsetY,
      g.dagBBox,
      g.rankOf,
      g.maxRank,
      ROUTING_OPTIONS.value
    )
  }
  return computeRoutedOrthogonalPaths(edges, g.nodeLayouts, lv.offsetY, ROUTING_OPTIONS.value)
})

const routedEdgesDisplay = computed(() => {
  const h = hoveredTech.value
  const segs = routedEdges.value
  if (!h) return segs
  const low = []
  const hi = []
  for (const s of segs) {
    const on = s.from === h || s.to === h
    ;(on ? hi : low).push(s)
  }
  return [...low, ...hi]
})

const highlightedEdgeKeys = computed(() => {
  const h = hoveredTech.value
  if (!h) return new Set()
  const keys = new Set()
  for (const s of routedEdges.value) {
    if (s.from === h || s.to === h) keys.add(`${s.from}\0${s.to}`)
  }
  return keys
})

const titleText = computed(() => {
  const name = selectedTechnologyName.value
  if (!name) return 'Research map'
  return `Research map — ${displayName(name)}`
})

const hiddenDirectCount = computed(() => {
  const g = graph.value
  return g?.descendantWindow?.hiddenDirectDescendants?.length || 0
})

const hiddenDirectStubPath = computed(() => {
  const g = graph.value
  const lv = layoutView.value
  if (!g || !lv || hiddenDirectCount.value <= 0) return ''
  const selectedLayout = g.nodeLayouts?.get(selectedTechnologyName.value)
  if (!selectedLayout) return ''
  const margin = mapChrome.value.hiddenStubMargin
  const stubLen = mapChrome.value.hiddenStubLen
  const x = selectedLayout.centerX
  const yTop = selectedLayout.top + selectedLayout.height - lv.offsetY
  const yBottom = Math.min(lv.height - margin, yTop + stubLen)
  return `M ${x} ${yTop} L ${x} ${yBottom}`
})

function displayName(name) {
  const technologies = organizedData.value?.technology || {}
  return technologies[name]?.displayName || name
}

function ingredientsFor(name) {
  const technologies = organizedData.value?.technology || {}
  return technologies[name]?.unit?.ingredients || []
}

function openInFactoriopedia() {
  if (typeof window === 'undefined' || !selectedTechnologyName.value) return
  router.go(factoriopediaUrlForSelection('technology', selectedTechnologyName.value))
}

function handleDetailsPaneTechnologyAction() {
  if (props.renderedInsideFactoriopedia) {
    openInFactoriopedia()
  }
}

function handleZoomIn() {
  zoomGraphBy(1.15)
}

function handleZoomOut() {
  zoomGraphBy(1 / 1.15)
}

function handleZoomReset() {
  skipLayoutViewRecenter = true
  layoutZoom.value = DEFAULT_LAYOUT_ZOOM
  nextTick(() => {
    resetGraphZoom()
    bindGraphZoom()
    scheduleCenterSelection()
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        skipLayoutViewRecenter = false
      })
    } else {
      skipLayoutViewRecenter = false
    }
  })
}

function centerSelectionInViewport() {
  const g = graph.value
  const lv = layoutView.value
  const viewport = graphViewportRef.value
  const selected = selectedTechnologyName.value
  if (!g || !lv || !viewport || !selected) return
  const nl = g.nodeLayouts.get(selected)
  if (!nl) return

  const viewportRect = viewport.getBoundingClientRect()
  const viewportWidth = viewportRect.width || 0
  const viewportHeight = viewportRect.height || 0
  if (viewportWidth <= 0 || viewportHeight <= 0) return

  const nodeCenterX = nl.centerX
  const nodeCenterY = nl.top - lv.offsetY + nl.height / 2

  const x = viewportWidth / 2 - nodeCenterX
  const centeredY = viewportHeight / 2 - nodeCenterY
  const minY = Math.min(0, viewportHeight - lv.height)
  const y = Math.max(minY, Math.min(0, centeredY))

  setGraphTransform(x, y, 1)
}

function scheduleCenterSelection() {
  if (typeof window === 'undefined') return
  if (centerRafId !== null) {
    window.cancelAnimationFrame(centerRafId)
    centerRafId = null
  }
  centerRafId = window.requestAnimationFrame(() => {
    centerRafId = window.requestAnimationFrame(() => {
      centerRafId = null
      centerSelectionInViewport()
    })
  })
}

watch(
  () => selectedTechnologyName.value,
  (nextName, prevName) => {
    if (!nextName || nextName === prevName) return
    updateHashForSelection()
    hoveredTech.value = null
    layoutZoom.value = DEFAULT_LAYOUT_ZOOM
    nextTick(() => {
      resetGraphZoom()
      bindGraphZoom()
      scheduleCenterSelection()
    })
  }
)

watch(
  () => layoutView.value,
  lv => {
    if (!lv) return
    if (skipLayoutViewRecenter) return
    nextTick(() => {
      bindGraphZoom()
    })
  }
)

onMounted(async () => {
  if (
    !organizedData.value?.technology ||
    Object.keys(organizedData.value.technology).length === 0
  ) {
    await loadAllData('en')
  }
  applySelectionFromHashOrFallback()
  nextTick(() => {
    bindGraphZoom()
    scheduleCenterSelection()
    if (typeof ResizeObserver !== 'undefined' && graphViewportRef.value) {
      const syncViewportSize = () => {
        const el = graphViewportRef.value
        if (el) {
          viewportWidth.value = el.clientWidth
          viewportHeight.value = el.clientHeight
        }
      }
      syncViewportSize()
      viewportResizeObserver = new ResizeObserver(() => {
        syncViewportSize()
        bindGraphZoom()
      })
      viewportResizeObserver.observe(graphViewportRef.value)
    }
  })
  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate', onHashChange)
    narrowMql = window.matchMedia(NARROW_BREAKPOINT)
    syncNarrowViewport()
    narrowMql.addEventListener('change', syncNarrowViewport)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('hashchange', onHashChange)
    window.removeEventListener('popstate', onHashChange)
    if (centerRafId !== null) {
      window.cancelAnimationFrame(centerRafId)
      centerRafId = null
    }
  }
  if (viewportResizeObserver) {
    viewportResizeObserver.disconnect()
    viewportResizeObserver = null
  }
  if (typeof window !== 'undefined' && narrowMql) {
    narrowMql.removeEventListener('change', syncNarrowViewport)
    narrowMql = null
  }
})
</script>

<style module>
.host {
  display: grid;
  grid-template-columns: 1fr;
  box-sizing: border-box;
  min-height: 0;
  height: min(70vh, calc(100dvh - 9rem));
  max-height: min(70vh, calc(100dvh - 9rem));
  overflow: hidden;
  background: #212121;
  border: 1px solid #3c3c3c;
}

.host.hostFillParent {
  height: auto;
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  align-self: stretch;
}

.hostWithDetails {
  grid-template-columns: minmax(0, 2fr) minmax(280px, 0.85fr);
  align-items: stretch;
}

.mapPane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mapPaneWithAside {
  border-right: 1px solid #3c3c3c;
}

.mapPaneNarrow {
  border-bottom: 1px solid #3c3c3c;
}

.detailsPane {
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-height: none;
  overflow: auto;
}

.panelHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #3f3f3f;
  background: linear-gradient(to bottom, #2f2f2f, #262626);
}

.title {
  margin: 0;
  color: #e0d2bd;
  font-size: 16px;
}

.headerActions {
  display: inline-flex;
  gap: 8px;
}

.headerButton {
  font-size: 11px;
  padding: 4px 8px;
}

.headerButton:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.hint {
  margin: 0;
  padding: 8px 12px;
  font-size: 12px;
  color: #a0a0a0;
}

.empty {
  padding: 12px;
  color: #d0d0d0;
}

.graphWrap {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 8px 0 12px;
  width: 100%;
}

.graphViewport {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
  touch-action: none;
  background: rgba(0, 0, 0, 0.2);
}

.minimap {
  position: absolute;
  left: 10px;
  bottom: 14px;
  z-index: 10;
  width: min(176px, 32vw);
  height: 118px;
  border-radius: 4px;
  border: 1px solid #4a4a4a;
  background: rgba(18, 18, 18, 0.94);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  overflow: hidden;
}
.minimapSvg {
  display: block;
  width: 100%;
  height: 100%;
}
.minimapGraphBg {
  fill: rgba(55, 55, 55, 0.4);
  stroke: #5a5a5a;
  stroke-width: 1.25px;
  vector-effect: non-scaling-stroke;
}
.minimapNode {
  fill: rgba(72, 200, 120, 0.28);
  stroke: rgba(0, 0, 0, 0.18);
  stroke-width: 0.35px;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.minimapNodeTarget {
  fill: rgba(232, 192, 64, 0.32);
  stroke: rgba(232, 192, 64, 0.55);
  stroke-width: 0.45px;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.minimapViewportRect {
  fill: rgba(232, 192, 64, 0.14);
  stroke: #e8c040;
  stroke-width: 1.5px;
  vector-effect: non-scaling-stroke;
}

/* `fontSize` on this layer is set inline (MAP_EM_PX × layoutZoom); node CSS uses `em` against it. */
.graphZoomLayer {
  position: relative;
}

.edgeSvg {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 0;
  overflow: visible;
}

.edgePath {
  fill: none;
  stroke: #d8d8d8;
  stroke-width: 0.125em;
  opacity: 0.85;
}

.edgePathHighlighted {
  stroke: #e8c040;
  stroke-width: 0.2em;
  opacity: 1;
}

.edgePathOffTree {
  fill: none;
  stroke: #f0be56;
  stroke-width: 0.2em;
  stroke-dasharray: 0.4em 0.3em;
  opacity: 0.95;
}

.layers {
  position: relative;
  z-index: 1;
}

.layers :global(.tooltip-trigger) {
  display: block;
  font-size: inherit;
}

/*
 * Grid: first row is 1fr so the icon region takes all slack; title + science are auto-sized.
 * Flex column + multiple flex:0 children left spare space at the bottom and made the icon
 * appear to "slide" vertically as zoom/em math shifted vs fixed px sprites.
 */
.techCard {
  /* Buttons use UA font-size by default; must inherit so 1em children track graphZoomLayer fontSize. */
  font-size: inherit;
  font-family: inherit;
  line-height: normal;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  border: 0.1em solid #1a6f3f;
  border-radius: 0;
  background: #00c659;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  grid-auto-rows: auto;
  align-items: stretch;
  justify-items: stretch;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  text-align: left;
  z-index: 1;
}

.techCardTarget {
  box-shadow: 0 0 0 0.1em rgba(188, 146, 80, 0.55);
}

.techCardHover:not(.techCardTarget) {
  box-shadow: 0 0 0 0.1em rgba(159, 243, 184, 0.65);
}

.techIconPanel {
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  align-self: stretch;
  background: #00c659;
  border-bottom: 0.1em solid #0d8c4a;
  padding: 0.35em 0.2em;
  overflow: hidden;
}

.spriteIconSlot {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
}
.spriteIconSlotTech {
  width: 4.8em;
  height: 4.8em;
}
.spriteIconSlotScience {
  width: 1.6em;
  height: 1.6em;
}

.techTitle {
  align-self: stretch;
  box-sizing: border-box;
  min-height: 2.8em;
  max-height: 2.8em;
  font-size: 1em;
  line-height: 1.25;
  color: #083b1f;
  text-align: center;
  background: #00b857;
  border-bottom: 0.1em solid #0d8c4a;
  padding: 0.2em 0.35em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.offTreeBadge {
  align-self: stretch;
  box-sizing: border-box;
  font-size: 0.9em;
  line-height: 1.2;
  color: #083b1f;
  text-align: center;
  background: #9ff3b8;
  border-bottom: 0.1em solid #56c97a;
  padding: 0.1em 0.2em;
  letter-spacing: 0.01em;
}

.scienceStrip {
  align-self: stretch;
  display: flex;
  gap: 0.1em;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
  box-sizing: border-box;
  min-height: 2.4em;
  width: 100%;
  background: #026f27;
  padding: 0.15em 0.2em;
}

@media (max-width: 768px) {
  .techTitle {
    min-height: 3.2em;
    max-height: 3.2em;
  }
}
</style>
