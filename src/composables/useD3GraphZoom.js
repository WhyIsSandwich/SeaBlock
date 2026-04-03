import { onUnmounted } from 'vue'
import { select } from 'd3-selection'
import { zoom, zoomIdentity } from 'd3-zoom'

/**
 * CSS for a layer that mirrors d3-zoom’s transform (HTML/CSS path; SVG can use `g` + `attr('transform')` instead).
 * @param {{ x: number; y: number; k: number }} t
 */
export function zoomTransformToLayerStyle(t) {
  return {
    transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})`,
    transformOrigin: '0 0',
    willChange: 'transform'
  }
}

/**
 * d3-zoom on a viewport element; apply {@link zoomTransformToLayerStyle} to a child so edges and cards move together.
 * Wheel zoom uses Ctrl/Cmd so normal wheel still scrolls the modal panel.
 *
 * @param {import('vue').Ref<HTMLElement | null>} viewportRef
 * @param {import('vue').Ref<HTMLElement | null>} zoomLayerRef
 * @param {{ scaleExtent?: [number, number], onZoomEnd?: (t: { x: number, y: number, k: number }) => void, onTransformChange?: (t: { x: number, y: number, k: number }) => void, zoomFilter?: (event: Event) => boolean }} [options] Optional `zoomFilter`: return true to let d3-zoom handle the event (after base wheel/button rules).
 */
export function useD3GraphZoom(viewportRef, zoomLayerRef, options = {}) {
  const { scaleExtent = [0.35, 3], onZoomEnd, onTransformChange, zoomFilter } = options

  let zoomBehavior = null
  let rootSelection = null
  let currentTransform = { x: 0, y: 0, k: 1 }
  let pendingTransform = null
  let rafId = null
  /** @type {number | null} */
  let transformAnimRaf = null

  function applyLayerTransform(t) {
    currentTransform = t
    onTransformChange?.({ x: t.x, y: t.y, k: t.k })
    const layer = zoomLayerRef?.value
    if (!layer) return
    layer.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.k})`
    layer.style.transformOrigin = '0 0'
    layer.style.willChange = 'transform'
  }

  function flushPendingTransform() {
    if (!pendingTransform) return
    applyLayerTransform(pendingTransform)
    pendingTransform = null
  }

  function scheduleLayerTransform(t) {
    pendingTransform = t
    if (typeof window === 'undefined') {
      flushPendingTransform()
      return
    }
    if (rafId !== null) return
    rafId = window.requestAnimationFrame(() => {
      rafId = null
      flushPendingTransform()
    })
  }

  function onZoomed(event) {
    scheduleLayerTransform({ x: event.transform.x, y: event.transform.y, k: event.transform.k })
  }

  function onZoomEnded(event) {
    if (onZoomEnd) {
      onZoomEnd({ x: event.transform.x, y: event.transform.y, k: event.transform.k })
    }
  }

  function filterWheelForPanelScroll(event) {
    let base
    if (event.type === 'wheel') {
      base = (event.ctrlKey || event.metaKey) && !event.button
    } else {
      base = (!event.ctrlKey || event.type === 'wheel') && !event.button
    }
    if (!base) return false
    if (typeof zoomFilter === 'function' && !zoomFilter(event)) return false
    return true
  }

  function bind() {
    const el = viewportRef.value
    if (!el) return
    if (rootSelection && rootSelection.node() === el) return
    teardown()
    zoomBehavior = zoom()
      .scaleExtent(scaleExtent)
      .filter(filterWheelForPanelScroll)
      .on('zoom', onZoomed)
      .on('end', onZoomEnded)
    rootSelection = select(el)
    rootSelection.call(zoomBehavior)
    rootSelection.call(
      zoomBehavior.transform,
      zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k)
    )
    // Keep zoom interactions explicit (wheel with ctrl/cmd). Double-click zoom fights map recentering.
    rootSelection.on('dblclick.zoom', null)
    applyLayerTransform(currentTransform)
  }

  function cancelTransformAnimation() {
    if (typeof window !== 'undefined' && transformAnimRaf !== null) {
      window.cancelAnimationFrame(transformAnimRaf)
      transformAnimRaf = null
    }
  }

  function teardown() {
    cancelTransformAnimation()
    if (typeof window !== 'undefined' && rafId !== null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
    pendingTransform = null
    if (rootSelection) {
      rootSelection.on('.zoom', null)
      rootSelection = null
    }
    zoomBehavior = null
  }

  function reset() {
    applyLayerTransform({ x: 0, y: 0, k: 1 })
    if (rootSelection && zoomBehavior) {
      rootSelection.call(zoomBehavior.transform, zoomIdentity)
    }
  }

  function setTransform(x, y, k = 1) {
    applyLayerTransform({ x, y, k })
    if (rootSelection && zoomBehavior) {
      rootSelection.call(zoomBehavior.transform, zoomIdentity.translate(x, y).scale(k))
    }
  }

  /**
   * Smoothly interpolate translate (and optional scale) to a target. Cancels any in-flight animation.
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} [targetK]
   * @param {number} [durationMs]
   */
  function animateTransformTo(targetX, targetY, targetK, durationMs = 220) {
    if (typeof window === 'undefined') {
      setTransform(targetX, targetY, targetK ?? currentTransform.k)
      return
    }
    cancelTransformAnimation()
    const kEnd = targetK != null && Number.isFinite(targetK) ? targetK : currentTransform.k
    const x0 = currentTransform.x
    const y0 = currentTransform.y
    const k0 = currentTransform.k
    const t0 = performance.now()
    /** @param {number} t 0..1 */
    function easeOutCubic(t) {
      return 1 - (1 - t) ** 3
    }
    function frame(now) {
      const u = Math.min(1, (now - t0) / durationMs)
      const e = easeOutCubic(u)
      const x = x0 + (targetX - x0) * e
      const y = y0 + (targetY - y0) * e
      const k = k0 + (kEnd - k0) * e
      setTransform(x, y, k)
      if (u < 1) {
        transformAnimRaf = window.requestAnimationFrame(frame)
      } else {
        transformAnimRaf = null
      }
    }
    transformAnimRaf = window.requestAnimationFrame(frame)
  }

  function getTransform() {
    return { ...currentTransform }
  }

  /**
   * Layer content coordinates: children use left/top in the zoom layer’s pre-transform box; layer has translate(tx,ty) scale(k) origin 0,0.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{ lx: number, ly: number } | null}
   */
  function clientToLayerContent(clientX, clientY) {
    const vp = viewportRef.value?.getBoundingClientRect?.()
    if (!vp) return null
    const { x: tx, y: ty, k } = currentTransform
    if (!Number.isFinite(k) || k === 0) return null
    return {
      lx: (clientX - vp.left - tx) / k,
      ly: (clientY - vp.top - ty) / k
    }
  }

  /**
   * Adjust translate so the given layer-content point appears at (clientX, clientY) in viewport client space.
   * @param {number} layerX
   * @param {number} layerY
   * @param {number} clientX
   * @param {number} clientY
   */
  function alignLayerPointToClient(layerX, layerY, clientX, clientY) {
    const vp = viewportRef.value?.getBoundingClientRect?.()
    if (!vp) return
    const { k } = currentTransform
    if (!Number.isFinite(k) || k === 0) return
    const ntx = clientX - vp.left - k * layerX
    const nty = clientY - vp.top - k * layerY
    setTransform(ntx, nty, k)
  }

  function viewportCenter() {
    const rect = viewportRef.value?.getBoundingClientRect?.()
    const cx = rect?.width ? rect.width / 2 : 0
    const cy = rect?.height ? rect.height / 2 : 0
    return [cx, cy]
  }

  function zoomBy(factor, center = null) {
    if (!Number.isFinite(factor) || factor <= 0) return
    if (rootSelection && zoomBehavior) {
      const point = Array.isArray(center) ? center : viewportCenter()
      rootSelection.call(zoomBehavior.scaleBy, factor, point)
      return
    }
    const { x, y, k } = currentTransform
    setTransform(x, y, k * factor)
  }

  function zoomTo(k, center = null) {
    if (!Number.isFinite(k) || k <= 0) return
    if (rootSelection && zoomBehavior) {
      const point = Array.isArray(center) ? center : viewportCenter()
      rootSelection.call(zoomBehavior.scaleTo, k, point)
      return
    }
    const { x, y } = currentTransform
    setTransform(x, y, k)
  }

  onUnmounted(() => teardown())

  return {
    bind,
    reset,
    setTransform,
    animateTransformTo,
    getTransform,
    clientToLayerContent,
    alignLayerPointToClient,
    zoomBy,
    zoomTo,
    teardown
  }
}
