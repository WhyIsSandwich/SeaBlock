/**
 * Production map graph: incremental expansion over item/fluid/recipe nodes.
 * @module productionMapGraph
 */

import { isHiddenFactorioPrototype } from './factorioPrototypeVisibility.js'

/** @param {'item'|'fluid'} type @param {string} name */
export function materialKey(type, name) {
  const t = type === 'fluid' ? 'fluid' : 'item'
  return `${t}:${name}`
}

/**
 * @param {string} key
 * @returns {{ type: 'item'|'fluid', name: string } | null}
 */
export function parseMaterialKey(key) {
  if (!key || typeof key !== 'string') return null
  const i = key.indexOf(':')
  if (i <= 0) return null
  const prefix = key.slice(0, i)
  const name = key.slice(i + 1)
  if (prefix !== 'item' && prefix !== 'fluid') return null
  return { type: prefix, name }
}

/** @param {string} recipeName */
export function recipeNodeId(recipeName) {
  return `recipe:${recipeName}`
}

/**
 * @param {string} id
 * @returns {{ kind: 'recipe', name: string } | { kind: 'material', type: 'item'|'fluid', name: string } | null}
 */
export function parseNodeId(id) {
  if (!id || typeof id !== 'string') return null
  if (id.startsWith('recipe:')) {
    return { kind: 'recipe', name: id.slice('recipe:'.length) }
  }
  const m = parseMaterialKey(id)
  if (m) return { kind: 'material', type: m.type, name: m.name }
  return null
}

/**
 * @param {Record<string, unknown>} factorioData
 * @returns {Record<string, object>}
 */
function getRecipeMap(factorioData) {
  if (!factorioData) return {}
  return factorioData.recipe || factorioData.recipes || {}
}

/**
 * @param {Record<string, unknown>} factorioData
 * @returns {Record<string, object>}
 */
function getItemMap(factorioData) {
  if (!factorioData) return {}
  return factorioData.item || factorioData.items || {}
}

/**
 * @param {Record<string, unknown>} factorioData
 * @returns {Record<string, object>}
 */
function getFluidMap(factorioData) {
  if (!factorioData) return {}
  return factorioData.fluid || factorioData.fluids || {}
}

/**
 * @param {object} recipe
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 * @returns {boolean}
 */
export function isRecipeUsable(recipe, visibilityFilter) {
  if (!recipe?.name || isHiddenFactorioPrototype(recipe)) return false
  if (visibilityFilter?.isObjectVisible) {
    return visibilityFilter.isObjectVisible('recipe', recipe.name, recipe)
  }
  return true
}

/**
 * @param {'item'|'fluid'} materialType
 * @param {string} materialName
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 * @returns {boolean}
 */
export function isMaterialUsable(materialType, materialName, visibilityFilter) {
  if (!materialName) return false
  if (visibilityFilter?.isObjectVisible) {
    return visibilityFilter.isObjectVisible(materialType, materialName)
  }
  return true
}

/**
 * Normalize result ingredient type to item|fluid.
 * @param {object} entry
 * @returns {'item'|'fluid'|null}
 */
function normalizeProductType(entry) {
  const t = entry?.type
  if (t === 'fluid') return 'fluid'
  if (t === 'item' || t == null || t === '') return 'item'
  return null
}

/**
 * Root path for the production tree (one map per focus; reset when focus changes).
 */
export const PM_TREE_ROOT_ID = '__pm_root__'

/**
 * Remove a path and any longer paths that extend it (collapse subtree in expansion state).
 * @param {Set<string>} set
 * @param {string} path
 */
export function pruneDescendantTreePaths(set, path) {
  for (const p of [...set]) {
    if (p === path || p.startsWith(`${path}/`)) set.delete(p)
  }
}

/**
 * Recipes that list this material as a product (visible only).
 * @param {Record<string, unknown>} factorioData
 * @param {'item'|'fluid'} materialType
 * @param {string} materialName
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 * @returns {object[]}
 */
export function recipesProducingMaterial(factorioData, materialType, materialName, visibilityFilter) {
  const recipes = getRecipeMap(factorioData)
  const out = []
  for (const recipe of Object.values(recipes)) {
    if (!isRecipeUsable(recipe, visibilityFilter)) continue
    const results = recipe.results
    if (!Array.isArray(results) || results.length === 0) continue
    const match = results.some(r => {
      if (!r?.name) return false
      const rt = normalizeProductType(r)
      return rt === materialType && r.name === materialName
    })
    if (match) out.push(recipe)
  }
  return out
}

/**
 * Recipes that list this material as an item/fluid ingredient (visible only).
 * @param {Record<string, unknown>} factorioData
 * @param {'item'|'fluid'} materialType
 * @param {string} materialName
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 * @returns {object[]}
 */
export function recipesConsumingMaterial(factorioData, materialType, materialName, visibilityFilter) {
  const recipes = getRecipeMap(factorioData)
  const out = []
  for (const recipe of Object.values(recipes)) {
    if (!isRecipeUsable(recipe, visibilityFilter)) continue
    const ingredients = recipe.ingredients
    if (!Array.isArray(ingredients)) continue
    const match = ingredients.some(ing => {
      if (!ing?.name) return false
      const t = normalizeProductType(ing)
      return t === materialType && ing.name === materialName
    })
    if (match) out.push(recipe)
  }
  return out
}

/**
 * Item/fluid ingredients for a recipe.
 * @param {Record<string, unknown>} factorioData
 * @param {string} recipeName
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 * @returns {{ type: 'item'|'fluid', name: string }[]}
 */
export function materialIngredientsForRecipe(factorioData, recipeName, visibilityFilter) {
  const recipes = getRecipeMap(factorioData)
  const recipe = recipes[recipeName]
  if (!recipe || !isRecipeUsable(recipe, visibilityFilter)) return []
  const ingredients = recipe.ingredients
  if (!Array.isArray(ingredients)) return []
  const out = []
  for (const ing of ingredients) {
    if (!ing?.name) continue
    const t = normalizeProductType(ing)
    if (t !== 'item' && t !== 'fluid') continue
    if (!isMaterialUsable(t, ing.name, visibilityFilter)) continue
    const items = getItemMap(factorioData)
    const fluids = getFluidMap(factorioData)
    const proto = t === 'fluid' ? fluids[ing.name] : items[ing.name]
    if (proto && isHiddenFactorioPrototype(proto)) continue
    out.push({ type: t, name: ing.name })
  }
  return out
}

/**
 * Item/fluid products of a recipe (visible only).
 * @param {Record<string, unknown>} factorioData
 * @param {string} recipeName
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 * @returns {{ type: 'item'|'fluid', name: string }[]}
 */
export function materialResultsForRecipe(factorioData, recipeName, visibilityFilter) {
  const recipes = getRecipeMap(factorioData)
  const recipe = recipes[recipeName]
  if (!recipe || !isRecipeUsable(recipe, visibilityFilter)) return []
  const results = recipe.results
  if (!Array.isArray(results) || results.length === 0) return []
  const out = []
  for (const r of results) {
    if (!r?.name) continue
    const t = normalizeProductType(r)
    if (t !== 'item' && t !== 'fluid') continue
    if (!isMaterialUsable(t, r.name, visibilityFilter)) continue
    const items = getItemMap(factorioData)
    const fluids = getFluidMap(factorioData)
    const proto = t === 'fluid' ? fluids[r.name] : items[r.name]
    if (proto && isHiddenFactorioPrototype(proto)) continue
    out.push({ type: t, name: r.name })
  }
  return out
}

/**
 * Expansion tree only: each visible node has one parent; no cross-links (cycles become repeat expansions).
 * Node ids are stable paths: under the root, **`r…`** = right chain (material-as-product → ingredients;
 * recipe-as-root → ingredients), **`l…`** = left chain (material-as-ingredient → recipe products;
 * recipe-as-root → products). Deeper segments use numeric `0000`, `0001`, ….
 * @param {Record<string, unknown>} factorioData
 * @param {'item'|'fluid'|'recipe'} focusType
 * @param {string} focusName
 * @param {Set<string>|string[]} expandedPaths paths in the tree whose children are shown ({@link PM_TREE_ROOT_ID} for focus)
 * @param {object} [options]
 * @param {number} [options.maxNodes=100]
 * @param {'right'|'left'|null} [options.rootBranchFilter] when set at the **focus root only**, expand
 *   only that branch: material focus — `right` = producers, `left` = consumers; recipe focus —
 *   `right` = ingredients, `left` = products. `null` expands both (default).
 * @returns {{
 *   nodes: Map<string, object>,
 *   edges: { from: string, to: string, kind: 'tree' }[],
 *   truncated: boolean,
 *   rootInstanceId: string,
 *   focusPrototypeKey: string
 * }}
 */
export function buildProductionTreeGraph(
  factorioData,
  focusType,
  focusName,
  expandedPaths,
  options = {}
) {
  const maxNodes = options.maxNodes ?? 100
  const visibilityFilter = options.visibilityFilter ?? null
  /** @type {'right'|'left'|null} */
  const rootBranchFilter =
    options.rootBranchFilter === 'right' || options.rootBranchFilter === 'left'
      ? options.rootBranchFilter
      : null
  const expanded = expandedPaths instanceof Set ? expandedPaths : new Set(expandedPaths)

  const nodes = new Map()
  const edges = []
  let truncated = false

  if (
    (focusType !== 'item' && focusType !== 'fluid' && focusType !== 'recipe') ||
    !focusName
  ) {
    return {
      nodes,
      edges,
      truncated,
      rootInstanceId: PM_TREE_ROOT_ID,
      focusPrototypeKey: ''
    }
  }

  const items = getItemMap(factorioData)
  const fluids = getFluidMap(factorioData)

  /** @type {string} */
  let focusKey = ''

  if (focusType === 'recipe') {
    const recipes = getRecipeMap(factorioData)
    const recipe = recipes[focusName]
    if (!recipe || !isRecipeUsable(recipe, visibilityFilter)) {
      return {
        nodes,
        edges,
        truncated,
        rootInstanceId: PM_TREE_ROOT_ID,
        focusPrototypeKey: recipeNodeId(focusName)
      }
    }
    focusKey = recipeNodeId(focusName)
    nodes.set(PM_TREE_ROOT_ID, {
      instanceId: PM_TREE_ROOT_ID,
      prototypeKey: focusKey,
      kind: 'recipe',
      name: focusName,
      displayName: recipe.displayName != null ? String(recipe.displayName) : focusName,
      isFocus: true,
      parentInstanceId: null,
      layoutDepth: 0,
      childIndex: null
    })
  } else {
    focusKey = materialKey(focusType, focusName)
    const focusProto = focusType === 'fluid' ? fluids[focusName] : items[focusName]
    const focusDisplay =
      focusProto?.displayName != null ? String(focusProto.displayName) : focusName

    nodes.set(PM_TREE_ROOT_ID, {
      instanceId: PM_TREE_ROOT_ID,
      prototypeKey: focusKey,
      kind: 'material',
      type: focusType,
      name: focusName,
      displayName: focusDisplay,
      isFocus: true,
      parentInstanceId: null,
      layoutDepth: 0,
      childIndex: null
    })
  }

  /** @type {{ path: string, id: string }[]} */
  const queue = [{ path: PM_TREE_ROOT_ID, id: PM_TREE_ROOT_ID }]

  for (let qi = 0; qi < queue.length; qi++) {
    const { path: parentPath, id: parentId } = queue[qi]
    const parent = nodes.get(parentId)
    if (!parent || !expanded.has(parentPath)) continue

    if (parent.kind === 'material') {
      const isFocusRoot = parentId === PM_TREE_ROOT_ID && parent.isFocus

      if (isFocusRoot) {
        const allowRight = rootBranchFilter == null || rootBranchFilter === 'right'
        const allowLeft = rootBranchFilter == null || rootBranchFilter === 'left'
        if (allowRight) {
          const producers = recipesProducingMaterial(
            factorioData,
            parent.type,
            parent.name,
            visibilityFilter
          )
          const sortedP = [...producers].sort((a, b) => a.name.localeCompare(b.name))
          for (let i = 0; i < sortedP.length; i++) {
            if (nodes.size >= maxNodes) {
              truncated = true
              break
            }
            const recipe = sortedP[i]
            const seg = `r${String(i).padStart(4, '0')}`
            const childPath = `${parentPath}/${seg}`
            const childId = childPath
            nodes.set(childId, {
              instanceId: childId,
              prototypeKey: recipeNodeId(recipe.name),
              kind: 'recipe',
              name: recipe.name,
              displayName: recipe.displayName != null ? String(recipe.displayName) : recipe.name,
              isFocus: false,
              parentInstanceId: parentId,
              layoutDepth: parent.layoutDepth + 1,
              childIndex: i,
              flowDir: 'right'
            })
            edges.push({ from: childId, to: parentId, kind: 'tree' })
            queue.push({ path: childPath, id: childId })
          }
        }
        if (allowLeft) {
          const consumers = recipesConsumingMaterial(
            factorioData,
            parent.type,
            parent.name,
            visibilityFilter
          )
          const sortedC = [...consumers].sort((a, b) => a.name.localeCompare(b.name))
          for (let i = 0; i < sortedC.length; i++) {
            if (nodes.size >= maxNodes) {
              truncated = true
              break
            }
            const recipe = sortedC[i]
            const seg = `l${String(i).padStart(4, '0')}`
            const childPath = `${parentPath}/${seg}`
            const childId = childPath
            nodes.set(childId, {
              instanceId: childId,
              prototypeKey: recipeNodeId(recipe.name),
              kind: 'recipe',
              name: recipe.name,
              displayName: recipe.displayName != null ? String(recipe.displayName) : recipe.name,
              isFocus: false,
              parentInstanceId: parentId,
              layoutDepth: parent.layoutDepth - 1,
              childIndex: i,
              flowDir: 'left'
            })
            edges.push({ from: parentId, to: childId, kind: 'tree' })
            queue.push({ path: childPath, id: childId })
          }
        }
      } else if (parent.flowDir === 'right') {
        const producers = recipesProducingMaterial(
          factorioData,
          parent.type,
          parent.name,
          visibilityFilter
        )
        const sorted = [...producers].sort((a, b) => a.name.localeCompare(b.name))
        for (let i = 0; i < sorted.length; i++) {
          if (nodes.size >= maxNodes) {
            truncated = true
            break
          }
          const recipe = sorted[i]
          const childPath = `${parentPath}/${String(i).padStart(4, '0')}`
          const childId = childPath
          nodes.set(childId, {
            instanceId: childId,
            prototypeKey: recipeNodeId(recipe.name),
            kind: 'recipe',
            name: recipe.name,
            displayName: recipe.displayName != null ? String(recipe.displayName) : recipe.name,
            isFocus: false,
            parentInstanceId: parentId,
            layoutDepth: parent.layoutDepth + 1,
            childIndex: i,
            flowDir: 'right'
          })
          edges.push({ from: childId, to: parentId, kind: 'tree' })
          queue.push({ path: childPath, id: childId })
        }
      } else if (parent.flowDir === 'left') {
        const consumers = recipesConsumingMaterial(
          factorioData,
          parent.type,
          parent.name,
          visibilityFilter
        )
        const sorted = [...consumers].sort((a, b) => a.name.localeCompare(b.name))
        for (let i = 0; i < sorted.length; i++) {
          if (nodes.size >= maxNodes) {
            truncated = true
            break
          }
          const recipe = sorted[i]
          const childPath = `${parentPath}/${String(i).padStart(4, '0')}`
          const childId = childPath
          nodes.set(childId, {
            instanceId: childId,
            prototypeKey: recipeNodeId(recipe.name),
            kind: 'recipe',
            name: recipe.name,
            displayName: recipe.displayName != null ? String(recipe.displayName) : recipe.name,
            isFocus: false,
            parentInstanceId: parentId,
            layoutDepth: parent.layoutDepth - 1,
            childIndex: i,
            flowDir: 'left'
          })
          edges.push({ from: parentId, to: childId, kind: 'tree' })
          queue.push({ path: childPath, id: childId })
        }
      }
    } else {
      const dir = parent.flowDir
      const isRecipeFocusRoot = parentId === PM_TREE_ROOT_ID && parent.isFocus && parent.kind === 'recipe'

      if (isRecipeFocusRoot) {
        const allowRight = rootBranchFilter == null || rootBranchFilter === 'right'
        const allowLeft = rootBranchFilter == null || rootBranchFilter === 'left'
        if (allowRight) {
          const ings = materialIngredientsForRecipe(factorioData, parent.name, visibilityFilter)
          for (let i = 0; i < ings.length; i++) {
            if (nodes.size >= maxNodes) {
              truncated = true
              break
            }
            const ing = ings[i]
            const map = ing.type === 'fluid' ? fluids : items
            const proto = map[ing.name]
            const display = proto?.displayName != null ? String(proto.displayName) : ing.name
            const mk = materialKey(ing.type, ing.name)
            const seg = `r${String(i).padStart(4, '0')}`
            const childPath = `${parentPath}/${seg}`
            const childId = childPath
            nodes.set(childId, {
              instanceId: childId,
              prototypeKey: mk,
              kind: 'material',
              type: ing.type,
              name: ing.name,
              displayName: display,
              isFocus: false,
              parentInstanceId: parentId,
              layoutDepth: parent.layoutDepth + 1,
              childIndex: i,
              flowDir: 'right'
            })
            edges.push({ from: childId, to: parentId, kind: 'tree' })
            queue.push({ path: childPath, id: childId })
          }
        }
        if (allowLeft) {
          const products = materialResultsForRecipe(factorioData, parent.name, visibilityFilter)
          const sortedProducts = [...products].sort((a, b) => {
            const ta = `${a.type}:${a.name}`
            const tb = `${b.type}:${b.name}`
            return ta.localeCompare(tb)
          })
          for (let i = 0; i < sortedProducts.length; i++) {
            if (nodes.size >= maxNodes) {
              truncated = true
              break
            }
            const prod = sortedProducts[i]
            const map = prod.type === 'fluid' ? fluids : items
            const proto = map[prod.name]
            const display = proto?.displayName != null ? String(proto.displayName) : prod.name
            const mk = materialKey(prod.type, prod.name)
            const seg = `l${String(i).padStart(4, '0')}`
            const childPath = `${parentPath}/${seg}`
            const childId = childPath
            nodes.set(childId, {
              instanceId: childId,
              prototypeKey: mk,
              kind: 'material',
              type: prod.type,
              name: prod.name,
              displayName: display,
              isFocus: false,
              parentInstanceId: parentId,
              layoutDepth: parent.layoutDepth - 1,
              childIndex: i,
              flowDir: 'left'
            })
            edges.push({ from: parentId, to: childId, kind: 'tree' })
            queue.push({ path: childPath, id: childId })
          }
        }
      } else if (dir === 'right') {
        const ings = materialIngredientsForRecipe(factorioData, parent.name, visibilityFilter)
        for (let i = 0; i < ings.length; i++) {
          if (nodes.size >= maxNodes) {
            truncated = true
            break
          }
          const ing = ings[i]
          const map = ing.type === 'fluid' ? fluids : items
          const proto = map[ing.name]
          const display = proto?.displayName != null ? String(proto.displayName) : ing.name
          const mk = materialKey(ing.type, ing.name)
          const childPath = `${parentPath}/${String(i).padStart(4, '0')}`
          const childId = childPath
          nodes.set(childId, {
            instanceId: childId,
            prototypeKey: mk,
            kind: 'material',
            type: ing.type,
            name: ing.name,
            displayName: display,
            isFocus: false,
            parentInstanceId: parentId,
            layoutDepth: parent.layoutDepth + 1,
            childIndex: i,
            flowDir: 'right'
          })
          edges.push({ from: childId, to: parentId, kind: 'tree' })
          queue.push({ path: childPath, id: childId })
        }
      } else if (dir === 'left') {
        const products = materialResultsForRecipe(factorioData, parent.name, visibilityFilter)
        const sortedProducts = [...products].sort((a, b) => {
          const ta = `${a.type}:${a.name}`
          const tb = `${b.type}:${b.name}`
          return ta.localeCompare(tb)
        })
        for (let i = 0; i < sortedProducts.length; i++) {
          if (nodes.size >= maxNodes) {
            truncated = true
            break
          }
          const prod = sortedProducts[i]
          const map = prod.type === 'fluid' ? fluids : items
          const proto = map[prod.name]
          const display = proto?.displayName != null ? String(proto.displayName) : prod.name
          const mk = materialKey(prod.type, prod.name)
          const childPath = `${parentPath}/${String(i).padStart(4, '0')}`
          const childId = childPath
          nodes.set(childId, {
            instanceId: childId,
            prototypeKey: mk,
            kind: 'material',
            type: prod.type,
            name: prod.name,
            displayName: display,
            isFocus: false,
            parentInstanceId: parentId,
            layoutDepth: parent.layoutDepth - 1,
            childIndex: i,
            flowDir: 'left'
          })
          edges.push({ from: parentId, to: childId, kind: 'tree' })
          queue.push({ path: childPath, id: childId })
        }
      }
    }
  }

  return {
    nodes,
    edges,
    truncated,
    rootInstanceId: PM_TREE_ROOT_ID,
    focusPrototypeKey: focusKey
  }
}

/**
 * Instance ids on the path from {@link PM_TREE_ROOT_ID} to `terminalId` (inclusive).
 * @param {Map<string, object>} nodes
 * @param {string} terminalId
 * @returns {Set<string>}
 */
export function spinePathIdsForTerminal(nodes, terminalId) {
  const set = new Set()
  let id = terminalId
  while (id && nodes.has(id)) {
    set.add(id)
    const n = nodes.get(id)
    id = n?.parentInstanceId ?? null
  }
  return set
}

/**
 * @param {string} path
 * @returns {string | null} parent path, or null if `path` is root
 */
export function parentTreePath(path) {
  if (!path || path === PM_TREE_ROOT_ID) return null
  const i = path.lastIndexOf('/')
  if (i <= 0) return PM_TREE_ROOT_ID
  return path.slice(0, i)
}

/**
 * Expansion paths for a single spine: root through `terminalPath` inclusive.
 * Siblings of spine nodes stay visible as leaves because their parent is expanded,
 * but paths off the spine are not expanded (avoids multiple deep branches).
 * @param {string} terminalPath instance id / tree path ({@link PM_TREE_ROOT_ID} when nothing past focus)
 * @returns {Set<string>}
 */
export function expandedPathsForSpineTerminal(terminalPath) {
  const set = new Set()
  let id = terminalPath
  while (id) {
    set.add(id)
    if (id === PM_TREE_ROOT_ID) break
    id = parentTreePath(id)
  }
  return set
}

/**
 * Walk up from `path` until a node exists in `nodes` (or return {@link PM_TREE_ROOT_ID}).
 * @param {Map<string, object>} nodes
 * @param {string} path
 * @returns {string}
 */
export function clampTreePathToExisting(nodes, path) {
  let id = path
  while (id && !nodes.has(id)) {
    const p = parentTreePath(id)
    id = p == null ? PM_TREE_ROOT_ID : p
    if (id === PM_TREE_ROOT_ID && !nodes.has(id)) break
  }
  return nodes.has(id) ? id : PM_TREE_ROOT_ID
}

/**
 * Clear/set `isRepeatPrototype` and `repeatEarlierDepth` on material nodes: same `prototypeKey`
 * at a greater `layoutDepth` than an earlier visible material counts as a repeat (cycle hint).
 * Mutates nodes in `nodes`.
 * @param {Map<string, object>} nodes
 */
export function markRepeatMaterialNodes(nodes) {
  for (const n of nodes.values()) {
    if (n.kind === 'material') {
      delete n.isRepeatPrototype
      delete n.repeatEarlierDepth
    }
  }
  let minD = Infinity
  for (const n of nodes.values()) {
    const d = n.layoutDepth
    if (Number.isInteger(d)) minD = Math.min(minD, d)
  }
  if (!Number.isFinite(minD)) minD = 0

  const materials = [...nodes.entries()]
    .filter(([, n]) => n.kind === 'material')
    .map(([id, n]) => [id, n, n.layoutDepth - minD])
    .sort((a, b) => {
      const da = a[2] - b[2]
      if (da !== 0) return da
      return a[0].localeCompare(b[0])
    })
  /** @type {Map<string, number>} */
  const firstDepthByKey = new Map()
  for (const [, n, shifted] of materials) {
    const key = n.prototypeKey
    if (!Number.isInteger(shifted)) continue
    const first = firstDepthByKey.get(key)
    if (first !== undefined && first < shifted) {
      n.isRepeatPrototype = true
      n.repeatEarlierDepth = first
    }
    if (first === undefined) {
      firstDepthByKey.set(key, shifted)
    }
  }
}

/**
 * @param {Map<string, object>} nodes
 * @param {string} nodeId
 * @param {Set<string>} expanded
 */
export function expandPathToRoot(nodes, nodeId, expanded) {
  let id = nodeId
  while (id) {
    expanded.add(id)
    const n = nodes.get(id)
    id = n?.parentInstanceId ?? null
  }
}

/**
 * @param {Record<string, unknown>} factorioData
 * @param {string} materialKeyStr
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 */
export function materialHasExpandableRecipes(factorioData, materialKeyStr, visibilityFilter) {
  const m = parseMaterialKey(materialKeyStr)
  if (!m) return false
  return recipesProducingMaterial(factorioData, m.type, m.name, visibilityFilter).length > 0
}

/**
 * @param {Record<string, unknown>} factorioData
 * @param {string} materialKeyStr
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 */
export function materialHasExpandableConsumers(factorioData, materialKeyStr, visibilityFilter) {
  const m = parseMaterialKey(materialKeyStr)
  if (!m) return false
  return recipesConsumingMaterial(factorioData, m.type, m.name, visibilityFilter).length > 0
}

/**
 * @param {Record<string, unknown>} factorioData
 * @param {string} recipeName
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 */
export function recipeHasExpandableIngredients(factorioData, recipeName, visibilityFilter) {
  return materialIngredientsForRecipe(factorioData, recipeName, visibilityFilter).length > 0
}

/**
 * @param {Record<string, unknown>} factorioData
 * @param {string} recipeName
 * @param {{ isObjectVisible?: (type: string, name: string, data?: object) => boolean } | null} visibilityFilter
 */
export function recipeHasExpandableProducts(factorioData, recipeName, visibilityFilter) {
  return materialResultsForRecipe(factorioData, recipeName, visibilityFilter).length > 0
}
