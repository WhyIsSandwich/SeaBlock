/**
 * Which module prototypes (`module.category`) may be placed is determined by
 * `entity.allowed_module_categories`, not by `entity.allowed_effects`.
 *
 * When `allowed_module_categories` is absent or empty, any module with a `category` is treated as allowed
 * (e.g. beacons in export may omit the list).
 */

/**
 * @param {{ allowed_module_categories?: string[] } | null | undefined} entity
 * @returns {Set<string> | null} null = no restriction; otherwise lowercase category ids
 */
export function allowedModuleCategoriesSetForEntity(entity) {
  if (!entity?.allowed_module_categories || !Array.isArray(entity.allowed_module_categories)) {
    return null
  }
  if (entity.allowed_module_categories.length === 0) {
    return null
  }
  const s = new Set()
  for (const x of entity.allowed_module_categories) {
    const id = String(x).trim().toLowerCase()
    if (id) s.add(id)
  }
  return s
}

export function modulePrototypeAllowedByCategories(item, categorySet) {
  if (item?.type !== 'module') return false
  const cat = item.category
  if (cat === undefined || cat === null || String(cat).trim() === '') return false
  const c = String(cat).trim().toLowerCase()
  if (categorySet === null) return true
  return categorySet.has(c)
}

/**
 * @param {{ allowed_module_categories?: string[], module_slots?: number, type?: string } | null | undefined} entity
 * @param {{ item?: Record<string, unknown> } | null | undefined} factorioData
 * @returns {{ name: string, type: 'item' }[]}
 */
function moduleSortLabel(item) {
  const label = item?.displayName ?? item?.name
  return String(label ?? '')
}

export function getCompatibleModuleItemsForEntity(entity, factorioData) {
  if (!entity || !factorioData?.item) return []
  const categorySet = allowedModuleCategoriesSetForEntity(entity)
  const matches = []
  for (const item of Object.values(factorioData.item)) {
    if (!modulePrototypeAllowedByCategories(item, categorySet)) continue
    matches.push(item)
  }
  matches.sort((a, b) =>
    moduleSortLabel(a).localeCompare(moduleSortLabel(b), undefined, { sensitivity: 'base' })
  )
  return matches.map(item => ({ name: item.name, type: 'item' }))
}
