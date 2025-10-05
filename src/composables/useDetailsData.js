/*
 * Composable for handling the details data for the selected item and generating the details pane data for tooltips files
 * The format of the data is:
 */

import {
  applyStatisticsRules,
  applySectionRules,
  entityStatisticsRules,
  entitySectionRules,
  itemStatisticsRules,
  itemSectionRules,
  tileStatisticsRules,
  tileSectionRules,
  fluidStatisticsRules,
  fluidSectionRules,
  recipeStatisticsRules,
  recipeSectionRules,
  technologyStatisticsRules,
  technologySectionRules
} from './useDetailsData/index.js'

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
  // Apply entity statistics rules
  const entityStats = applyStatisticsRules(entityStatisticsRules, entity, { isTooltip, item })
  statistics.push(...entityStats)

  // Apply entity section rules
  const entitySections = applySectionRules(entitySectionRules, entity, { isTooltip })
  sections.push(...entitySections)
}
function setItemDetails({ statistics, sections, item }) {
  // Apply item statistics rules
  const itemStats = applyStatisticsRules(itemStatisticsRules, item)
  statistics.push(...itemStats)

  // Apply item section rules
  const itemSections = applySectionRules(itemSectionRules, item)
  sections.push(...itemSections)
}

function setTileDetails({ statistics, sections, tile }) {
  // Apply tile statistics rules
  const tileStats = applyStatisticsRules(tileStatisticsRules, tile)
  statistics.push(...tileStats)

  // Apply tile section rules
  const tileSections = applySectionRules(tileSectionRules, tile)
  sections.push(...tileSections)
}

function setFluidDetails({ statistics, sections, fluid }) {
  // Apply fluid statistics rules
  const fluidStats = applyStatisticsRules(fluidStatisticsRules, fluid)
  statistics.push(...fluidStats)

  // Apply fluid section rules
  const fluidSections = applySectionRules(fluidSectionRules, fluid)
  sections.push(...fluidSections)
}

function setTechnologyDetails({ sections, technology }) {
  // Apply technology section rules
  const techSections = applySectionRules(technologySectionRules, technology)
  sections.push(...techSections)
}

function setRecipeDetails({ types, sections, recipe, isTooltip }) {
  // Apply recipe section rules
  const recipeSections = applySectionRules(recipeSectionRules, recipe, { types, isTooltip })
  sections.push(...recipeSections)
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
