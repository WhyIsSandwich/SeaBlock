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
    forType: 'fluid',
    shownInTooltip: true,
    getValue: data => data.fluid?.fuel_value,
    condition: data => data.fluid?.fuel_value !== undefined
  },
  {
    name: labels.fuel_pollution,
    order: 2,
    type: 'statistics',
    forType: 'fluid',
    shownInTooltip: true,
    getValue: data => data.fluid?.emissions_multiplier,
    transform: transforms.formatPercent,
    condition: data => data.fluid?.emissions_multiplier !== undefined
  },
  {
    name: labels.min_temperature,
    order: 3,
    type: 'statistics',
    forType: 'fluid',
    shownInTooltip: true,
    getValue: data => data.fluid?.default_temperature,
    condition: data => data.fluid?.max_temperature !== undefined
  },
  {
    name: labels.max_temperature,
    order: 4,
    type: 'statistics',
    forType: 'fluid',
    shownInTooltip: true,
    getValue: data => data.fluid?.max_temperature,
    condition: data => data.fluid?.max_temperature !== undefined
  },
  {
    name: labels.heat_capacity,
    order: 5,
    type: 'statistics',
    forType: 'fluid',
    shownInTooltip: true,
    getValue: data => data.fluid?.heat_capacity,
    condition: data => data.fluid?.heat_capacity !== undefined
  },

  // Section rules
  {
    name: sectionTypes.used_in,
    order: 1,
    type: 'section',
    forType: 'fluid',
    shownInTooltip: false,
    getValue: (data, context) => {
      const recipes = Object.values(context.factorioData.recipe)
      const usedIn = recipes
        .filter(
          recipe =>
            recipe.ingredients?.length > 0 &&
            recipe.ingredients?.some(
              ingredient => ingredient.name === data.fluid?.name && ingredient.type === 'fluid'
            )
        )
        .map(recipe => ({ name: recipe.name, type: 'recipe' }))
      return { items: usedIn, itemsType: 'grid' }
    },
    condition: data => data.fluid?.name !== undefined
  },
  {
    name: sectionTypes.alternative_recipes,
    order: 2,
    type: 'section',
    forType: 'fluid',
    shownInTooltip: false,
    getValue: (data, context) => {
      const recipes = Object.values(context.factorioData.recipe)

      const alternativeRecipes = recipes
        .filter(
          recipe =>
            recipe.name !== data.fluid?.name &&
            recipe.results?.length > 0 &&
            recipe.results?.some(result => result.name === data.fluid?.name)
        )
        .map(recipe => ({ name: recipe.name, type: 'recipe', label: recipe.displayName }))
      return { items: alternativeRecipes, itemsType: 'list' }
    },
    condition: data => data.fluid?.name !== undefined
  }
]

// Legacy exports for backward compatibility
export const fluidStatisticsRules = fluidRules.filter(rule => rule.type === 'statistics')
export const fluidSectionRules = fluidRules.filter(rule => rule.type === 'section')
