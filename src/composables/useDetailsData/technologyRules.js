import { sectionTypes, labels } from '../detailsDataTypes.js'
import { asArray, formatNumber, formatPercent, titleFromEffectType } from './sharedFormatters.js'

function formatTechnologyEffectLabel(effect) {
  if (effect.type === 'ammo-damage' && effect.ammo_category) {
    return `${titleFromEffectType(effect.ammo_category)} Damage`
  }
  if (effect.type === 'gun-speed' && effect.ammo_category) {
    return `${titleFromEffectType(effect.ammo_category)} Gun Speed`
  }
  if (effect.type === 'turret-attack' && effect.turret_id) {
    return `${titleFromEffectType(effect.turret_id)} Attack`
  }
  return titleFromEffectType(effect.type)
}

function formatTechnologyEffectValue(effect) {
  if (typeof effect.modifier === 'boolean') {
    return effect.modifier ? 'Unlocked' : 'Disabled'
  }
  if (typeof effect.modifier === 'number') {
    if (Math.abs(effect.modifier) <= 2) {
      return formatPercent(effect.modifier)
    }
    const sign = effect.modifier > 0 ? '+' : ''
    return `${sign}${formatNumber(effect.modifier)}`
  }
  return ''
}

function normalizeTechnologyIngredients(ingredients) {
  if (!ingredients) return []
  const normalized = Array.isArray(ingredients) ? ingredients : [ingredients]
  return normalized
    .map(entry => {
      if (!entry) return null
      if (Array.isArray(entry)) {
        const [name, amount] = entry
        return name ? { name, amount } : null
      }
      if (entry.name) {
        return { name: entry.name, amount: entry.amount ?? entry[1] }
      }
      if (entry[0]) {
        return { name: entry[0], amount: entry[1] }
      }
      return null
    })
    .filter(Boolean)
}

function getTechnologyCount(technology) {
  const count = technology?.unit?.count
  return typeof count === 'number' && Number.isFinite(count) && count > 0 ? count : null
}

function getTechnologyClosure(technologyName, technologies, visited = new Set()) {
  if (!technologyName || visited.has(technologyName)) return new Set()
  const technology = technologies?.[technologyName]
  if (!technology) return new Set()

  visited.add(technologyName)
  const closure = new Set([technologyName])
  const prerequisites = Array.isArray(technology.prerequisites) ? technology.prerequisites : []
  prerequisites.forEach(prerequisiteName => {
    const prerequisiteClosure = getTechnologyClosure(prerequisiteName, technologies, visited)
    prerequisiteClosure.forEach(name => closure.add(name))
  })
  return closure
}

function getCumulativeScienceCostStatistic(technology, technologies, items = {}) {
  const closure = getTechnologyClosure(technology?.name, technologies)
  if (closure.size === 0) return null

  const totalsByPack = new Map()
  let totalSciencePacks = 0

  closure.forEach(technologyName => {
    const closureTechnology = technologies?.[technologyName]
    const researchCount = getTechnologyCount(closureTechnology)
    if (!researchCount) return

    normalizeTechnologyIngredients(closureTechnology?.unit?.ingredients).forEach(ingredient => {
      if (!ingredient?.name) return
      const amount = Number(ingredient.amount)
      if (!Number.isFinite(amount) || amount <= 0) return
      const totalAmount = amount * researchCount
      totalsByPack.set(ingredient.name, (totalsByPack.get(ingredient.name) || 0) + totalAmount)
      totalSciencePacks += totalAmount
    })
  })

  if (totalsByPack.size === 0) return null

  const children = Array.from(totalsByPack.entries())
    .sort(([leftName], [rightName]) => {
      const leftLabel = items?.[leftName]?.displayName || leftName
      const rightLabel = items?.[rightName]?.displayName || rightName
      return leftLabel.localeCompare(rightLabel)
    })
    .map(([packName, amount]) => ({
      label: items?.[packName]?.displayName || packName,
      value: formatNumber(amount)
    }))

  return {
    label: labels.cumulative_science_cost,
    value: formatNumber(totalSciencePacks),
    children
  }
}

/**
 * Technology rules - unified format for both statistics and sections
 */
export const technologyRules = [
  {
    name: labels.cumulative_science_cost,
    order: 1,
    type: 'statistics',
    forType: 'technology',
    shownInTooltip: false,
    getValue: (data, context) =>
      getCumulativeScienceCostStatistic(
        data.technology,
        context.factorioData.technology || {},
        context.factorioData.item || {}
      ),
    condition: (data, context) =>
      getCumulativeScienceCostStatistic(
        data.technology,
        context.factorioData.technology || {},
        context.factorioData.item || {}
      ) !== null
  },

  // Section rules
  {
    name: sectionTypes.technology_cost,
    order: 1,
    type: 'section',
    forType: 'technology',
    shownInTooltip: true,
    getValue: (data, context) => {
      const sciencePacks = normalizeTechnologyIngredients(data.technology.unit?.ingredients).map(
        unit => ({
          name: unit.name,
          type: 'item',
          amount: unit.amount
        })
      )
      return {
        items: sciencePacks,
        type: 'technology_cost',
        itemsType: 'grid',
        statistics: [
          { label: labels.technology_cost, value: data.technology.unit?.count },
          { label: labels.technology_time, value: data.technology.unit?.time }
        ]
      }
    },
    condition: data => normalizeTechnologyIngredients(data.technology.unit?.ingredients).length > 0
  },
  {
    name: sectionTypes.technology_effects,
    order: 2,
    type: 'section',
    forType: 'technology',
    shownInTooltip: true,
    getValue: data => {
      const transformedEffects = []
      const statistics = []
      for (const effect of asArray(data.technology.effects))
        if (effect.type === 'unlock-recipe') {
          transformedEffects.push({
            name: effect.recipe,
            type: 'recipe'
          })
        } else {
          statistics.push({
            label: formatTechnologyEffectLabel(effect),
            value: formatTechnologyEffectValue(effect)
          })
        }
      return { items: transformedEffects, itemsType: 'grid', statistics }
    },
    condition: data => asArray(data.technology.effects).length > 0,
    postCondition: data => (data.items?.length || 0) > 0 || (data.statistics?.length || 0) > 0
  },
  {
    name: sectionTypes.technology_prerequisites,
    order: 3,
    type: 'section',
    forType: 'technology',
    shownInTooltip: false,
    getValue: (data, context) => {
      const technologies = Object.values(context.factorioData.technology)
      const prerequisites = technologies
        .filter(technology => data.technology.prerequisites?.includes(technology.name))
        .map(technology => ({ name: technology.name, type: 'technology' }))
      return { items: prerequisites }
    },
    condition: data => data.technology.prerequisites?.length > 0,
    postCondition: data => data.items?.length > 0
  },
  {
    name: sectionTypes.technology_descendants,
    order: 4,
    type: 'section',
    forType: 'technology',
    shownInTooltip: false,
    getValue: (data, context) => {
      const technologies = Object.values(context.factorioData.technology)
      const descendants = technologies
        .filter(
          technology =>
            technology?.prerequisites?.length > 0 &&
            technology.prerequisites?.includes(data.technology.name)
        )
        .map(technology => ({ name: technology.name, type: 'technology' }))
      return { items: descendants, itemsType: 'grid' }
    },
    postCondition: data => data.items?.length > 0
  }
]
