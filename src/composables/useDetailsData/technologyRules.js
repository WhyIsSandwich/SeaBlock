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

/**
 * Technology rules - unified format for both statistics and sections
 */
export const technologyRules = [
  // Statistics rules - technologies typically don't have direct statistics
  // (empty array for now, can be extended if needed)

  // Section rules
  {
    name: sectionTypes.technology_cost,
    order: 1,
    type: 'section',
    forType: 'technology',
    shownInTooltip: true,
    getValue: data => {
      const sciencePacks = data.technology.unit?.ingredients?.map(unit => ({
        name: unit[0],
        type: 'item',
        amount: unit[1]
      }))
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
    condition: data => data.technology.unit !== undefined && data.technology.unit?.length > 0
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
