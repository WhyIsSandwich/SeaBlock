/**
 * Coordinate assignment for Sugiyama: vendored d3-dag `coordSimplex` with HiGHS (CPLEX `.lp` bridge).
 *
 * Derived from d3-dag v1.x `src/sugiyama/coord/simplex.ts` (MIT)
 * https://github.com/erikbrinkman/d3-dag
 *
 * @packageDocumentation
 */

import { getResearchMapHighsSync } from './researchMapHighs.js'
import { solveJsLpModelWithHighs } from './researchMapLpHighs.js'

/**
 * @template T
 * @param {T[]} layer
 * @returns {Generator<[T, T]>}
 */
function* bigrams(layer) {
  for (let i = 0; i < layer.length - 1; i++) {
    yield [layer[i], layer[i + 1]]
  }
}

/**
 * @template T, U
 * @param {Iterable<T>} layers
 * @param {(layer: T) => Iterable<U>} fn
 * @returns {Generator<U>}
 */
function* flatMap(layers, fn) {
  for (const layer of layers) {
    yield* fn(layer)
  }
}

/**
 * @param {Iterable<{ children(): Iterable<unknown>, y: number }>} nodes
 */
function avgHeight(nodes) {
  let mean = 0
  let count = 0
  for (const node of nodes) {
    for (const child of node.children()) {
      count++
      const val = child.y - node.y
      mean += (val - mean) / count
    }
  }
  return count ? mean : 1
}

function validateWeights([two, one, zero]) {
  if (two <= 0 || one <= 0 || zero <= 0) {
    throw new Error(`simplex weights must be positive, but got: ${two}, ${one}, ${zero}`)
  }
}

/**
 * @param {readonly unknown[][]} layers
 * @param {readonly [number, number, number] | ((link: unknown) => readonly [number, number, number])} weight
 */
function createCachedSimplexWeightAccessor(layers, weight) {
  if (typeof weight !== 'function') {
    const [two, one, zero] = weight
    return (par, child) => {
      const count = +(par.data.role === 'node') + +(child.data.role === 'node')
      switch (count) {
        case 0:
          return zero
        case 1:
          return one
        case 2:
          return two
        default:
          throw new Error('internal error: invalid simplex weight count')
      }
    }
  }
  const cache = new Map()
  for (const node of flatMap(layers, (l) => l)) {
    if (node.data.role === 'node') {
      const rawNode = node.data.node
      const targets = new Map()
      for (const link of rawNode.childLinks()) {
        const { target } = link
        const vals = weight(link)
        validateWeights(vals)
        targets.set(target, vals)
      }
      cache.set(rawNode, targets)
    }
  }
  return (par, child) => {
    if (par.data.role === 'link') {
      const { source, target } = par.data.link
      const [, one, two] = cache.get(source).get(target)
      return child.data.role === 'link' ? two : one
    }
    if (child.data.role === 'link') {
      const { source, target } = child.data.link
      const [, val] = cache.get(source).get(target)
      return val
    }
    const [val] = cache.get(par.data.node).get(child.data.node)
    return val
  }
}

/**
 * @typedef {object} CoordSimplexWasmOps
 * @property {readonly [number, number, number] | ((link: unknown) => readonly [number, number, number])} weight
 * @property {Record<string, unknown>} highsSolveOptions
 */

/** @param {CoordSimplexWasmOps} opts */
function buildOperator(opts) {
  function coordSimplexWasm(layers, sep) {
    /** @type {Record<string, Record<string, number>>} */
    const variables = {}
    /** @type {Record<string, { min: number }>} */
    const constraints = {}

    const cachedWeight = createCachedSimplexWeightAccessor(layers, opts.weight)

    /** @type {Map<unknown, string>} */
    const ids = new Map()
    let i = 0
    for (const layer of layers) {
      for (const node of layer) {
        if (!ids.has(node)) {
          const id = `${i++}`
          ids.set(node, id)
          variables[id] = {}
        }
      }
    }

    function n(node) {
      return ids.get(node)
    }

    /** Short constraint keys: smaller CPLEX `.lp` for HiGHS; same LP math as stock d3-dag `coordSimplex`. */
    let nextRowId = 0
    function nextConstraintKey() {
      return `r${nextRowId++}`
    }

    for (const layer of layers) {
      for (const [left, right] of bigrams(layer)) {
        const lid = n(left)
        const rid = n(right)
        const cons = nextConstraintKey()
        const separ = sep(left, right)
        constraints[cons] = { min: separ }
        variables[lid][cons] = -1
        variables[rid][cons] = 1
      }
    }

    const heightNorm = avgHeight(ids.keys())

    for (const node of ids.keys()) {
      const nid = n(node)
      for (const child of node.children()) {
        const cid = n(child)
        const slack = nextConstraintKey()

        const pcons = nextConstraintKey()
        constraints[pcons] = { min: 0 }

        const ccons = nextConstraintKey()
        constraints[ccons] = { min: 0 }

        variables[nid][pcons] = 1
        variables[nid][ccons] = -1

        variables[cid][pcons] = -1
        variables[cid][ccons] = 1

        const w = cachedWeight(node, child)
        const height = (child.y - node.y) / heightNorm
        variables[slack] = { opt: w / height, [pcons]: 1, [ccons]: 1 }
      }
    }

    const highs = getResearchMapHighsSync()
    const assignment = solveJsLpModelWithHighs(
      highs,
      'opt',
      'min',
      variables,
      constraints,
      opts.highsSolveOptions
    )

    for (const [node, id] of ids) {
      node.x = assignment[id] ?? 0
    }

    let offset = 0
    let width = 0
    for (const layer of layers) {
      const first = layer[0]
      offset = Math.min(offset, first.x - sep(undefined, first))
      const last = layer[layer.length - 1]
      width = Math.max(width, last.x + sep(last, undefined))
    }

    for (const node of ids.keys()) {
      node.x -= offset
    }

    const maxWidth = width - offset
    if (maxWidth <= 0) {
      throw new Error(
        'must assign nonzero width to at least one node; double check the callback passed to `sugiyama().nodeSize(...)`'
      )
    }
    return maxWidth
  }

  function weight(val) {
    if (val === undefined) {
      return opts.weight
    }
    if (typeof val !== 'function') {
      validateWeights(val)
    }
    return buildOperator({
      ...opts,
      weight: val
    })
  }
  coordSimplexWasm.weight = weight
  coordSimplexWasm.d3dagBuiltin = true

  return coordSimplexWasm
}

/**
 * @typedef {object} CoordSimplexWasmConfig
 * @property {readonly [number, number, number] | ((link: unknown) => readonly [number, number, number])} [weight]
 * @property {Record<string, unknown>} [highsSolveOptions] HiGHS `solve` options (second argument)
 */

/**
 * Vendored coord + HiGHS. Default weights `[1, 2, 8]`.
 * Requires {@link preloadResearchMapHighs} before the first `sugiyama()` run.
 *
 * @param {CoordSimplexWasmConfig} [config]
 */
export function coordSimplexWasm(config) {
  const c = config ?? {}
  return buildOperator({
    weight: c.weight ?? /** @type {const} */ ([1, 2, 8]),
    highsSolveOptions: c.highsSolveOptions && typeof c.highsSolveOptions === 'object' ? c.highsSolveOptions : {}
  })
}
