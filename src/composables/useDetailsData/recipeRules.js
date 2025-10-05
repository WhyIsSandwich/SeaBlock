import { createSectionRule } from './rulesEngine.js'
import { labels, sectionTypes } from '../useDetailsData.js'

/**
 * Recipe statistics rules - recipes typically don't have direct statistics
 */
export const recipeStatisticsRules = []

/**
 * Recipe section rules
 */
export const recipeSectionRules = [
  createSectionRule(sectionTypes.ingredients, (data) => data.ingredients),
  createSectionRule(sectionTypes.crafting_time, (data) => [], {
    getStatistics: (data) => [{ label: labels.crafting_time, value: data.energy_required }]
  }),
  createSectionRule(sectionTypes.products, (data) => data.products, {
    customCondition: (data, context) => {
      // Only show products if not an item or fluid
      return data.products && 
             !context.types?.includes('item') && 
             !context.types?.includes('fluid')
  }),
  createSectionRule(sectionTypes.made_in, (data) => []), // TODO: add made in buildings
  createSectionRule(sectionTypes.unlock_technologies, (data) => [], {
    tooltip: false // TODO: add unlock technologies
  })
]

