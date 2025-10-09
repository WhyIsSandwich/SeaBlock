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
import { applyRules, allRules } from './useDetailsData/index.js'

export { labels, sectionTypes }

/**
 * Apply all rules to the unified object and separate results into statistics and sections
 * @param {Object} unifiedObject - The unified object containing all data types
 * @param {string[]} types - The types present in the unified object
 * @param {boolean} isTooltip - Whether this is for a tooltip
 * @param {Object} factorioData - The factorio data context
 * @returns {Object} Object containing statistics and sections arrays
 */
function applyAllRules(unifiedObject, types, isTooltip, factorioData) {
  const statistics = []
  const sections = []

  // Create a context object that includes all the data
  const context = {
    isTooltip,
    factorioData,
    types
  }

  // Apply all rules at once
  const allResults = applyRules(allRules, unifiedObject, context)

  // Separate results into statistics and sections based on rule type
  allResults.forEach(result => {
    // Remove the _ruleType field before adding to arrays
    const { _ruleType, ...cleanResult } = result

    if (_ruleType === 'statistics') {
      statistics.push(cleanResult)
    } else if (_ruleType === 'section') {
      sections.push(cleanResult)
    }
  })

  return { statistics, sections }
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

  // Apply all rules at once and get the results
  const { statistics, sections } = applyAllRules(unifiedObject, types, isTooltip, factorioData)

  // Add the results to the data object
  data.statistics.push(...statistics)
  data.sections.push(...sections)

  // Handle tooltip extras for recipes
  if (isTooltip && types.includes('recipe')) {
    const { recipe } = unifiedObject
    if (recipe.results && recipe.results.length > 0) {
      recipe.results?.forEach(product => {
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
