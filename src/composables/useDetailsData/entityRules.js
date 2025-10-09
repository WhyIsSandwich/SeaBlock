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
    M: 1000, // Megawatts (base unit)
    G: 1000000 // Gigawatts to MW
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
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      if (data.entity?.type !== 'inserter') return null
      return (data.entity?.rotation_speed * 360 * 60).toFixed(0)
    },
    condition: data => data.entity?.type === 'inserter' && data.entity?.rotation_speed !== undefined
  },
  {
    name: labels.hand_stack_size,
    order: 2,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: false,
    getValue: data => {
      if (data.entity?.type !== 'inserter') return null
      // TODO: derive from research data
      return data.entity?.bulk ? '1 + 11' : '1 + 3'
    },
    condition: data => data.entity?.type === 'inserter'
  },
  {
    name: labels.can_filter_items,
    order: 3,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => (data.entity?.filter_count ? '' : null),
    condition: data => data.entity?.filter_count !== undefined
  },
  {
    name: labels.storage_volume,
    order: 4,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.fluid_box?.volume || data.entity?.capacity,
    condition: data => {
      const volume = data.entity?.fluid_box?.volume || data.entity?.capacity
      return volume !== undefined && !data.entity?.fluid_box?.production_type
    }
  },
  {
    name: labels.max_length,
    order: 5,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.max_distance?.toFixed(0),
    condition: data => data.entity?.max_distance !== undefined
  },
  {
    name: labels.belt_speed,
    order: 6,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.speed * 60 * 8,
    condition: data => data.entity?.type === 'transport-belt' && data.entity?.speed
  },
  {
    name: labels.storage_size,
    order: 7,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.inventory_size,
    condition: data => data.entity?.inventory_size !== undefined
  },
  {
    name: labels.wire_reach,
    order: 8,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.maximum_wire_distance,
    condition: data => data.entity?.maximum_wire_distance !== undefined
  },
  {
    name: labels.supply_area,
    order: 9,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      const distance = data.entity?.supply_area_distance || data.entity?.logistics_radius
      return distance ? `${distance * 2}x${distance * 2}` : null
    },
    condition: data =>
      data.entity?.supply_area_distance !== undefined || data.entity?.logistics_radius !== undefined
  },
  {
    name: labels.construction_area,
    order: 10,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data =>
      data.entity?.construction_radius
        ? `${data.entity?.construction_radius * 2}x${data.entity?.construction_radius * 2}`
        : null,
    condition: data => data.entity?.construction_radius !== undefined
  },
  {
    name: labels.radar_coverage_distance,
    order: 11,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.radar_coverage_distance,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.entity?.radar_coverage_distance !== undefined
  },
  {
    name: labels.pumping_speed,
    order: 12,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => (data.entity?.pumping_speed ? data.entity?.pumping_speed * 60 : null),
    condition: data => data.entity?.pumping_speed !== undefined
  },
  {
    name: labels.mining_speed,
    order: 13,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => (data.entity?.mining_speed ? `${data.entity?.mining_speed}/s` : null),
    condition: data => data.entity?.mining_speed !== undefined
  },
  {
    name: labels.mining_area,
    order: 14,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      if (!data.entity?.resource_searching_radius) return null
      const value = Math.ceil(data.entity?.resource_searching_radius * 2)
      return isNaN(value) ? null : `${value}x${value}`
    },
    condition: data => data.entity?.resource_searching_radius !== undefined
  },
  {
    name: labels.crafting_speed,
    order: 15,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.crafting_speed,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.entity?.crafting_speed !== undefined
  },
  {
    name: labels.pollution,
    order: 16,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      const pollution = data.entity?.energy_source?.emissions_per_minute?.pollution
      return pollution !== undefined ? `${pollution}/m` : null
    },
    condition: data => data.entity?.energy_source?.emissions_per_minute?.pollution !== undefined
  },
  {
    name: labels.research_speed,
    order: 17,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.researching_speed,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.entity?.researching_speed !== undefined
  },
  {
    name: labels.module_slots,
    order: 18,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.module_slots,
    condition: data => data.entity?.module_slots !== undefined
  },
  {
    name: labels.cargo_capacity,
    order: 19,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.cargo_capacity,
    condition: data => data.entity?.cargo_capacity !== undefined
  },
  {
    name: labels.speed,
    order: 20,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data =>
      data.entity?.speed ? `${((data.entity?.speed * 60) / (1000 / 3600)).toFixed(1)}km/h` : null,
    condition: data => data.entity?.speed !== undefined && data.entity?.type !== 'transport-belt'
  },
  {
    name: labels.range,
    order: 21,
    type: 'statistics',
    forType: 'combat-robot',
    shownInTooltip: true,
    getValue: data => data.entity?.attack_parameters?.range,
    condition: data =>
      data.entity?.type === 'combat-robot' && data.entity?.attack_parameters?.range !== undefined
  },
  {
    name: labels.shooting_speed,
    order: 22,
    type: 'statistics',
    forType: 'combat-robot',
    shownInTooltip: true,
    getValue: data => data.entity?.attack_parameters?.cooldown,
    condition: data =>
      data.entity?.type === 'combat-robot' && data.entity?.attack_parameters?.cooldown !== undefined
  },
  {
    name: labels.max_consumption,
    order: 23,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      // Parse energy_per_tick (e.g., "1.5MW", "500kJ")
      const energyPerTick = parseEnergyString(data.entity?.energy_per_tick)
      if (!energyPerTick) return null

      // Parse energy_per_move (e.g., "0.5MJ", "100kJ")
      const energyPerMove = parseEnergyString(data.entity?.energy_per_move)
      if (!energyPerMove) return null

      // Calculate max consumption: energy per tick + (energy per move * speed)
      // Both values are now normalized to MW
      const maxConsumption =
        energyPerTick.normalizedValue + energyPerMove.normalizedValue * data.entity?.speed

      // Convert to per-second consumption (multiply by 60 ticks per second)
      return `${(maxConsumption * 60).toFixed(2)}kW`
    },
    condition: data =>
      data.entity?.energy_per_tick && data.entity?.energy_per_move && data.entity?.speed
  },
  {
    name: labels.distribution_efficiency,
    order: 24,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.distribution_efficiency,
    transform: value => (typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value),
    condition: data => data.entity?.distribution_efficiency !== undefined
  },
  {
    name: labels.continuous_coverage_distance,
    order: 25,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.continuous_coverage_distance,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.entity?.continuous_coverage_distance !== undefined
  },
  {
    name: labels.exploration_coverage_distance,
    order: 26,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.exploration_coverage_distance,
    transform: value => (typeof value === 'number' ? value.toFixed(2) : value),
    condition: data => data.entity?.exploration_coverage_distance !== undefined
  },
  {
    name: labels.base_health,
    order: 27,
    type: 'statistics',
    shownInTooltip: false,
    getValue: data => data.entity?.max_health,
    condition: data => data.entity?.max_health !== undefined
  },
  {
    name: labels.healing,
    order: 28,
    type: 'statistics',
    shownInTooltip: false,
    getValue: data => data.entity?.healing,
    condition: data => data.entity?.healing !== undefined
  },
  {
    name: labels.resistances,
    order: 29,
    type: 'statistics',
    shownInTooltip: false,
    getValue: data => {
      return {
        children: data.entity?.resistances.map(a => ({ label: a.type, value: `${a.percent}%` }))
      }
    },
    condition: data => data.entity?.resistances !== undefined
  },
  {
    name: labels.stack_size,
    order: 30,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.item?.stack_size,
    condition: data => data.item?.stack_size !== undefined
  },

  // Section rules
  {
    name: sectionTypes.turret,
    order: 1,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      return { items: [data.entity?.turret] }
    },
    condition: data => data.entity?.turret !== undefined
  },
  {
    name: sectionTypes.effect,
    order: 2,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      return { items: [data.entity?.effect] }
    },
    condition: data => data.entity?.effect !== undefined
  },
  {
    name: sectionTypes.consumes_water,
    order: 3,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: (data, context) => {
      //fluid usage = ratio of output to input heat capacity * different between input and output temperature
      const fluidName = data.entity?.fluid_box?.filter
      const inputFluid = context.factorioData.fluid[fluidName]

      const inputHeatCapacity = parseEnergyString(inputFluid?.heat_capacity)
      const temperatureDifference = data.entity?.target_temperature - 15 //might be min temperature of the input
      const power = parseEnergyString(data.entity?.energy_consumption)
      const fluidUsage =
        power.normalizedValue / (inputHeatCapacity.normalizedValue * temperatureDifference)
      return {
        statistics: [{ label: labels.fluid_consumption, value: fluidUsage }],
        items: [{ name: fluidName, type: 'fluid' }],
        itemsLabel: 'Accepted fluid',
        itemsType: 'grid'
      }
    },
    condition: data => data.entity?.type === 'boiler'
  },
  {
    name: sectionTypes.equipment_grid,
    order: 4,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: (data, context) => {
      const equipmentGridName = data.entity?.equipment_grid
      const equipmentGrid = context.factorioData['equipment-grid'][equipmentGridName]
      //is array
      const equipment_categories = equipmentGrid?.equipment_categories

      const equipmentItems = Object.values(context.factorioData.equipment)
      const equipmentGridItems = equipmentItems
        .filter(equipment =>
          equipment?.categories?.some(category => equipment_categories.includes(category))
        )
        .map(equipment => ({ name: equipment.name, type: 'equipment' }))
      return {
        statistics: [
          {
            label: labels.equipment_grid_size,
            value: `${equipmentGrid.width}x${equipmentGrid.height}`
          }
        ],
        items: equipmentGridItems,
        itemsType: 'grid'
      }
    },
    condition: data => data.entity?.equipment_grid !== undefined
  },
  {
    name: sectionTypes.vehicle_weapons,
    order: 5,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      return { items: [data.entity?.vehicle_weapons] }
    },
    condition: data => data.entity?.vehicle_weapons !== undefined
  },
  {
    name: sectionTypes.vehicle,
    order: 6,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      return { items: [data.entity?.vehicle] }
    },
    condition: data => data.entity?.vehicle !== undefined
  },
  {
    name: sectionTypes.burnable_fuel,
    order: 7,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: (data, context) => {
      const chemicalFuels = Object.values(context.factorioData.item)
        .filter(item => item.fuel_category === 'chemical')
        .map(item => ({ name: item.name, type: 'item' }))
      return {
        statistics: [
          {
            label: labels.max_consumption,
            value: data.entity?.energy_consumption || data.entity?.consumption
          }
        ],
        items: chemicalFuels,
        itemsLabel: 'Accepted fuel',
        itemsType: 'grid'
      }
    },
    condition: data =>
      data.entity?.energy_source?.type === 'burner' &&
      data.entity?.energy_source?.fuel_categories?.includes('chemical')
  },
  {
    name: sectionTypes.generates_steam,
    order: 8,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: (data, context) => {
      //fluid usage = ratio of output to input heat capacity * different between input and output temperature
      const fluidName = data.entity?.output_fluid_box?.filter
      const outputFluid = context.factorioData.fluid[fluidName]

      const outputHeatCapacity = parseEnergyString(outputFluid?.heat_capacity)
      const temperatureDifference = data.entity?.target_temperature - 15 //15 might be min temperature of the input
      const power = parseEnergyString(data.entity?.energy_consumption)
      const fluidUsage =
        power.normalizedValue / (outputHeatCapacity.normalizedValue * temperatureDifference)
      return {
        statistics: [{ label: labels.fluid_output, value: fluidUsage }],
        items: [{ name: fluidName, type: 'fluid' }],
        itemsLabel: 'Result fluid',
        itemsType: 'grid'
      }
    },
    condition: data => data.entity?.type === 'boiler'
  },
  {
    name: sectionTypes.consumes_steam,
    order: 9,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: (data, context) => {
      if (!data.entity?.fluid_usage_per_tick) return null
      const Fluids = context.factorioData.fluid
      const filteredFluid = data.entity?.fluid_box?.filter
      const allowedFluid = Fluids[filteredFluid]
      if (!allowedFluid) return null

      const workingFluid = {
        name: allowedFluid.name,
        type: 'fluid'
      }

      return {
        statistics: [
          { label: labels.fluid_consumption, value: data.entity?.fluid_usage_per_tick * 60 },
          { label: labels.fluid_max_temperature, value: data.entity?.maximum_temperature }
        ],
        items: [workingFluid],
        itemsLabel: 'Accepted fluid'
      }
    },
    condition: data => data.entity?.fluid_usage_per_tick !== undefined
  },
  {
    name: sectionTypes.stores_electricity,
    order: 10,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      return {
        statistics: [
          { label: labels.energy_capacity, value: data.entity?.energy_source?.buffer_capacity },
          { label: labels.max_input, value: data.entity?.energy_source?.input_flow_limit },
          { label: labels.max_output, value: data.entity?.energy_source?.output_flow_limit }
        ]
      }
    },
    condition: data => data.entity?.type === 'accumulator'
  },
  {
    name: sectionTypes.consumes_nuclear_fuel,
    order: 11,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      return {
        statistics: [
          {
            label: labels.nuclear_fuel_consumption,
            value: data.entity?.consumption
          }
        ]
      }
    },
    condition: data =>
      data.entity?.energy_source?.type === 'burner' &&
      data.entity?.energy_source?.fuel_categories?.includes('nuclear')
  },
  {
    name: sectionTypes.generates_heat,
    order: 12,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      return {
        statistics: [
          { label: labels.heat_generation, value: data.entity?.consumption },
          { label: labels.neighbour_bonus, value: data.entity?.neighbour_bonus }
        ]
      }
    },
    condition: data => data.entity.type === 'reactor'
  },
  {
    name: sectionTypes.consumes_heat,
    order: 13,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      return {
        statistics: [
          { label: labels.energy_consumption, value: data.entity?.energy_consumption },
          { label: labels.min_temperature, value: data.entity?.energy_source?.min_temperature }
        ]
      }
    },
    condition: data => data.entity?.energy_source && data.entity?.energy_source.type === 'heat'
  },
  {
    name: sectionTypes.consumes_electricity,
    order: 14,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      const energyUsage = parseEnergyString(data.entity?.energy_usage)
      if (!energyUsage) return null
      const minConsumption = Math.ceil(energyUsage.normalizedValue * 0.03) //afaik 3% is min consumption
      const maxConsumption = Math.ceil(energyUsage.normalizedValue * 1.03)
      return {
        statistics: [
          { label: labels.max_consumption, value: maxConsumption },
          { label: labels.min_consumption, value: minConsumption }
        ]
      }
    },
    condition: data =>
      data.entity?.energy_source &&
      data.entity?.energy_source.type === 'electric' &&
      data.entity.energy_usage
  },
  {
    name: sectionTypes.generates_electricity,
    order: 15,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: (data, context) => {
      if (data.entity?.type === 'solar-panel')
        return { statistics: [{ label: labels.max_output, value: data.entity?.production }] }
      else {
        const fluidName = data.entity?.fluid_box?.filter
        const fluid = context.factorioData.fluid[fluidName]
        const fluidAmount = data.entity?.fluid_usage_per_tick
        const fluidTemperature = data.entity?.maximum_temperature
        const fluidHeatCapacity = parseEnergyString(fluid?.heat_capacity)

        const power = fluidAmount * (fluidTemperature - 15) * fluidHeatCapacity.normalizedValue * 60
        return { statistics: [{ label: labels.max_output, value: power }] }
      }
    },
    condition: data => data.entity.type === 'steam-engine' || data.entity.type === 'solar-panel'
  }
]

// Legacy exports for backward compatibility
export const entityStatisticsRules = entityRules.filter(rule => rule.type === 'statistics')
export const entitySectionRules = entityRules.filter(rule => rule.type === 'section')
