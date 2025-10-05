/*
 * Composable for handling the details data for the selected item and generating the details pane data for tooltips files
 * The format of the data is:

data type as follows:
{
    title: string? title of the entry
    description: string, //description of the item
    statistics: [], //array of Statistics type
    sections: [], //array of Sections type
    tooltipExtras: [], //array of tooltipExtras type
}

Sections type as follows:
{
    type: string,
    statistics: [], //array of Statistics type
    items: [], //array of factorio objects
}

Statistics type as follows where children is an array of Statistics type:
{
    label: string,
    value: string?, //formated value
    // may need extending for quality in the future
    children: [] //array of Statistics type
}

factorioObjects type
{
    type: string, //item, fluid, entity, recipe, technology, tile
    name: string, //name of the prototype
    label: string?, //label to be displayed in the details pane
}

*/

const sectionTypes = {
  ingredients: 'ingredients',
  crafting_time: 'crafting time',
  products: 'products',
  made_in: 'made in',
  used_in: 'used in',
  can_craft: 'can craft',
  unlock_technologies: 'Unlock technologies',
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
  stores_electricity: 'Stores electricity',
  consumes_nuclear_fuel: 'Consumes nuclear fuel',
  generates_heat: 'Generates heat',
  consumes_heat: 'Consumes heat',
  consumes_electricity: 'Consumes electricity',
  generates_electricity: 'Generates electricity',
  placed_in_equipment_grid: 'Placed in equipment grid',
  generates_equipment_grid_electricity: 'Generates equipment grid electricity',
  consumes_equipment_grid_electricity: 'Consumes equipment grid electricity',
  stores_equipment_grid_electricity: 'Stores equipment grid electricity'
}

const labels = {
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
  crafting_time: 'Crafting time'
}

function setEntityDetails({ statistics, sections, entity, item, isTooltip }) {
  /* Exploration coverage distance
-Contribution to nearby attacks (can't do outside of game unless we include the evolution, not in tooltip)
-Base Health (not in tooltip)
-Healing (not in tooltip)
-Health at current evolution factor (not in tooltip)
-Max possible health (not in tooltip)
-Stack Size (from item with same id and placable result presumably as none of the rails show up)
*/
  statistics.push({ label: labels.rotation_speed, value: entity.rotation_speed })
  statistics.push({ label: labels.hand_stack_size, value: entity.hand_stack_size })
  statistics.push({ label: labels.can_filter_items, value: entity.can_filter_items })
  statistics.push({ label: labels.storage_volume, value: entity.storage_volume })
  statistics.push({ label: labels.max_length, value: entity.max_length })
  statistics.push({ label: labels.belt_speed, value: entity.belt_speed })
  statistics.push({ label: labels.storage_size, value: entity.storage_size })
  statistics.push({ label: labels.wire_reach, value: entity.wire_reach })
  statistics.push({ label: labels.supply_area, value: entity.supply_area_electric_roboport })
  statistics.push({ label: labels.construction_area, value: entity.construction_area })
  statistics.push({ label: labels.radar_coverage_distance, value: entity.radar_coverage_distance })
  statistics.push({ label: labels.pumping_speed, value: entity.pumping_speed })
  statistics.push({ label: labels.mining_speed, value: entity.mining_speed })
  statistics.push({ label: labels.mining_area, value: entity.mining_area })
  statistics.push({ label: labels.crafting_speed, value: entity.crafting_speed })
  statistics.push({ label: labels.pollution, value: entity.pollution })
  statistics.push({ label: labels.research_speed, value: entity.research_speed })
  statistics.push({ label: labels.module_slots, value: entity.module_slots })
  statistics.push({ label: labels.cargo_capacity, value: entity.cargo_capacity })
  statistics.push({ label: labels.speed, value: entity.speed })
  statistics.push({ label: labels.range, value: entity.range })
  statistics.push({ label: labels.shooting_speed, value: entity.shooting_speed })
  statistics.push({ label: labels.max_consumption, value: entity.max_consumption })
  statistics.push({ label: labels.distribution_efficiency, value: entity.distribution_efficiency })
  statistics.push({
    label: labels.continuous_coverage_distance,
    value: entity.continuous_coverage_distance
  })
  statistics.push({
    label: labels.exploration_coverage_distance,
    value: entity.exploration_coverage_distance
  })
  if (!isTooltip) {
    statistics.push({ label: labels.base_health, value: entity.base_health })
    statistics.push({ label: labels.healing, value: entity.healing })
  }
  statistics.push({ label: labels.stack_size, value: item.stack_size })
  if (!isTooltip) {
    statistics.push({ label: labels.resistances, value: entity.resistances })
  }

  sections.push({
    type: sectionTypes.turret,
    items: entity.turret
  })
  sections.push({
    type: sectionTypes.effect,
    items: entity.effect
  })
  sections.push({
    type: sectionTypes.consumes_water,
    items: entity.consumes_water
  })
  sections.push({
    type: sectionTypes.equipment_grid,
    items: entity.equipment_grid
  })
  sections.push({
    type: sectionTypes.vehicle_weapons,
    items: entity.vehicle_weapons
  })
  sections.push({
    type: sectionTypes.vehicle,
    items: entity.vehicle
  })
  sections.push({
    type: sectionTypes.burnable_fuel,
    items: entity.burnable_fuel
  })
  sections.push({
    type: sectionTypes.generates_steam,
    items: entity.generates_steam
  })
  sections.push({
    type: sectionTypes.stores_electricity,
    items: entity.stores_electricity
  })
  sections.push({
    type: sectionTypes.consumes_nuclear_fuel,
    items: entity.consumes_nuclear_fuel
  })
  sections.push({
    type: sectionTypes.generates_heat,
    items: entity.generates_heat
  })
  sections.push({
    type: sectionTypes.consumes_heat,
    items: entity.consumes_heat
  })
  sections.push({
    type: sectionTypes.consumes_electricity,
    items: entity.consumes_electricity
  })
  sections.push({
    type: sectionTypes.generates_electricity,
    items: entity.generates_electricity
  })
}
function setItemDetails({ statistics, sections, item }) {
  statistics.push({ label: labels.nuclear_fuel, value: item.nuclear_fuel })
  statistics.push({ label: labels.spent_result, value: item.spent_result })
  statistics.push({ label: labels.fuel_value, value: item.fuel_value })
  statistics.push({ label: labels.fuel_pollution, value: item.fuel_pollution })
  statistics.push({ label: labels.resistances, value: item.resistances })
  statistics.push({ label: labels.inventory_size_bonus, value: item.inventory_size_bonus })
  statistics.push({ label: labels.movement_speed_bonus, value: item.movement_speed_bonus })
  statistics.push({ label: labels.construction_area, value: item.construction_area })
  statistics.push({ label: labels.robot_limit, value: item.robot_limit })
  statistics.push({ label: labels.shield_hitpoints, value: item.shield_hitpoints })
  statistics.push({ label: labels.shield_recharge_rate, value: item.shield_recharge_rate })
  statistics.push({ label: labels.range_shooting_speed, value: item.range_shooting_speed })
  statistics.push({ label: labels.stack_size, value: item.stack_size })

  sections.push({
    type: sectionTypes.placed_in_equipment_grid,
    items: item.placed_in_equipment_grid
  })
  sections.push({
    type: sectionTypes.turret,
    items: item.turret
  })
  sections.push({
    type: sectionTypes.effect,
    items: item.effect
  })
  sections.push({
    type: sectionTypes.generates_equipment_grid_electricity,
    items: item.generates_equipment_grid_electricity
  })
  sections.push({
    type: sectionTypes.consumes_equipment_grid_electricity,
    items: item.consumes_equipment_grid_electricity
  })
  sections.push({
    type: sectionTypes.stores_equipment_grid_electricity,
    items: item.stores_equipment_grid_electricity
  })
}

function setTileDetails({ statistics, tile }) {
  statistics.push({ label: labels.walking_speed, value: tile.walking_speed })
  statistics.push({ label: labels.pollution_absorption, value: tile.pollution_absorption })
}

function setFluidDetails({ statistics, fluid }) {
  statistics.push({ label: labels.fuel_value, value: fluid.fuel_value })
  statistics.push({ label: labels.fuel_pollution, value: fluid.fuel_pollution })
  statistics.push({ label: labels.min_temperature, value: fluid.min_temperature })
  statistics.push({ label: labels.max_temperature, value: fluid.max_temperature })
  statistics.push({ label: labels.heat_capacity, value: fluid.heat_capacity })
}
function setTechnologyDetails({ sections, technology }) {
  sections.push({
    type: sectionTypes.technology_cost,
    items: [] //TODO: add unlock technologies
  })
  sections.push({
    type: sectionTypes.technology_effects,
    items: [] //TODO: add unlock technologies
  })
}
function setRecipeDetails({ types, sections, recipe, isTooltip }) {
  sections.push({
    type: sectionTypes.ingredients,
    items: recipe.ingredients
  })
  sections.push({
    type: sectionTypes.crafting_time,
    statistics: [{ label: labels.crafting_time, value: recipe.energy_required }]
  })
  if (!types.includes('item') && !types.includes('fluid')) {
    sections.push({
      type: sectionTypes.products,
      items: recipe.products
    })
  }
  sections.push({
    type: sectionTypes.made_in,
    items: [] //TODO: add made in buildings
  })
  if (!isTooltip) {
    sections.push({
      type: sectionTypes.unlock_technologies,
      items: [] //TODO: add unlock technologies
    })
  }
}

/***
 * Get the details data for the selected item and generate the details pane data for tooltips files
 * @param {string[]} types - the types of the item
 * @param {object} unifiedObject - the unified object of the item
 * @param {boolean} isTooltip - whether the data is being generated for a tooltip
 * @returns {object} the details data
 */
function getDetailsData(types, unifiedObject, isTooltip) {
  const data = {
    title: unifiedObject.displayName,
    description: unifiedObject.description,
    statistics: [],
    sections: [],
    tooltipExtras: []
  }
  /*
    keys of statistics that have been used (in factoriopedia entities stats only appear once eg item/entity would have stack size twice and it's in a different order for item (after resistances))
    view armour and note stack size is above resistances
    */

  const request = { types, isTooltip, sections: data.sections, statistics: data.statistics }

  if (types.includes('entity')) {
    const { entity, item } = unifiedObject
    setEntityDetails({ ...request, entity, item })
  }

  if (types.includes('item')) {
    const { item } = unifiedObject
    setItemDetails({ ...request, item })
  }

  if (types.includes('tile')) {
    const { tile } = unifiedObject
    setTileDetails({ ...request, tile })
  }
  if (types.includes('fluid')) {
    const { fluid } = unifiedObject
    setFluidDetails({ ...request, fluid })
  }
  if (types.includes('technology')) {
    const { technology } = unifiedObject
    setTechnologyDetails({ ...request, technology })
  }

  if (types.includes('recipe')) {
    const { recipe } = unifiedObject
    setRecipeDetails({ ...request, recipe })
  }

  if (isTooltip) {
    if (types.includes('recipe')) {
      const { recipe } = unifiedObject
      recipe.products?.forEach(product => {
        data.tooltipExtras.push({ type: product.type, name: product.name })
      })
    }
  }
  return data
}

export function useDetailsData() {
  return {
    getDetailsData
  }
}
