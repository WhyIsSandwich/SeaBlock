import { createSimpleStatisticsRule, createSectionRule } from './rulesEngine.js'
import { labels, sectionTypes } from '../useDetailsData.js'

/**
 * Item statistics rules
 */
export const itemStatisticsRules = [
  createSimpleStatisticsRule('nuclear_fuel', labels.nuclear_fuel),
  createSimpleStatisticsRule('spent_result', labels.spent_result),
  createSimpleStatisticsRule('fuel_value', labels.fuel_value),
  createSimpleStatisticsRule('fuel_pollution', labels.fuel_pollution),
  createSimpleStatisticsRule('resistances', labels.resistances),
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
