import { labels, sectionTypes } from '../detailsDataTypes.js'

import {
  createSimpleStatisticsRule,
  createCustomStatisticsRule,
  createStatisticsRule,
  createSectionRule,
  transforms
} from './rulesEngine.js'

/**
 * Entity statistics rules
 */
export const entityStatisticsRules = [
  // Simple rules with common transformations
  createSimpleStatisticsRule('rotation_speed', labels.rotation_speed, transforms.formatNumber),
  createSimpleStatisticsRule('hand_stack_size', labels.hand_stack_size),
  createSimpleStatisticsRule('can_filter_items', labels.can_filter_items, transforms.formatBoolean),
  createSimpleStatisticsRule('storage_volume', labels.storage_volume, transforms.formatNumber),
  createSimpleStatisticsRule('max_length', labels.max_length, transforms.formatNumber),
  createSimpleStatisticsRule('belt_speed', labels.belt_speed, transforms.formatNumber),
  createSimpleStatisticsRule('storage_size', labels.storage_size),
  createSimpleStatisticsRule('wire_reach', labels.wire_reach, transforms.formatNumber),
  createSimpleStatisticsRule(
    'supply_area_electric_roboport',
    labels.supply_area,
    transforms.formatNumber
  ),
  createSimpleStatisticsRule(
    'construction_area',
    labels.construction_area,
    transforms.formatNumber
  ),
  createSimpleStatisticsRule(
    'radar_coverage_distance',
    labels.radar_coverage_distance,
    transforms.formatNumber
  ),
  createSimpleStatisticsRule('pumping_speed', labels.pumping_speed, transforms.formatNumber),
  createSimpleStatisticsRule('mining_speed', labels.mining_speed, transforms.formatNumber),
  createSimpleStatisticsRule('mining_area', labels.mining_area, transforms.formatNumber),
  createSimpleStatisticsRule('crafting_speed', labels.crafting_speed, transforms.formatNumber),
  createSimpleStatisticsRule('emissions_per_second', labels.pollution, transforms.formatNumber),
  createSimpleStatisticsRule('researching_speed', labels.research_speed, transforms.formatNumber),
  createSimpleStatisticsRule('module_slots', labels.module_slots),
  createSimpleStatisticsRule('cargo_capacity', labels.cargo_capacity),
  createSimpleStatisticsRule('speed', labels.speed, transforms.formatNumber),
  createSimpleStatisticsRule('range', labels.range, transforms.formatNumber),
  createSimpleStatisticsRule('shooting_speed', labels.shooting_speed, transforms.formatNumber),
  createSimpleStatisticsRule('max_consumption', labels.max_consumption, transforms.formatNumber),
  createSimpleStatisticsRule(
    'distribution_efficiency',
    labels.distribution_efficiency,
    transforms.formatPercent
  ),
  createSimpleStatisticsRule(
    'continuous_coverage_distance',
    labels.continuous_coverage_distance,
    transforms.formatNumber
  ),
  createSimpleStatisticsRule(
    'exploration_coverage_distance',
    labels.exploration_coverage_distance,
    transforms.formatNumber
  ),

  // Complex rules (need special handling)
  createStatisticsRule('base_health', labels.base_health, { tooltip: false }),
  createStatisticsRule('healing', labels.healing, { tooltip: false }),
  createStatisticsRule('resistances', labels.resistances, { tooltip: false }),
  createCustomStatisticsRule('stack_size', labels.stack_size, data => data.item?.stack_size)
]

/**
 * Entity section rules
 */
export const entitySectionRules = [
  createSectionRule(sectionTypes.turret, data => data.turret),
  createSectionRule(sectionTypes.effect, data => data.effect),
  createSectionRule(sectionTypes.consumes_water, data => data.consumes_water),
  createSectionRule(sectionTypes.equipment_grid, data => data.equipment_grid),
  createSectionRule(sectionTypes.vehicle_weapons, data => data.vehicle_weapons),
  createSectionRule(sectionTypes.vehicle, data => data.vehicle),
  createSectionRule(sectionTypes.burnable_fuel, data => data.burnable_fuel),
  createSectionRule(sectionTypes.generates_steam, data => data.generates_steam),
  createSectionRule(sectionTypes.stores_electricity, data => data.stores_electricity),
  createSectionRule(sectionTypes.consumes_nuclear_fuel, data => data.consumes_nuclear_fuel),
  createSectionRule(sectionTypes.generates_heat, data => data.generates_heat),
  createSectionRule(sectionTypes.consumes_heat, data => data.consumes_heat),
  createSectionRule(sectionTypes.consumes_electricity, data => data.consumes_electricity),
  createSectionRule(sectionTypes.generates_electricity, data => data.generates_electricity)
]
