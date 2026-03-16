/**
 * Section types with their display labels
 * @example
 * // Get a section type
 * const sectionType = sectionTypes.ingredients // 'ingredients'
 * const displayName = sectionTypes.ingredients // 'ingredients'
 *
 * // Invalid access will throw helpful error
 * sectionTypes.invalid_key // Error: Invalid section type 'invalid_key'. Available types: ingredients, crafting_time, products, ...
 */
export const sectionTypes = new Proxy(
  {
    ingredients: 'ingredients',
    crafting_time: 'crafting time',
    products: 'products',
    made_in: 'made in',
    used_in: 'used in',
    can_craft: 'can craft',
    unlock_technologies: 'Unlocked by',
    technology_cost: 'Cost',
    technology_effects: 'Effects',
    turret: 'Turret',
    effect: 'Effect',
    consumes_water: 'Consumes water',
    equipment_grid: 'Equipment grid',
    vehicle_weapons: 'Vehicle weapons',
    vehicle: 'Vehicle',
    burnable_fuel: 'Burnable fuel',
    generates_steam: 'Generates steam',
    consumes_steam: 'Consumes steam',
    stores_electricity: 'Stores electricity',
    consumes_nuclear_fuel: 'Consumes nuclear fuel',
    generates_heat: 'Generates heat',
    consumes_heat: 'Consumes heat',
    consumes_electricity: 'Consumes electricity',
    generates_electricity: 'Generates electricity',
    placed_in_equipment_grid: 'Placed in equipment grid',
    generates_equipment_grid_electricity: 'Generates equipment grid electricity',
    consumes_equipment_grid_electricity: 'Consumes equipment grid electricity',
    stores_equipment_grid_electricity: 'Stores equipment grid electricity',
    alternative_recipes: 'Alternative recipes',
    technology_prerequisites: 'Prerequisites',
    technology_descendants: 'Descendants',
    extracted_by: 'Extracted by',
    source_of: 'Source of',
    allows_placement: 'Allows placement',
    burned_in: 'Burned in',
    can_mine: 'Can mine',
    can_extract: 'Can extract from',
    mined_by: 'Mined by',
    launches: 'Launches',
    launched_by: 'Launched by',
    received_by: 'Received by',
    spawns_container: 'Spawns container',
    container_spawned_by: 'Container spawned by',
    gathered_from: 'Gathered from',
    consumed_in: 'Consumed in',
    minable_results: 'Mining results'
  },
  {
    get(target, prop) {
      if (prop in target) {
        return target[prop]
      }
      // Get available keys for error message
      console.error(`Invalid section type '${String(prop)}'.`)
      return prop
    }
  }
)

/**
 * Labels for statistics with their display names
 * @example
 * // Get a label
 * const label = labels.rotation_speed // 'Rotation Speed'
 *
 * // Invalid access will throw helpful error
 * labels.invalid_key // Error: Invalid label key 'invalid_key'. Available keys: rotation_speed, hand_stack_size, ...
 */
export const labels = new Proxy(
  {
    // Entity labels
    rotation_speed: 'Rotation Speed',
    hand_stack_size: 'Hand Stack Size',
    can_filter_items: 'Can filter items.',
    storage_volume: 'Storage Volume',
    max_length: 'Max Length',
    belt_speed: 'Belt Speed',
    storage_size: 'Storage Size',
    wire_reach: 'Wire Reach',
    supply_area: 'Supply Area',
    construction_area: 'Construction area',
    radar_coverage_distance: 'Radar coverage distance',
    pumping_speed: 'Pumping Speed',
    mining_speed: 'Mining Speed',
    mining_area: 'Mining Area',
    crafting_speed: 'Crafting Speed',
    pollution: 'Pollution',
    research_speed: 'Research Speed',
    module_slots: 'Module Slots',
    cargo_capacity: 'Cargo Capacity',
    speed: 'Speed',
    range: 'Range',
    shooting_speed: 'Shooting Speed',
    max_consumption: 'Max Consumption',
    distribution_efficiency: 'Distribution Efficiency',
    continuous_coverage_distance: 'Continuous coverage distance',
    exploration_coverage_distance: 'Exploration coverage distance',
    base_health: 'Base Health',
    healing: 'Healing',
    resistances: 'Resistances',
    min_consumption: 'Min Consumption',
    neighbour_bonus: 'Neighbour Bonus',
    fluid_consumption: 'Fluid Consumption',
    fluid_output: 'Fluid Output',
    fluid_max_temperature: 'Fluid Max Temperature',
    equipment_grid_size: 'Equipment Grid Size',
    max_input: 'Max Input',
    max_output: 'Max Output',
    rocket_launch_product: 'Rocket Launch Product',
    obtained_from_rocket_launch: 'Obtained from Rocket Launch',
    weight: 'Weight',
    energy_capacty: 'Energy Capacity',
    minimum_operational_time: 'Minimum Operational Time',
    maximum_flying_reach: 'Maximum Flying Reach',
    fluid_requirements: 'Fluid requirements',

    // Item labels
    nuclear_fuel: 'Nuclear Fuel',
    spent_result: 'Spent Result',
    fuel_value: 'Fuel Value',
    fuel_pollution: 'Fuel Pollution',
    inventory_size_bonus: 'Inventory Size Bonus',
    movement_speed_bonus: 'Movement Speed Bonus',
    robot_limit: 'Robot limit',
    shield_hitpoints: 'Shield hitpoints',
    shield_recharge_rate: 'Shield recharge rate',
    range_shooting_speed: 'Range shooting speed',
    stack_size: 'Stack Size',

    // Tile labels
    walking_speed: 'Walking Speed',
    pollution_absorption: 'Pollution Absorption',

    // Fluid labels
    min_temperature: 'Min Temp',
    max_temperature: 'Max Temp',
    heat_capacity: 'Heat Capacity',

    // Recipe labels
    crafting_time: 'Crafting time',

    // Technology labels
    technology_time: 'Technology Time',
    technology_cost: 'Technology Cost',
    energy_consumption: 'Energy Consumption',
    energy_capacity: 'Energy Capacity',
    nuclear_fuel_consumption: 'Constant Consumption',
    heat_generation: 'Heat Generation'
  },
  {
    get(target, prop) {
      if (prop in target) {
        return target[prop]
      }

      // Get available keys for error message
      console.error(`Invalid label key '${String(prop)}.`)
      return prop
    }
  }
)
