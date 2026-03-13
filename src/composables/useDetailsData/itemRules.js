import { labels, sectionTypes } from '../detailsDataTypes.js'
import {
  parseAttackParameters,
  parseCapsuleAction,
  parseGenericItemEffect
} from '../useAttackParametersParser.js'

/**
 * Item rules - unified format for both statistics and sections
 */
export const itemRules = [
  // Statistics rules
  {
    name: labels.rocket_launch_product,
    order: 1,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => {
      const products = data.item?.rocket_launch_products
      return products.map(product => `[item=${product.name}] x ${product.amount}`).join(', ')
    },
    condition: data => data.item?.rocket_launch_products
  },
  {
    name: labels.obtained_from_rocket_launch,
    order: 1,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: (data, context) => {
      const items = Object.values(context.factorioData.item).filter(item =>
        item.rocket_launch_products?.some(product => product.name === data.item?.name)
      )
      const products = items.map(item => item.name)
      if (products.length === 0) return null
      return products.map(product => `[item=${product}]`).join(', ')
    },
    condition: data => data.item?.name !== undefined
  },
  {
    name: labels.nuclear_fuel,
    order: 1,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => (data.item?.fuel_category === 'nuclear' ? '' : null),
    condition: data => data.item?.fuel_category === 'nuclear'
  },
  {
    name: labels.fuel_value,
    order: 2,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.fuel_value,
    condition: data => data.item?.fuel_value !== undefined
  },
  {
    name: labels.spent_result,
    order: 3,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => `[item=${data.item?.burnt_result}]`,
    condition: data => data.item?.burnt_result !== undefined
  },
  {
    name: labels.fuel_pollution,
    order: 4,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.fuel_pollution,
    condition: data => data.item?.fuel_pollution !== undefined
  },
  {
    name: labels.resistances,
    order: 5,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: (data, context) => {
      const damageTypes = Object.values(context.factorioData['damage-type'])
      return {
        children: data.item?.resistances.map(resistance => {
          const damageType = damageTypes.find(dt => dt.name === resistance.type)
          const damageTypeLabel = damageType?.displayName || resistance.type
          let value = ''
          if (resistance.percent !== undefined && resistance.decrease !== undefined) {
            value = `${resistance.decrease}/${resistance.percent}%`
          } else if (resistance.percent !== undefined) {
            value = `${resistance.percent}%`
          } else if (resistance.decrease !== undefined) {
            value = `${resistance.decrease}`
          }
          return { label: damageTypeLabel, value }
        })
      }
    },
    condition: data => data.item?.resistances?.length > 0
  },
  {
    name: labels.inventory_size_bonus,
    order: 6,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.inventory_size_bonus,
    condition: data => data.item?.inventory_size_bonus !== undefined
  },
  {
    name: labels.movement_speed_bonus,
    order: 7,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.movement_speed_bonus,
    condition: data => data.item?.movement_speed_bonus !== undefined
  },
  {
    name: labels.construction_area,
    order: 8,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.construction_area,
    condition: data => data.item?.construction_area !== undefined
  },
  {
    name: labels.robot_limit,
    order: 9,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.robot_limit,
    condition: data => data.item?.robot_limit !== undefined
  },
  {
    name: labels.shield_hitpoints,
    order: 10,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.shield_hitpoints,
    condition: data => data.item?.shield_hitpoints !== undefined
  },
  {
    name: labels.shield_recharge_rate,
    order: 11,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.shield_recharge_rate,
    condition: data => data.item?.shield_recharge_rate !== undefined
  },
  {
    name: labels.range_shooting_speed,
    order: 12,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.range_shooting_speed,
    condition: data => data.item?.range_shooting_speed !== undefined
  },
  {
    name: labels.stack_size,
    order: 13,
    type: 'statistics',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.stack_size,
    condition: data => data.item?.stack_size !== undefined
  },

  // Section rules
  {
    name: sectionTypes.alternative_recipes,
    order: 1,
    type: 'section',
    forType: 'item',
    shownInTooltip: false,
    getValue: (data, context) => {
      const recipes = Object.values(context.factorioData.recipe)
      const alternativeRecipes = recipes
        .filter(
          recipe =>
            recipe.name !== data.item?.name &&
            recipe.results?.length > 0 &&
            recipe.results?.some(
              result => result.name === data.item?.name && result.type === 'item'
            )
        )
        .map(recipe => ({ name: recipe.name, type: 'recipe', label: recipe.displayName }))

      return alternativeRecipes.length > 0 ? { items: alternativeRecipes, itemsType: 'list' } : null
    },
    postCondition: data => data.items?.length > 0
  },
  {
    name: sectionTypes.used_in,
    order: 2,
    type: 'section',
    forType: 'item',
    shownInTooltip: false,
    getValue: (data, context) => {
      const recipes = Object.values(context.factorioData.recipe)
      const usedIn = recipes
        .filter(
          recipe =>
            recipe.ingredients?.length > 0 &&
            recipe.ingredients?.some(ingredient => ingredient.name === data.item?.name)
        )
        .map(recipe => ({ name: recipe.name, type: 'recipe' }))

      return usedIn.length > 0 ? { items: usedIn, itemsType: 'grid' } : null
    },
    postCondition: data => data.items?.length > 0
  },
  {
    name: sectionTypes.burned_in,
    order: 3,
    type: 'section',
    forType: 'item',
    shownInTooltip: false,
    getValue: (data, context) => {
      const entities = Object.values(context.factorioData.entity)
      const burnedIn = entities
        .filter(entity => {
          const { energy_source } = entity
          if (energy_source && energy_source.type === 'burner') {
            if (
              energy_source?.fuel_categories?.some(
                category => category === data.item?.fuel_category
              )
            ) {
              return true
            }
          }
          return false
        })
        .map(entity => ({ name: entity.name, type: 'entity' }))

      return burnedIn.length > 0 ? { items: burnedIn, itemsType: 'grid' } : null
    },
    condition: data => data.item?.fuel_category !== undefined
  },
  {
    name: sectionTypes.placed_in_equipment_grid,
    order: 4,
    type: 'section',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.placed_in_equipment_grid,
    condition: data => data.item?.placed_in_equipment_grid !== undefined
  },
  {
    name: sectionTypes.turret,
    order: 5,
    type: 'section',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.turret,
    condition: data => data.item?.turret !== undefined
  },
  {
    name: sectionTypes.effect,
    order: 6,
    type: 'section',
    forType: 'item',
    shownInTooltip: true,
    getValue: (data, context) => {
      // If item has attack parameters, use the attack parameters parser
      if (data.item?.attack_parameters) {
        return parseAttackParameters(data.item.attack_parameters, context, false)
      }
      if (data.item?.ammo_type) {
        return parseAttackParameters({ ammo_type: data.item.ammo_type }, context, false)
      }
      if (data.item?.capsule_action) {
        return parseCapsuleAction(data.item.capsule_action, context)
      }
      // Normalize raw effect objects (module/item effects) into Effect statistics
      if (data.item?.effect !== undefined) {
        return parseGenericItemEffect(data.item.effect)
      }
      return null
    },
    condition: data =>
      data.item?.effect !== undefined ||
      data.item?.attack_parameters !== undefined ||
      data.item?.ammo_type !== undefined ||
      data.item?.capsule_action !== undefined
  },
  {
    name: sectionTypes.generates_equipment_grid_electricity,
    order: 7,
    type: 'section',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.generates_equipment_grid_electricity,
    condition: data => data.item?.generates_equipment_grid_electricity !== undefined
  },
  {
    name: sectionTypes.consumes_equipment_grid_electricity,
    order: 8,
    type: 'section',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.consumes_equipment_grid_electricity,
    condition: data => data.item?.consumes_equipment_grid_electricity !== undefined
  },
  {
    name: sectionTypes.stores_equipment_grid_electricity,
    order: 9,
    type: 'section',
    forType: 'item',
    shownInTooltip: true,
    getValue: data => data.item?.stores_equipment_grid_electricity,
    condition: data => data.item?.stores_equipment_grid_electricity !== undefined
  },
  {
    name: sectionTypes.gathered_from,
    order: 2,
    type: 'section',
    forType: 'item',
    shownInTooltip: false,
    getValue: (data, context) => {
      const resources = Object.values(context.factorioData.entity)
        .filter(
          entity =>
            (!entity.factoriopedia_alternative &&
              entity.name !== data.item?.name &&
              entity.minable?.result == data.item?.name) ||
            (entity.minable?.results?.length > 0 &&
              entity.minable?.results?.some(result => result.name === data.item?.name))
        )
        .map(resource => ({ name: resource.name, type: 'entity' }))
      return { items: resources, itemsType: 'grid' }
    },
    postCondition: data => data.items?.length > 0
  }
]

// Legacy exports for backward compatibility
export const itemStatisticsRules = itemRules.filter(rule => rule.type === 'statistics')
export const itemSectionRules = itemRules.filter(rule => rule.type === 'section')
