import { labels, sectionTypes } from '../detailsDataTypes.js'

import {
  createSimpleStatisticsRule,
  createCustomStatisticsRule,
  createStatisticsRule,
  createSectionRule,
  createResistancesStatisticsRule,
  transforms
} from './rulesEngine.js'

/**
 * Parse energy string and extract value and unit
 * @param {string} energyString - String like "1.5MW", "0.5kJ", "2.3GW"
 * @returns {{value: number, unit: string, normalizedValue: number} | null} Parsed energy data or null if invalid
 * @example
 * parseEnergyString("1.5MW") // {value: 1.5, unit: "MW", normalizedValue: 1.5}
 * parseEnergyString("500kJ") // {value: 500, unit: "kJ", normalizedValue: 0.5}
 */
function parseEnergyString(energyString) {
  if (!energyString || typeof energyString !== 'string') return null

  // Match number and unit (e.g., "1.5MW" -> ["1.5", "MW"])
  const match = energyString.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/)
  if (!match) return null

  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()

  const unitMultipliers = {
    K: 1, // Kilowatts to MW
    M: 0.001, // Megawatts (base unit)
    G: 0.000001 // Gigawatts to MW
  }

  const multiplier = unitMultipliers[unit[0]] || 1
  if (multiplier === undefined) return null

  return {
    value,
    unit,
    normalizedValue: value * multiplier
  }
}

/**
 * Entity statistics rules
 */
export const entityStatisticsRules = [
  // Simple rules with common transformations
  createCustomStatisticsRule('rotation_speed', labels.rotation_speed, data => {
    if (data.type != 'inserter') {
      return null
    }
    const value = (data.rotation_speed * 360 * 60).toFixed(0)
    return value
  }),
  createCustomStatisticsRule('hand_stack_size', labels.hand_stack_size, data => {
    if (data.type != 'inserter') {
      return null
    }
    // TODO: derive from research data
    if (data.bulk) {
      return '1 + 11'
    } else {
      return '1 + 3'
    }
  }),
  createSimpleStatisticsRule('filter_count', labels.can_filter_items, () => ''),
  createCustomStatisticsRule(
    'storage_volume',
    labels.storage_volume,
    data => data.fluid_box?.volume,
    data => data.fluid_box?.volume && !data.fluid_box?.production_type
  ),
  createCustomStatisticsRule('storage_volume', labels.storage_volume, data => data.capacity),
  createSimpleStatisticsRule('max_distance', labels.max_length, data => data.toFixed(0)),
  createCustomStatisticsRule('speed', labels.belt_speed, data =>
    data.type == 'transport-belt' ? data.speed * 60 * 8 : null
  ),
  createSimpleStatisticsRule('inventory_size', labels.storage_size),
  createSimpleStatisticsRule('maximum_wire_distance', labels.wire_reach),
  createSimpleStatisticsRule(
    'supply_area_distance',
    labels.supply_area,
    data => `${data * 2}x${data * 2}`
  ),
  createSimpleStatisticsRule(
    'logistics_radius',
    labels.supply_area,
    data => `${data * 2}x${data * 2}`
  ),
  createSimpleStatisticsRule(
    'construction_radius',
    labels.construction_area,
    data => `${data * 2}x${data * 2}`
  ),
  createSimpleStatisticsRule(
    'radar_coverage_distance',
    labels.radar_coverage_distance,
    transforms.formatNumber
  ),
  createSimpleStatisticsRule('pumping_speed', labels.pumping_speed, data => data * 60),
  createSimpleStatisticsRule('mining_speed', labels.mining_speed, data => `${data}/s`),
  createSimpleStatisticsRule('resource_searching_radius', labels.mining_area, data => {
    const value = Math.ceil(data * 2)
    if (value != 'NaN') {
      return `${value}x${value}`
    }
  }),
  createSimpleStatisticsRule('crafting_speed', labels.crafting_speed, transforms.formatNumber),
  createCustomStatisticsRule('emissions_per_second', labels.pollution, data => {
    const pollution = data.energy_source?.emissions_per_minute?.pollution
    return pollution !== undefined ? `${pollution}/m` : undefined
  }),
  createSimpleStatisticsRule('researching_speed', labels.research_speed, transforms.formatNumber),
  createSimpleStatisticsRule('module_slots', labels.module_slots),
  createSimpleStatisticsRule('cargo_capacity', labels.cargo_capacity),
  //Speed is in tiles/tick a tile is 1m so we need to multiply by 60 to get m/s
  //Then divide by x to get in km/h 1000
  createSimpleStatisticsRule(
    'speed',
    labels.speed,
    data => ((data * 60) / (1000 / 3600)).toFixed(1) + 'km/h'
  ),
  createCustomStatisticsRule(
    'range',
    labels.range,
    data => data.attack_parameters?.range,
    data => data.type === 'combat-robot'
  ),
  createCustomStatisticsRule(
    'shooting_speed',
    labels.shooting_speed,
    data => data.attack_parameters?.cooldown,
    data => data.type === 'combat-robot'
  ),
  createCustomStatisticsRule('max_consumption', labels.max_consumption, data => {
    // Parse energy_per_tick (e.g., "1.5MW", "500kJ")
    const energyPerTick = parseEnergyString(data.energy_per_tick)
    if (!energyPerTick) return undefined

    // Parse energy_per_move (e.g., "0.5MJ", "100kJ")
    const energyPerMove = parseEnergyString(data.energy_per_move)
    if (!energyPerMove) return undefined

    // Calculate max consumption: energy per tick + (energy per move * speed)
    // Both values are now normalized to MW
    const maxConsumption =
      energyPerTick.normalizedValue + energyPerMove.normalizedValue * data.speed

    // Convert to per-second consumption (multiply by 60 ticks per second)
    return (maxConsumption * 60).toFixed(2) + 'kW'
  }),
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
  createStatisticsRule('max_health', labels.base_health, { tooltip: false }),
  createStatisticsRule('healing', labels.healing, { tooltip: false }),
  createResistancesStatisticsRule('resistances', labels.resistances, { tooltip: false }),
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
  createSectionRule(sectionTypes.consumes_steam, (data, context) => {
    if (!data.fluid_usage_per_tick) {
      return null
    }
    const Fluids = context.factorioData.fluid

    const filteredFluid = data.fluid_box?.filter

    const allowedFluid = Fluids[filteredFluid]
    if (!allowedFluid) {
      return null
    }
    const workingFluid = {
      name: allowedFluid.name,
      type: 'fluid'
    }

    return {
      statistics: [
        { label: labels.fluid_consumption, value: data?.fluid_usage_per_tick * 60 },
        { label: labels.fluid_max_temperature, value: data?.maximum_temperature }
      ],
      items: [workingFluid]
    }
  }),
  createSectionRule(sectionTypes.stores_electricity, data => data.stores_electricity),
  createSectionRule(sectionTypes.consumes_nuclear_fuel, data => data.consumes_nuclear_fuel),
  createSectionRule(sectionTypes.generates_heat, data => data.generates_heat),
  createSectionRule(sectionTypes.consumes_heat, data => data.consumes_heat),
  createSectionRule(sectionTypes.consumes_electricity, data => data.consumes_electricity),
  createSectionRule(sectionTypes.generates_electricity, data => data.generates_electricity)
]
