import {
  createSimpleStatisticsRule,
  createCustomStatisticsRule,
  createResistancesStatisticsRule,
  createSectionRule
} from './rulesEngine.js'
import { labels } from '../useDetailsData.js'
import { sectionTypes } from '../detailsDataTypes.js'

/**
 * Item statistics rules
 */
export const itemStatisticsRules = [
  createCustomStatisticsRule(
    'nuclear_fuel',
    labels.nuclear_fuel,
    data => '',
    data => data.fuel_category === 'nuclear'
  ),
  createSimpleStatisticsRule('fuel_value', labels.fuel_value),
  createCustomStatisticsRule('burnt_result', labels.spent_result, data => {
    console.log(data)
    return data.burnt_result
  }),
  createSimpleStatisticsRule('fuel_pollution', labels.fuel_pollution),
  createResistancesStatisticsRule('resistances', labels.resistances),
  createSimpleStatisticsRule('inventory_size_bonus', labels.inventory_size_bonus),

  createSimpleStatisticsRule('movement_speed_bonus', labels.movement_speed_bonus),
  createSimpleStatisticsRule('construction_area', labels.construction_area),
  createSimpleStatisticsRule('robot_limit', labels.robot_limit),
  createSimpleStatisticsRule('shield_hitpoints', labels.shield_hitpoints),
  createSimpleStatisticsRule('shield_recharge_rate', labels.shield_recharge_rate),
  createSimpleStatisticsRule('range_shooting_speed', labels.range_shooting_speed),

  createSimpleStatisticsRule('stack_size', labels.stack_size)
]

/**
 * Item section rules
 */
export const itemSectionRules = [
  createSectionRule(sectionTypes.alternative_recipes, (data, context) => {
    console.log(context)
    const recipes = Object.values(context.factorioData.recipe)
    const alternativeRecipes = recipes
      .filter(
        recipe =>
          recipe.name !== data.name &&
          recipe.results?.length > 0 &&
          recipe.results?.some(result => result.name === data.name && result.type === 'item')
      )
      .map(recipe => ({ name: recipe.name, type: 'recipe' }))
    if (alternativeRecipes.length > 0) {
      return { items: alternativeRecipes }
    }
  }),
  createSectionRule(sectionTypes.used_in, (data, context) => {
    const recipes = Object.values(context.factorioData.recipe)
    const usedIn = recipes
      .filter(
        recipe =>
          recipe.ingredients?.length > 0 &&
          recipe.ingredients?.some(ingredient => ingredient.name === data.name)
      )
      .map(recipe => ({ name: recipe.name, type: 'recipe' }))
    if (usedIn.length > 0) {
      return { items: usedIn }
    }
  }),
  createSectionRule(sectionTypes.burned_in, (data, context) => {
    const entity = Object.values(context.factorioData.entity)
    //find entities that burn this item
    const burnedIn = entity
      .filter(entity => {
        const energy_source = entity.energy_source
        if (energy_source && energy_source.type === 'burner') {
          if (energy_source?.fuel_categories?.some(category => category === data.fuel_category)) {
            return true
          }
        }
      })
      .map(entity => ({ name: entity.name, type: 'entity' }))
    if (burnedIn.length > 0) {
      return { items: burnedIn }
    }
  }),

  createSectionRule(sectionTypes.placed_in_equipment_grid, data => data.placed_in_equipment_grid),
  createSectionRule(sectionTypes.turret, data => data.turret),
  createSectionRule(sectionTypes.effect, data => data.effect),
  createSectionRule(
    sectionTypes.generates_equipment_grid_electricity,
    data => data.generates_equipment_grid_electricity
  ),
  createSectionRule(
    sectionTypes.consumes_equipment_grid_electricity,
    data => data.consumes_equipment_grid_electricity
  ),
  createSectionRule(
    sectionTypes.stores_equipment_grid_electricity,
    data => data.stores_equipment_grid_electricity
  )
]
