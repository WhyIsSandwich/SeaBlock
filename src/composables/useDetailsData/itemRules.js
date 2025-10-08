import { labels } from '../useDetailsData.js'
import { sectionTypes } from '../detailsDataTypes.js'

/**
 * Item rules - unified format for both statistics and sections
 */
export const itemRules = [
  // Statistics rules
  {
    name: labels.nuclear_fuel,
    order: 1,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => (data.fuel_category === 'nuclear' ? '' : null),
    condition: data => data.fuel_category === 'nuclear'
  },
  {
    name: labels.fuel_value,
    order: 2,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.fuel_value,
    condition: data => data.fuel_value !== undefined
  },
  {
    name: labels.spent_result,
    order: 3,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.burnt_result,
    condition: data => data.burnt_result !== undefined
  },
  {
    name: labels.fuel_pollution,
    order: 4,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.fuel_pollution,
    condition: data => data.fuel_pollution !== undefined
  },
  {
    name: labels.resistances,
    order: 5,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.resistances,
    condition: data => data.resistances !== undefined
  },
  {
    name: labels.inventory_size_bonus,
    order: 6,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.inventory_size_bonus,
    condition: data => data.inventory_size_bonus !== undefined
  },
  {
    name: labels.movement_speed_bonus,
    order: 7,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.movement_speed_bonus,
    condition: data => data.movement_speed_bonus !== undefined
  },
  {
    name: labels.construction_area,
    order: 8,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.construction_area,
    condition: data => data.construction_area !== undefined
  },
  {
    name: labels.robot_limit,
    order: 9,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.robot_limit,
    condition: data => data.robot_limit !== undefined
  },
  {
    name: labels.shield_hitpoints,
    order: 10,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.shield_hitpoints,
    condition: data => data.shield_hitpoints !== undefined
  },
  {
    name: labels.shield_recharge_rate,
    order: 11,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.shield_recharge_rate,
    condition: data => data.shield_recharge_rate !== undefined
  },
  {
    name: labels.range_shooting_speed,
    order: 12,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.range_shooting_speed,
    condition: data => data.range_shooting_speed !== undefined
  },
  {
    name: labels.stack_size,
    order: 13,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.stack_size,
    condition: data => data.stack_size !== undefined
  },

  // Section rules
  {
    name: sectionTypes.alternative_recipes,
    order: 1,
    type: 'section',
    shownInTooltip: true,
    getValue: (data, context) => {
      const recipes = Object.values(context.factorioData.recipe)
      const alternativeRecipes = recipes
        .filter(
          recipe =>
            recipe.name !== data.name &&
            recipe.results?.length > 0 &&
            recipe.results?.some(result => result.name === data.name && result.type === 'item')
        )
        .map(recipe => ({ name: recipe.name, type: 'recipe', label: recipe.displayName }))

      return alternativeRecipes.length > 0 ? { items: alternativeRecipes, itemsType: 'list' } : null
    },
    condition: data => data.name !== undefined
  },
  {
    name: sectionTypes.used_in,
    order: 2,
    type: 'section',
    shownInTooltip: true,
    getValue: (data, context) => {
      const recipes = Object.values(context.factorioData.recipe)
      const usedIn = recipes
        .filter(
          recipe =>
            recipe.ingredients?.length > 0 &&
            recipe.ingredients?.some(ingredient => ingredient.name === data.name)
        )
        .map(recipe => ({ name: recipe.name, type: 'recipe' }))

      return usedIn.length > 0 ? { items: usedIn, itemsType: 'grid' } : null
    },
    condition: data => data.name !== undefined
  },
  {
    name: sectionTypes.burned_in,
    order: 3,
    type: 'section',
    shownInTooltip: true,
    getValue: (data, context) => {
      const entities = Object.values(context.factorioData.entity)
      const burnedIn = entities
        .filter(entity => {
          const { energy_source } = entity
          if (energy_source && energy_source.type === 'burner') {
            if (energy_source?.fuel_categories?.some(category => category === data.fuel_category)) {
              return true
            }
          }
          return false
        })
        .map(entity => ({ name: entity.name, type: 'entity' }))

      return burnedIn.length > 0 ? { items: burnedIn, itemsType: 'grid' } : null
    },
    condition: data => data.fuel_category !== undefined
  },
  {
    name: sectionTypes.placed_in_equipment_grid,
    order: 4,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.placed_in_equipment_grid,
    condition: data => data.placed_in_equipment_grid !== undefined
  },
  {
    name: sectionTypes.turret,
    order: 5,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.turret,
    condition: data => data.turret !== undefined
  },
  {
    name: sectionTypes.effect,
    order: 6,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.effect,
    condition: data => data.effect !== undefined
  },
  {
    name: sectionTypes.generates_equipment_grid_electricity,
    order: 7,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.generates_equipment_grid_electricity,
    condition: data => data.generates_equipment_grid_electricity !== undefined
  },
  {
    name: sectionTypes.consumes_equipment_grid_electricity,
    order: 8,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.consumes_equipment_grid_electricity,
    condition: data => data.consumes_equipment_grid_electricity !== undefined
  },
  {
    name: sectionTypes.stores_equipment_grid_electricity,
    order: 9,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.stores_equipment_grid_electricity,
    condition: data => data.stores_equipment_grid_electricity !== undefined
  }
]

// Legacy exports for backward compatibility
export const itemStatisticsRules = itemRules.filter(rule => rule.type === 'statistics')
export const itemSectionRules = itemRules.filter(rule => rule.type === 'section')
