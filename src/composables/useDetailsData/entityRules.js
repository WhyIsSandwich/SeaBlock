import { labels, sectionTypes } from '../detailsDataTypes.js'
import { parseEnergyString, formatEnergyValue } from '../energyUtils.js'
import { parseAttackParameters } from '../useAttackParametersParser.js'

/** @param {{ tile_width?: number, tile_height?: number, collision_box?: unknown }} | null | undefined entity */
function getEntityFootprintLabel(entity) {
  if (!entity) return null
  const { tile_width: tw, tile_height: th } = entity
  if (typeof tw === 'number' && typeof th === 'number' && tw > 0 && th > 0) {
    return `${Math.round(tw)}x${Math.round(th)}`
  }
  const box = entity.collision_box
  if (!Array.isArray(box) || box.length < 2) return null
  const cornerCoord = (corner, axis) => {
    if (Array.isArray(corner)) return corner[axis]
    if (corner && typeof corner === 'object') return axis === 0 ? corner.x : corner.y
    return undefined
  }
  const [lt, rb] = box
  const x1 = cornerCoord(lt, 0)
  const y1 = cornerCoord(lt, 1)
  const x2 = cornerCoord(rb, 0)
  const y2 = cornerCoord(rb, 1)
  if (![x1, y1, x2, y2].every(n => typeof n === 'number' && Number.isFinite(n))) return null
  const w = Math.ceil(Math.abs(x2 - x1))
  const h = Math.ceil(Math.abs(y2 - y1))
  if (w < 1 || h < 1) return null
  return `${w}x${h}`
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
    shownInTooltip: true,
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
    name: labels.footprint,
    order: 5.5,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => getEntityFootprintLabel(data.entity),
    condition: data => getEntityFootprintLabel(data.entity) !== null
  },
  {
    name: labels.belt_speed,
    order: 6,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.speed * 60 * 8,
    condition: data =>
      (data.entity?.type === 'transport-belt' || data.entity?.type === 'splitter') &&
      data.entity?.speed
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
    condition: data =>
      data.entity?.speed !== undefined &&
      data.entity?.type !== 'transport-belt' &&
      data.entity?.type !== 'splitter'
  },
  {
    name: labels.range,
    order: 21,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.attack_parameters?.range,
    condition: data =>
      data.entity?.type === 'combat-robot' && data.entity?.attack_parameters?.range !== undefined
  },
  {
    name: labels.shooting_speed,
    order: 22,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.attack_parameters?.cooldown,
    condition: data =>
      data.entity?.type === 'combat-robot' && data.entity?.attack_parameters?.cooldown !== undefined
  },
  {
    //bot consumption
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

      // Calculate max consumption: energy per tick + (energy per tile * speed (tiles per second))
      // Both values are now normalized to MW
      const maxConsumption =
        (energyPerTick.normalizedValue + energyPerMove.normalizedValue * data.entity?.speed) * 60
      console.log('maxConsumption', maxConsumption)
      // Convert to per-second consumption (multiply by 60 ticks per second)
      return formatEnergyValue(maxConsumption, 'W', { forceUnit: 'k' })
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
    getValue: (data, context) => {
      const damageTypes = Object.values(context.factorioData['damage-type'])
      return {
        children: data.entity?.resistances.map(resistance => {
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
    condition: data => data.entity?.resistances?.length > 0
  },
  {
    name: labels.stack_size,
    order: 30,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.item?.stack_size,
    condition: (data, context) =>
      data.item?.stack_size !== undefined && !context.types?.includes('item')
  },

  // Section rules
  {
    name: sectionTypes.turret,
    order: 1,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: (data, context) => {
      // Handle regular turrets
      if (data.entity?.attack_parameters) {
        const turret = data.entity?.attack_parameters
        const statistics = []

        if (turret.range) {
          statistics.push({ label: 'Range', value: turret.range })
        }
        if (turret.min_range) {
          statistics.push({ label: 'Minimum range', value: turret.min_range })
        }
        if (turret.cooldown && data.entity?.type !== 'fluid-turret') {
          statistics.push({
            label: 'Shooting speed',
            value: `${(60 / turret.cooldown).toFixed(1)}/s`
          })
        }
        if (turret.energy_consumption) {
          statistics.push({
            label: 'Fluid consumption',
            value: `${turret.fluid_consumption.toFixed(1)}/s`
          })
        }

        if (data.entity?.type === 'fluid-turret') {
          statistics.push({
            label: 'Fluid consumption',
            value: `${((turret.fluid_consumption * 60) / turret.cooldown).toFixed(1)}/s`
          })
          const fluidItems = turret.fluids.map(fluid => ({ name: fluid.type, type: 'fluid' }))
          return {
            statistics,
            items: fluidItems,
            itemsLabel: 'Fluid consumption',
            itemsType: 'grid'
          }
        }

        return {
          statistics
        }
      }

      // Handle unit attack parameters (turret-like behavior)
      if (data.entity?.attack_parameters) {
        const attack = data.entity.attack_parameters
        const statistics = []

        if (attack.range) {
          statistics.push({ label: 'Range', value: attack.range })
        }
        if (attack.min_range) {
          statistics.push({ label: 'Minimum range', value: attack.min_range })
        }
        if (attack.cooldown) {
          statistics.push({
            label: 'Shooting speed',
            value: `${(60 / attack.cooldown).toFixed(1)}/s`
          })
        }
        if (attack.damage_modifier) {
          statistics.push({ label: 'Damage modifier', value: `${attack.damage_modifier}%` })
        }

        return {
          statistics
        }
      }

      return null
    },
    condition: data => data.entity?.attack_parameters !== undefined
  },
  {
    name: sectionTypes.mined_by,
    order: 2,
    type: 'section',
    forType: 'entity',
    shownInTooltip: false,
    getValue: (data, context) => {
      const miningDrills = Object.values(context.factorioData.entity).filter(
        entity => entity.type === 'mining-drill'
      )
      const statistics = []
      if (data.entity?.minable?.required_fluid) {
        statistics.push({
          label: 'Fluid requirements',
          value: `[fluid=${data.entity.minable.required_fluid}] x ${data.entity.minable.fluid_amount}`
        })
      }

      const filteredMiningDrills = miningDrills
        .filter(drill => {
          // Check if resource category matches
          const categoryMatch = drill?.resource_categories?.includes(
            data?.entity?.category || 'basic-solid'
          )

          // If resource requires fluid, only show drills that have input_fluid_box
          if (data.entity?.minable?.required_fluid) {
            return categoryMatch && drill?.input_fluid_box
          }

          return categoryMatch
        })
        .map(drill => ({ name: drill.name, type: 'entity' }))
      return { items: filteredMiningDrills, itemsType: 'list', statistics }
    },
    condition: data => data.entity?.type === 'resource'
  },
  {
    name: sectionTypes.can_mine,
    order: 2,
    type: 'section',
    forType: 'entity',
    shownInTooltip: false,
    getValue: (data, context) => {
      const resources = Object.values(context.factorioData.entity).filter(
        entity => entity.type === 'resource'
      )
      const filteredResources = resources
        .filter(resource => {
          // Check if resource category matches
          const categoryMatch = data.entity?.resource_categories?.includes(
            resource.category || 'basic-solid'
          )

          // If mining drill has input_fluid_box, it can mine fluid-required resources
          if (data.entity?.input_fluid_box && resource.minable?.required_fluid) {
            return categoryMatch
          }

          // If mining drill doesn't have input_fluid_box, it can't mine fluid-required resources
          if (!data.entity?.input_fluid_box && resource.minable?.required_fluid) {
            return false
          }

          return categoryMatch
        })
        .map(resource => ({ name: resource.name, type: 'entity' }))
      return { items: filteredResources, itemsType: 'grid' }
    },
    condition: data => data.entity?.type === 'mining-drill'
  },
  {
    name: labels.mining_time,
    order: 3,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.minable?.mining_time,
    condition: data =>
      data.entity?.type === 'resource' && data.entity?.minable?.mining_time !== undefined
  },
  {
    name: labels.resource_hardness,
    order: 4,
    type: 'statistics',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => data.entity?.minable?.hardness,
    condition: data =>
      data.entity?.type === 'resource' && data.entity?.minable?.hardness !== undefined
  },
  {
    name: sectionTypes.minable_results,
    order: 6,
    type: 'section',
    forType: 'entity',
    shownInTooltip: false,
    getValue: (data, context) => {
      let results = data.entity.minable.results?.map(result => {
        let amountLabel = ''

        // Handle different amount types like we did for recipes
        if (result.amount !== undefined) {
          // Simple amount
          amountLabel = ` x ${result.amount}`
        } else if (result.amount_min !== undefined && result.amount_max !== undefined) {
          // Range amount
          if (result.amount_min === result.amount_max) {
            amountLabel = ` x ${result.amount_min}`
          } else {
            amountLabel = ` x ${result.amount_min}-${result.amount_max}`
          }
        } else if (result.amount_min !== undefined) {
          // Only min amount
          amountLabel = ` x ${result.amount_min}+`
        } else {
          // Default to 1 if no amount specified
          amountLabel = ' x 1'
        }

        // Add probability if it's not 1 (100%)
        if (result.probability !== undefined && result.probability !== 1) {
          const percentage = Math.round(result.probability * 100)
          amountLabel += ` (${percentage}%)`
        }

        return {
          name: result.name,
          type: result.type,
          label: `{{${result.type}_name}}${amountLabel}`
        }
      })

      if (data.entity.minable.result) {
        results = [
          {
            name: data.entity.minable.result,
            type: 'item',
            label: `{{item_name}} x ${data.entity.minable.count}`
          }
        ]
      }
      results = results?.filter(result => result.name !== data.entity.name)
      return { items: results, itemsType: 'list' }
    },
    condition: data => data.entity?.minable && data.entity?.minable?.results?.length > 0,
    postCondition: data => data?.items?.length > 0
  },
  {
    name: sectionTypes.can_extract,
    order: 5,
    type: 'section',
    forType: 'entity',
    shownInTooltip: false,
    getValue: (data, context) => {
      const tiles = Object.values(context.factorioData.tile)
      const fluid = tiles
        .filter(tile => tile.fluid)
        .map(tile => ({ name: tile.name, type: 'tile' }))

      return { items: fluid, itemsType: 'grid' }
    },
    condition: data => data.entity?.type === 'offshore-pump'
  },
  {
    name: sectionTypes.effect,
    order: 2,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: (data, context) => {
      // Get attack parameters from entity or gun item
      let attack = null
      let isArtillery = false

      if (data.entity?.attack_parameters) {
        attack = data.entity.attack_parameters
      } else if (data.entity?.gun) {
        const gunItem =
          context.factorioData.item?.[data.entity.gun] || context.factorioDataRaw?.item?.[data.entity.gun]
        if (gunItem?.attack_parameters) {
          attack = gunItem.attack_parameters
          isArtillery = true
        }
      }

      if (!attack) return null

      // Use the attack parameters parser
      return parseAttackParameters(attack, context, isArtillery)
    },
    condition: data =>
      data.entity?.attack_parameters !== undefined || data.entity?.gun !== undefined
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
    name: sectionTypes.launches,
    order: 8,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => ({ items: [{ name: 'cargo-pod', type: 'entity' }], itemsType: 'grid' }),
    condition: data => data.entity?.type === 'rocket-silo'
  },
  {
    name: sectionTypes.launched_by,
    order: 8,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => ({ items: [{ name: 'rocket-silo', type: 'entity' }], itemsType: 'grid' }),
    condition: data => data.entity?.type === 'cargo-pod'
  },
  {
    name: sectionTypes.received_by,
    order: 8,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => ({
      items: [{ name: 'cargo-landing-pad', type: 'entity' }],
      itemsType: 'grid'
    }),
    condition: data => data.entity?.type === 'cargo-pod'
  },
  {
    name: sectionTypes.spawns_container,
    order: 8,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => ({
      items: [{ name: 'cargo-pod-container', type: 'entity' }],
      itemsType: 'grid'
    }),
    condition: data => data.entity?.type === 'cargo-pod'
  },
  {
    name: sectionTypes.container_spawned_by,
    order: 8,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => ({
      items: [{ name: 'cargo-pod', type: 'entity' }],
      itemsType: 'grid'
    }),
    condition: data => data.entity?.name === 'cargo-pod-container'
  },
  {
    name: sectionTypes.vehicle,
    order: 6,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      return { statistics: [{ label: labels.weight, value: data.entity?.weight }] }
    },
    condition: data =>
      data.entity?.type === 'locomotive' ||
      data.entity?.type === 'cargo-wagon' ||
      data.entity?.type === 'fluid-wagon' ||
      data.entity?.type === 'artillery-wagon'
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
      const { energy_per_movement, energy_per_rotation, extension_speed, rotation_speed } =
        data.entity

      const energyPerMovement = parseEnergyString(energy_per_movement)
      const energyPerRotation = parseEnergyString(energy_per_rotation)

      const energyUsage =
        (energyPerMovement.normalizedValue * extension_speed +
          energyPerRotation.normalizedValue * rotation_speed) *
        60
      const formattedEnergyConsumption = formatEnergyValue(energyUsage, 'W')
      return {
        statistics: [
          {
            label: labels.max_consumption,
            value: formattedEnergyConsumption
          }
        ],
        items: chemicalFuels,
        itemsLabel: 'Accepted fuel',
        itemsType: 'grid'
      }
    },
    condition: data =>
      data.entity?.type === 'inserter' &&
      data.entity?.energy_source?.type === 'burner' &&
      data.entity?.energy_source?.fuel_categories?.includes('chemical')
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
      const energyConsumption = parseEnergyString(
        data.entity?.energy_consumption ||
          data.entity?.consumption ||
          data.entity?.max_power ||
          data.entity?.energy_usage
      )
      const formattedEnergyConsumption = formatEnergyValue(energyConsumption.normalizedValue, 'W')
      return {
        statistics: [
          {
            label: labels.max_consumption,
            value: formattedEnergyConsumption
          }
        ],
        items: chemicalFuels,
        itemsLabel: 'Accepted fuel',
        itemsType: 'grid'
      }
    },
    condition: data =>
      data.entity.type !== 'inserter' &&
      data.entity?.energy_source?.type === 'burner' &&
      data.entity?.energy_source?.fuel_categories?.includes('chemical') &&
      data.entity?.energy_consumption !== undefined
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
      let drain = parseEnergyString(data.entity?.energy_source?.drain)
      if (!energyUsage) return null
      if (!drain && data.entity.type !== 'mining-drill') {
        drain = { ...energyUsage }
        drain.normalizedValue = energyUsage.normalizedValue * 0.03333333333333333
        drain.value = energyUsage.value * 0.03333333333333333
      }
      const minConsumption = Math.ceil(drain?.normalizedValue || 0)
      const maxConsumption = Math.ceil(energyUsage.normalizedValue + (drain?.normalizedValue || 0))
      const statistics = []
      statistics.push({
        label: labels.max_consumption,
        value: formatEnergyValue(maxConsumption, 'W')
      })
      if (minConsumption) {
        statistics.push({
          label: labels.min_consumption,
          value: formatEnergyValue(minConsumption, 'W')
        })
      }

      return {
        statistics
      }
    },
    condition: data =>
      data.entity?.energy_source &&
      data.entity?.energy_source.type === 'electric' &&
      data.entity.energy_usage
  },
  {
    name: sectionTypes.consumes_electricity,
    order: 14,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      const drain = parseEnergyString(data.entity?.energy_source?.drain)
      const { energy_per_movement, energy_per_rotation, extension_speed, rotation_speed } =
        data.entity

      const energyPerMovement = parseEnergyString(energy_per_movement)
      const energyPerRotation = parseEnergyString(energy_per_rotation)

      const energyUsage =
        (energyPerMovement.normalizedValue * extension_speed +
          energyPerRotation.normalizedValue * rotation_speed) *
        60

      const minConsumption = drain?.normalizedValue
      const maxConsumption = energyUsage + (drain?.normalizedValue || 0)
      const statistics = []
      statistics.push({
        label: labels.max_consumption,
        value: formatEnergyValue(maxConsumption, 'W')
      })
      if (minConsumption) {
        statistics.push({
          label: labels.min_consumption,
          value: formatEnergyValue(minConsumption, 'W')
        })
      }

      return {
        statistics
      }
    },
    condition: data =>
      data.entity?.energy_source &&
      data.entity?.energy_source.type === 'electric' &&
      data.entity.type === 'inserter'
  },
  {
    name: sectionTypes.consumes_electricity,
    order: 14,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: data => {
      const { max_energy, energy_per_tick, energy_per_move, speed } = data.entity

      const energyPerTick = parseEnergyString(energy_per_tick)
      const energyPerMove = parseEnergyString(energy_per_move)
      const maxEnergy = parseEnergyString(max_energy)
      const maxConsumption =
        (energyPerTick.normalizedValue + energyPerMove.normalizedValue * speed) * 60
      const minConsumption = energyPerTick.normalizedValue * 60

      //In Seconds
      const minimumOperationalTime = maxEnergy.normalizedValue / maxConsumption
      //format to xhxmxs
      const formattedMinimumOperationalTimeSplit = {
        h: Math.floor(minimumOperationalTime / 3600),
        m: Math.floor((minimumOperationalTime % 3600) / 60),
        s: Math.floor(minimumOperationalTime % 60)
      }

      const formattedMinimumOperationalTime = Object.entries(formattedMinimumOperationalTimeSplit)
        .filter(([_, value]) => value !== 0)
        .map(([key, value]) => `${value}${key}`)
        .join('')
      //In Tiles
      const maximumFlyingReach = (speed * minimumOperationalTime * 60).toFixed(0)

      const statistics = [
        { label: labels.max_consumption, value: formatEnergyValue(maxConsumption, 'W') },
        { label: labels.min_consumption, value: formatEnergyValue(minConsumption, 'W') },
        { label: labels.energy_capacty, value: max_energy },
        { label: labels.minimum_operational_time, value: formattedMinimumOperationalTime },
        { label: labels.maximum_flying_reach, value: maximumFlyingReach }
      ]

      return {
        statistics
      }
    },
    condition: data =>
      data.entity.type === 'logistic-robot' || data.entity.type === 'construction-robot'
  },
  {
    name: sectionTypes.generates_electricity,
    order: 15,
    type: 'section',
    forType: 'entity',
    shownInTooltip: true,
    getValue: (data, context) => {
      if (data.entity?.type === 'solar-panel') {
        return { statistics: [{ label: labels.max_output, value: data.entity?.production }] }
      }

      // Prefer explicit generator output when available (covers mods that do not expose a fluid filter).
      const maxPowerOutput = parseEnergyString(data.entity?.max_power_output)
      if (maxPowerOutput?.normalizedValue !== undefined) {
        return {
          statistics: [{ label: labels.max_output, value: formatEnergyValue(maxPowerOutput.normalizedValue, 'W') }]
        }
      }

      const fluidName = data.entity?.fluid_box?.filter
      const fluid = fluidName ? context.factorioData.fluid[fluidName] : null
      const fluidAmount = data.entity?.fluid_usage_per_tick
      const fluidTemperature = data.entity?.maximum_temperature
      const fluidHeatCapacity = parseEnergyString(fluid?.heat_capacity)
      if (
        fluidAmount === undefined ||
        fluidTemperature === undefined ||
        fluidHeatCapacity?.normalizedValue === undefined
      ) {
        return null
      }
      const power = fluidAmount * (fluidTemperature - 15) * fluidHeatCapacity.normalizedValue * 60
      return { statistics: [{ label: labels.max_output, value: formatEnergyValue(power, 'W') }] }
    },
    condition: data => data.entity.type === 'generator' || data.entity.type === 'solar-panel'
  }
]

// Legacy exports for backward compatibility
export const entityStatisticsRules = entityRules.filter(rule => rule.type === 'statistics')
export const entitySectionRules = entityRules.filter(rule => rule.type === 'section')
