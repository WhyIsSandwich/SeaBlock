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

import { labels, sectionTypes } from './detailsDataTypes.js'

export { labels, sectionTypes }

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
  recipeSectionRules,
  technologySectionRules
} from './useDetailsData/index.js'

function setEntityDetails({ statistics, sections, entity, item, isTooltip, factorioData }) {
  // Apply entity statistics rules
  const entityStats = applyStatisticsRules(entityStatisticsRules, entity, { isTooltip, item })
  statistics.push(...entityStats)

  // Apply entity section rules
  const entitySections = applySectionRules(entitySectionRules, entity, { isTooltip, factorioData })
  sections.push(...entitySections)
}
function setItemDetails({ statistics, sections, item, factorioData }) {
  // Apply item statistics rules
  const itemStats = applyStatisticsRules(itemStatisticsRules, item, { factorioData })
  statistics.push(...itemStats)

  // Apply item section rules
  const itemSections = applySectionRules(itemSectionRules, item, { factorioData })
  sections.push(...itemSections)
}

function setTileDetails({ statistics, sections, tile, factorioData }) {
  // Apply tile statistics rules
  const tileStats = applyStatisticsRules(tileStatisticsRules, tile, { factorioData })
  statistics.push(...tileStats)

  // Apply tile section rules
  const tileSections = applySectionRules(tileSectionRules, tile, { factorioData })
  sections.push(...tileSections)
}

function setFluidDetails({ statistics, sections, fluid, factorioData }) {
  // Apply fluid statistics rules
  const fluidStats = applyStatisticsRules(fluidStatisticsRules, fluid, { factorioData })
  statistics.push(...fluidStats)

  // Apply fluid section rules
  const fluidSections = applySectionRules(fluidSectionRules, fluid, { factorioData })
  sections.push(...fluidSections)
}

function setTechnologyDetails({ sections, technology, factorioData }) {
  // Apply technology section rules
  const techSections = applySectionRules(technologySectionRules, technology, { factorioData })
  sections.push(...techSections)
}

function setRecipeDetails({ types, sections, recipe, isTooltip, factorioData }) {
  // Apply recipe section rules
  const recipeSections = applySectionRules(recipeSectionRules, recipe, {
    types,
    isTooltip,
    factorioData
  })
  sections.push(...recipeSections)
}

/***
 * Get the details data for the selected item and generate the details pane data for tooltips files
 * @param {string[]} types - the types of the item
 * @param {object} unifiedObject - the unified object of the item
 * @param {boolean} isTooltip - whether the data is being generated for a tooltip
 * @returns {object} the details data
 */
function getDetailsData(types, unifiedObject, isTooltip, factorioData) {
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

  const request = {
    types,
    isTooltip,
    sections: data.sections,
    statistics: data.statistics,
    factorioData
  }

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
