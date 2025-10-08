import { labels, sectionTypes } from '../useDetailsData.js'

import { transforms } from './rulesEngine.js'

/**
 * Fluid rules - unified format for both statistics and sections
 */
export const fluidRules = [
  // Statistics rules
  {
    name: labels.fuel_value,
    order: 1,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.fuel_value,
    condition: data => data.fuel_value !== undefined
  },
  {
    name: labels.fuel_pollution,
    order: 2,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.emissions_multiplier,
    transform: transforms.formatPercent,
    condition: data => data.emissions_multiplier !== undefined
  },
  {
    name: labels.min_temperature,
    order: 3,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.default_temperature,
    condition: data => data.max_temperature !== undefined
  },
  {
    name: labels.max_temperature,
    order: 4,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.max_temperature,
    condition: data => data.max_temperature !== undefined
  },
  {
    name: labels.heat_capacity,
    order: 5,
    type: 'statistics',
    shownInTooltip: true,
    getValue: data => data.heat_capacity,
    condition: data => data.heat_capacity !== undefined
  },

  // Section rules
  {
    name: sectionTypes.used_in,
    order: 1,
    type: 'section',
    shownInTooltip: true,
    getValue: (data, context) => {
      const recipes = Object.values(context.factorioData.recipe)
      const usedIn = recipes
        .filter(
          recipe =>
            recipe.ingredients?.length > 0 &&
            recipe.ingredients?.some(
              ingredient => ingredient.name === data.name && ingredient.type === 'fluid'
            )
        )
        .map(recipe => ({ name: recipe.name, type: 'recipe' }))
      return { items: usedIn, itemsType: 'grid' }
    },
    condition: data => data.name !== undefined
  },
  {
    name: sectionTypes.alternative_recipes,
    order: 2,
    type: 'section',
    shownInTooltip: true,
    getValue: (data, context) => {
      const recipes = Object.values(context.factorioData.recipe)

      const alternativeRecipes = recipes
        .filter(
          recipe =>
            recipe.name !== data.name &&
            recipe.results?.length > 0 &&
            recipe.results?.some(result => result.name === data.name)
        )
        .map(recipe => ({ name: recipe.name, type: 'recipe', label: recipe.displayName }))
      return { items: alternativeRecipes, itemsType: 'list' }
    },
    condition: data => data.name !== undefined
  }
]

// Legacy exports for backward compatibility
export const fluidStatisticsRules = fluidRules.filter(rule => rule.type === 'statistics')
export const fluidSectionRules = fluidRules.filter(rule => rule.type === 'section')
