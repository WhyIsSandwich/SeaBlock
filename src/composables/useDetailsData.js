/*
 * Composable for handling the details data for the selected item and generating the details pane data for tooltips files
 * The format of the data is:
 */

import { types } from 'util'

/*

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
  technology_effects: 'Effects'
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
  statistics.push({ label: 'Rotation Speed', value: entity.rotation_speed })
  statistics.push({ label: 'Hand Stack Size', value: entity.hand_stack_size })
  statistics.push({ label: 'Can filter items.', value: entity.can_filter_items })
  statistics.push({ label: 'Storage Volume', value: entity.storage_volume })
  statistics.push({ label: 'Max Length', value: entity.max_length })
  statistics.push({ label: 'Belt Speed', value: entity.belt_speed })
  statistics.push({ label: 'Storage Size', value: entity.storage_size })
  statistics.push({ label: 'Wire Reach', value: entity.wire_reach })
  statistics.push({ label: 'Supply Area', value: entity.supply_area_electric_roboport })
  statistics.push({ label: 'Construction area', value: entity.construction_area })
  statistics.push({ label: 'Radar coverage distance', value: entity.radar_coverage_distance })
  statistics.push({ label: 'Pumping Speed', value: entity.pumping_speed })
  statistics.push({ label: 'Mining Speed', value: entity.mining_speed })
  statistics.push({ label: 'Mining Area', value: entity.mining_area })
  statistics.push({ label: 'Crafting Speed', value: entity.crafting_speed })
  statistics.push({ label: 'Pollution', value: entity.pollution })
  statistics.push({ label: 'Research Speed', value: entity.research_speed })
  statistics.push({ label: 'Module Slots', value: entity.module_slots })
  statistics.push({ label: 'Cargo Capacity', value: entity.cargo_capacity })
  statistics.push({ label: 'Speed', value: entity.speed })
  statistics.push({ label: 'Range', value: entity.range })
  statistics.push({ label: 'Shooting Speed', value: entity.shooting_speed })
  statistics.push({ label: 'Max Consumption', value: entity.max_consumption })
  statistics.push({ label: 'Distribution Efficiency', value: entity.distribution_efficiency })
  statistics.push({
    label: 'Continuous coverage distance',
    value: entity.continuous_coverage_distance
  })
  statistics.push({
    label: 'Exploration coverage distance',
    value: entity.exploration_coverage_distance
  })
  if (!isTooltip) {
    statistics.push({ label: 'Base Health', value: entity.base_health })
    statistics.push({ label: 'Healing', value: entity.healing })
  }
  statistics.push({ label: 'Stack Size', value: item.stack_size })
  if (!isTooltip) {
    statistics.push({ label: 'Resistances', value: entity.resistances })
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
  statistics.push({ label: 'Nuclear Fuel', value: item.nuclear_fuel })
  statistics.push({ label: 'Spent Result', value: item.spent_result })
  statistics.push({ label: 'Fuel Value', value: item.fuel_value })
  statistics.push({ label: 'Fuel Pollution', value: item.fuel_pollution })
  statistics.push({ label: 'Resistances', value: item.resistances })
  statistics.push({ label: 'Inventory Size Bonus', value: item.inventory_size_bonus })
  statistics.push({ label: 'Movement Speed Bonus', value: item.movement_speed_bonus })
  statistics.push({ label: 'Construction area', value: item.construction_area })
  statistics.push({ label: 'Robot limit', value: item.robot_limit })
  statistics.push({ label: 'Shield hitpoints', value: item.shield_hitpoints })
  statistics.push({ label: 'Shield recharge rate', value: item.shield_recharge_rate })
  statistics.push({ label: 'Range shooting speed', value: item.range_shooting_speed })
  statistics.push({ label: 'Stack Size', value: item.stack_size })

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
  statistics.push({ label: 'Walking Speed', value: tile.walking_speed })
  statistics.push({ label: 'Pollution Absorption', value: tile.pollution_absorption })
}

function setFluidDetails({ statistics, fluid }) {
  statistics.push({ label: 'Fuel Value', value: fluid.fuel_value })
  statistics.push({ label: 'Fuel Pollution', value: fluid.fuel_pollution })
  statistics.push({ label: 'Min Temp', value: fluid.min_temperature })
  statistics.push({ label: 'Max Temp', value: fluid.max_temperature })
  statistics.push({ label: 'Heat Capacity', value: fluid.heat_capacity })
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
    statistics: [{ label: 'Crafting time', value: recipe.energy_required }]
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
    const entity = unifiedObject.entity
    setEntityDetails({ ...request, entity, item })
  }

  if (types.includes('item')) {
    const item = unifiedObject.item
    setItemDetails({ ...request, item })
  }

  if (types.includes('tile')) {
    const tile = unifiedObject.tile
    setTileDetails({ ...request, tile })
  }
  if (types.includes('fluid')) {
    const fluid = unifiedObject.fluid
    setFluidDetails({ ...request, fluid })
  }
  if (types.includes('technology')) {
    const technology = unifiedObject.technology
    setTechnologyDetails({ ...request, technology })
  }

  if (types.includes('recipe')) {
    const recipe = unifiedObject.recipe
    setRecipeDetails({ ...request, recipe })
  }

  if (isTooltip) {
    if (types.includes('recipe')) {
      const recipe = unifiedObject.recipe
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
