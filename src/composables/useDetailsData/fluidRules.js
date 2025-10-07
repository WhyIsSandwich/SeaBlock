import {
  createSimpleStatisticsRule,
  createCustomStatisticsRule,
  createSectionRule,
  transforms
} from './rulesEngine.js'
import { labels, sectionTypes } from '../useDetailsData.js'

/**
 * Fluid statistics rules
 */
export const fluidStatisticsRules = [
  createSimpleStatisticsRule('fuel_value', labels.fuel_value),
  createSimpleStatisticsRule(
    'emissions_multiplier',
    labels.fuel_pollution,
    transforms.formatPercent
  ),
  createCustomStatisticsRule(
    'default_temperature',
    labels.min_temperature,
    data => data.default_temperature,
    data => data.max_temperature
  ),
  createSimpleStatisticsRule('max_temperature', labels.max_temperature),
  createSimpleStatisticsRule('heat_capacity', labels.heat_capacity)
]

/**
 * Fluid section rules - fluids typically don't have sections
 */
export const fluidSectionRules = [
  createSectionRule(sectionTypes.used_in, (data, context) => {
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
  }),
  createSectionRule(sectionTypes.alternative_recipes, (data, context) => {
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
  })
]
