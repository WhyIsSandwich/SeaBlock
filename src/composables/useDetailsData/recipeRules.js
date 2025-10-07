import { createSectionRule } from './rulesEngine.js'
import { labels } from '../useDetailsData.js'
import { sectionTypes } from '../detailsDataTypes.js'

/**
 * Recipe statistics rules - recipes typically don't have direct statistics
 */
export const recipeStatisticsRules = []

/**
 * Recipe section rules
 */
export const recipeSectionRules = [
  createSectionRule(sectionTypes.ingredients, data => ({
    items: data.ingredients?.map(ingredient => ({
      name: ingredient.name,
      type: ingredient.type,
      label: `{{item_name}} x ${ingredient.amount}`
    })),
    itemsType: 'list'
  })),
  createSectionRule(sectionTypes.crafting_time, data => ({
    statistics: [{ label: labels.crafting_time, value: data.energy_required }]
  })),
  createSectionRule(
    sectionTypes.products,
    data => ({
      items: data.results?.map(result => ({
        name: result.name,
        type: result.type,
        label: `{{item_name}} x ${result.amount}`
      })),
      itemsType: 'list'
    }),
    {
      customCondition: (data, context) => {
        // Only show products if not redundant
        return (
          (data.results && data.results.some(product => product.name !== data.name)) ||
          data.always_show_products
        )
      }
    }
  ),
  createSectionRule(sectionTypes.made_in, (data, context) => {
    const entities = Object.values(context.factorioData.entity)
      .filter(entity => entity.crafting_categories?.includes(data.category || 'crafting'))
      .map(entity => ({ name: entity.name, type: 'entity' }))
    return {
      items: entities,
      itemsType: 'grid' // Use grid layout for made_in section
    }
  }),
  createSectionRule(
    sectionTypes.unlock_technologies,
    (data, context) => {
      const technologies = Object.values(context.factorioData.technology)
      const unlockTechnologies = technologies
        .filter(
          a =>
            a?.effects?.length > 0 &&
            a?.effects?.filter(
              effect => effect.type === 'unlock-recipe' && effect.recipe === data.name
            )?.length > 0
        )
        .map(technology => ({ name: technology.name, type: 'technology' }))
      console.log(unlockTechnologies)
      return { items: unlockTechnologies }
    },
    {
      tooltip: false // TODO: add unlock technologies
    }
  )
]
