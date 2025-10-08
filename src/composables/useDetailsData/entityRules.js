import { labels, sectionTypes } from '../detailsDataTypes.js'

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
 * Entity rules - unified format for both statistics and sections
 */
export const entityRules = [
  // Statistics rules
  {
    name: labels.rotation_speed,
    order: 1,
    type: 'statistics',
    forType: 'inserter',
    shownInTooltip: true,
    getValue: data => {
      if (data.type !== 'inserter') return null
      return (data.rotation_speed * 360 * 60).toFixed(0)
    },
    condition: data => data.type === 'inserter' && data.rotation_speed !== undefined
  },
  {
    name: labels.hand_stack_size,
    order: 2,
    type: 'statistics',
    forType: 'inserter',
    shownInTooltip: true,
    getValue: data => {
      if (data.type !== 'inserter') return null
      // TODO: derive from research data
      return data.bulk ? '1 + 11' : '1 + 3'
    },
    condition: data => data.type === 'inserter'
  },
  {
    name: labels.can_filter_items,
    order: 3,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => (data.filter_count ? '' : null),
    condition: data => data.filter_count !== undefined
  },
  {
    name: labels.storage_volume,
    order: 4,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.fluid_box?.volume || data.capacity,
    condition: data => {
      const volume = data.fluid_box?.volume || data.capacity
      return volume !== undefined && !data.fluid_box?.production_type
    }
  },
  {
    name: labels.max_length,
    order: 5,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.max_distance?.toFixed(0),
    condition: data => data.max_distance !== undefined
  },
  {
    name: labels.belt_speed,
    order: 6,
    type: 'statistics',
    forType: 'transport-belt',
    shownInTooltip: true,
    getValue: data => (data.type === 'transport-belt' ? data.speed * 60 * 8 : null),
    condition: data => data.type === 'transport-belt' && data.speed !== undefined
  },
  {
    name: labels.storage_size,
    order: 7,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.inventory_size,
    condition: data => data.inventory_size !== undefined
  },
  {
    name: labels.wire_reach,
    order: 8,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.maximum_wire_distance,
    condition: data => data.maximum_wire_distance !== undefined
  },
  {
    name: labels.supply_area,
    order: 9,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => {
      const distance = data.supply_area_distance || data.logistics_radius
      return distance ? `${distance * 2}x${distance * 2}` : null
    },
    condition: data =>
      data.supply_area_distance !== undefined || data.logistics_radius !== undefined
  },
  {
    name: labels.construction_area,
    order: 10,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data =>
      data.construction_radius
        ? `${data.construction_radius * 2}x${data.construction_radius * 2}`
        : null,
    condition: data => data.construction_radius !== undefined
  },
  {
    name: labels.radar_coverage_distance,
    order: 11,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.radar_coverage_distance,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.radar_coverage_distance !== undefined
  },
  {
    name: labels.pumping_speed,
    order: 12,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => (data.pumping_speed ? data.pumping_speed * 60 : null),
    condition: data => data.pumping_speed !== undefined
  },
  {
    name: labels.mining_speed,
    order: 13,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => (data.mining_speed ? `${data.mining_speed}/s` : null),
    condition: data => data.mining_speed !== undefined
  },
  {
    name: labels.mining_area,
    order: 14,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => {
      if (!data.resource_searching_radius) return null
      const value = Math.ceil(data.resource_searching_radius * 2)
      return isNaN(value) ? null : `${value}x${value}`
    },
    condition: data => data.resource_searching_radius !== undefined
  },
  {
    name: labels.crafting_speed,
    order: 15,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.crafting_speed,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.crafting_speed !== undefined
  },
  {
    name: labels.pollution,
    order: 16,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => {
      const pollution = data.energy_source?.emissions_per_minute?.pollution
      return pollution !== undefined ? `${pollution}/m` : null
    },
    condition: data => data.energy_source?.emissions_per_minute?.pollution !== undefined
  },
  {
    name: labels.research_speed,
    order: 17,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.researching_speed,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.researching_speed !== undefined
  },
  {
    name: labels.module_slots,
    order: 18,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.module_slots,
    condition: data => data.module_slots !== undefined
  },
  {
    name: labels.cargo_capacity,
    order: 19,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.cargo_capacity,
    condition: data => data.cargo_capacity !== undefined
  },
  {
    name: labels.speed,
    order: 20,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => (data.speed ? `${((data.speed * 60) / (1000 / 3600)).toFixed(1)}km/h` : null),
    condition: data => data.speed !== undefined
  },
  {
    name: labels.range,
    order: 21,
    type: 'statistics',
    forType: 'combat-robot',
    shownInTooltip: true,
    getValue: data => data.attack_parameters?.range,
    condition: data => data.type === 'combat-robot' && data.attack_parameters?.range !== undefined
  },
  {
    name: labels.shooting_speed,
    order: 22,
    type: 'statistics',
    forType: 'combat-robot',
    shownInTooltip: true,
    getValue: data => data.attack_parameters?.cooldown,
    condition: data =>
      data.type === 'combat-robot' && data.attack_parameters?.cooldown !== undefined
  },
  {
    name: labels.max_consumption,
    order: 23,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => {
      // Parse energy_per_tick (e.g., "1.5MW", "500kJ")
      const energyPerTick = parseEnergyString(data.energy_per_tick)
      if (!energyPerTick) return null

      // Parse energy_per_move (e.g., "0.5MJ", "100kJ")
      const energyPerMove = parseEnergyString(data.energy_per_move)
      if (!energyPerMove) return null

      // Calculate max consumption: energy per tick + (energy per move * speed)
      // Both values are now normalized to MW
      const maxConsumption =
        energyPerTick.normalizedValue + energyPerMove.normalizedValue * data.speed

      // Convert to per-second consumption (multiply by 60 ticks per second)
      return `${(maxConsumption * 60).toFixed(2)}kW`
    },
    condition: data => data.energy_per_tick && data.energy_per_move && data.speed
  },
  {
    name: labels.distribution_efficiency,
    order: 24,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.distribution_efficiency,
    transform: value => (typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value),
    condition: data => data.distribution_efficiency !== undefined
  },
  {
    name: labels.continuous_coverage_distance,
    order: 25,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.continuous_coverage_distance,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.continuous_coverage_distance !== undefined
  },
  {
    name: labels.exploration_coverage_distance,
    order: 26,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.exploration_coverage_distance,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.exploration_coverage_distance !== undefined
  },
  {
    name: labels.base_health,
    order: 27,
    type: 'statistics',
    shownInTooltip: false,
    getValue: data => data.max_health,
    condition: data => data.max_health !== undefined
  },
  {
    name: labels.healing,
    order: 28,
    type: 'statistics',
    shownInTooltip: false,
    getValue: data => data.healing,
    condition: data => data.healing !== undefined
  },
  {
    name: labels.resistances,
    order: 29,
    type: 'statistics',
    shownInTooltip: false,
    getValue: data => data.resistances,
    condition: data => data.resistances !== undefined
  },
  {
    name: labels.stack_size,
    order: 30,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.item?.stack_size,
    condition: data => data.item?.stack_size !== undefined
  },

  // Section rules
  {
    name: sectionTypes.turret,
    order: 1,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.turret,
    condition: data => data.turret !== undefined
  },
  {
    name: sectionTypes.effect,
    order: 2,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.effect,
    condition: data => data.effect !== undefined
  },
  {
    name: sectionTypes.consumes_water,
    order: 3,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.consumes_water,
    condition: data => data.consumes_water !== undefined
  },
  {
    name: sectionTypes.equipment_grid,
    order: 4,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.equipment_grid,
    condition: data => data.equipment_grid !== undefined
  },
  {
    name: sectionTypes.vehicle_weapons,
    order: 5,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.vehicle_weapons,
    condition: data => data.vehicle_weapons !== undefined
  },
  {
    name: sectionTypes.vehicle,
    order: 6,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.vehicle,
    condition: data => data.vehicle !== undefined
  },
  {
    name: sectionTypes.burnable_fuel,
    order: 7,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.burnable_fuel,
    condition: data => data.burnable_fuel !== undefined
  },
  {
    name: sectionTypes.generates_steam,
    order: 8,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.generates_steam,
    condition: data => data.generates_steam !== undefined
  },
  {
    name: sectionTypes.consumes_steam,
    order: 9,
    type: 'section',
    shownInTooltip: true,
    getValue: (data, context) => {
      if (!data.fluid_usage_per_tick) return null
      const Fluids = context.factorioData.fluid
      const filteredFluid = data.fluid_box?.filter
      const allowedFluid = Fluids[filteredFluid]
      if (!allowedFluid) return null

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
    },
    condition: data => data.fluid_usage_per_tick !== undefined
  },
  {
    name: sectionTypes.stores_electricity,
    order: 10,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.stores_electricity,
    condition: data => data.stores_electricity !== undefined
  },
  {
    name: sectionTypes.consumes_nuclear_fuel,
    order: 11,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.consumes_nuclear_fuel,
    condition: data => data.consumes_nuclear_fuel !== undefined
  },
  {
    name: sectionTypes.generates_heat,
    order: 12,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.generates_heat,
    condition: data => data.generates_heat !== undefined
  },
  {
    name: sectionTypes.consumes_heat,
    order: 13,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.consumes_heat,
    condition: data => data.consumes_heat !== undefined
  },
  {
    name: sectionTypes.consumes_electricity,
    order: 14,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.consumes_electricity,
    condition: data => data.consumes_electricity !== undefined
  },
  {
    name: sectionTypes.generates_electricity,
    order: 15,
    type: 'section',
    shownInTooltip: true,
    getValue: data => data.generates_electricity,
    condition: data => data.generates_electricity !== undefined
  }
]

// Legacy exports for backward compatibility
export const entityStatisticsRules = entityRules.filter(rule => rule.type === 'statistics')
export const entitySectionRules = entityRules.filter(rule => rule.type === 'section')
