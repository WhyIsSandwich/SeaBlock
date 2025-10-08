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
import {
  applyRules,
  entityRules,
  itemRules,
  tileRules,
  fluidRules,
  recipeRules,
  technologyRules
} from './useDetailsData/index.js'

export { labels, sectionTypes }

function setEntityDetails({ statistics, sections, entity, item, isTooltip, factorioData }) {
  // Apply unified entity rules
  const entityResults = applyRules(entityRules, { ...entity, item }, { isTooltip, factorioData })

  // Separate statistics and sections
  const entityStats = entityResults.filter(result => result.label)
  const entitySections = entityResults.filter(result => result.type)

  statistics.push(...entityStats)
  sections.push(...entitySections)
}
function setItemDetails({ statistics, sections, item, factorioData }) {
  // Apply unified item rules
  const itemResults = applyRules(itemRules, item, { factorioData })

  // Separate statistics and sections
  const itemStats = itemResults.filter(result => result.label)
  const itemSections = itemResults.filter(result => result.type)

  statistics.push(...itemStats)
  sections.push(...itemSections)
}

function setTileDetails({ statistics, sections, tile, factorioData }) {
  // Apply unified tile rules
  const tileResults = applyRules(tileRules, tile, { factorioData })

  // Separate statistics and sections
  const tileStats = tileResults.filter(result => result.label)
  const tileSections = tileResults.filter(result => result.type)

  statistics.push(...tileStats)
  sections.push(...tileSections)
}

function setFluidDetails({ statistics, sections, fluid, factorioData }) {
  // Apply unified fluid rules
  const fluidResults = applyRules(fluidRules, fluid, { factorioData })

  // Separate statistics and sections
  const fluidStats = fluidResults.filter(result => result.label)
  const fluidSections = fluidResults.filter(result => result.type)

  statistics.push(...fluidStats)
  sections.push(...fluidSections)
}

function setTechnologyDetails({ sections, technology, factorioData }) {
  // Apply unified technology rules
  const techResults = applyRules(technologyRules, technology, { factorioData })

  // Separate statistics and sections
  const techStats = techResults.filter(result => result.label)
  const techSections = techResults.filter(result => result.type)

  sections.push(...techSections)
}

function setRecipeDetails({ types, sections, recipe, isTooltip, factorioData }) {
  // Apply unified recipe rules
  const recipeResults = applyRules(recipeRules, recipe, {
    types,
    isTooltip,
    factorioData
  })

  // Separate statistics and sections
  const recipeStats = recipeResults.filter(result => result.label)
  const recipeSections = recipeResults.filter(result => result.type)

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
