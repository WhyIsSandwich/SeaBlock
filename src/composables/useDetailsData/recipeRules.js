import { labels } from '../useDetailsData.js'
import { sectionTypes } from '../detailsDataTypes.js'

/**
 * Recipe rules - unified format for both statistics and sections
 */
export const recipeRules = [
  // Statistics rules - recipes typically don't have direct statistics
  // (empty array for now, can be extended if needed)

  // Section rules
  {
    name: sectionTypes.ingredients,
    order: 1,
    type: 'section',
    forType: 'recipe',
    shownInTooltip: true,
    getValue: data => {
      return {
        items: data.recipe?.ingredients?.map(ingredient => ({
          name: ingredient.name,
          type: ingredient.type,
          label: `{{item_name}} x ${ingredient.amount}`
        })),
        itemsType: 'list'
      }
    },
    condition: data => data.recipe?.ingredients?.length > 0,
    postCondition: data => data?.items?.length > 0
  },
  {
    name: sectionTypes.crafting_time,
    order: 2,
    type: 'section',
    forType: 'recipe',
    shownInTooltip: true,
    getValue: data => ({
      statistics: [{ label: labels.crafting_time, value: data.recipe?.energy_required }],
      type: 'crafting_time'
    }),
    condition: data => data.recipe?.energy_required !== undefined
  },
  {
    name: sectionTypes.products,
    order: 3,
    type: 'section',
    forType: 'recipe',
    shownInTooltip: true,
    getValue: data => ({
      items: data.recipe?.results?.map(result => {
        let amountText = ''

        // Handle different amount types
        if (result.amount !== undefined) {
          // Simple amount
          amountText = result.amount.toString()
        } else if (result.amount_min !== undefined && result.amount_max !== undefined) {
          // Range amount
          if (result.amount_min === result.amount_max) {
            amountText = result.amount_min.toString()
          } else {
            amountText = `${result.amount_min}-${result.amount_max}`
          }
        }

        // Add probability if present and not 1
        if (result.probability !== undefined && result.probability !== 1) {
          const probabilityPercent = Math.round(result.probability * 100)
          amountText += ` (${probabilityPercent}%)`
        }

        return {
          name: result.name,
          type: result.type,
          label: `{{item_name}} x ${amountText}`
        }
      }),
      itemsType: 'list'
    }),
    condition: (data, _context) => {
      // Only show products if not redundant
      return (
        (data.recipe?.results &&
          data.recipe?.results.length > 0 &&
          data.recipe?.results.some(product => product.name !== data.recipe?.name)) ||
        data.recipe?.always_show_products
      )
    }
  },
  {
    name: sectionTypes.made_in,
    order: 4,
    type: 'section',
    forType: 'recipe',
    shownInTooltip: true,
    getValue: (data, context) => {
      const entities = Object.values(context.factorioData.entity)
        .filter(entity => entity.crafting_categories?.includes(data.recipe?.category || 'crafting'))
        .map(entity => ({ name: entity.name, type: 'entity' }))
      return {
        items: entities,
        itemsType: 'grid' // Use grid layout for made_in section
      }
    },
    condition: data => data.recipe?.category !== undefined
  },
  {
    name: sectionTypes.unlock_technologies,
    order: 5,
    type: 'section',
    shownInTooltip: false, // TODO: add unlock technologies
    getValue: (data, context) => {
      const technologies = Object.values(context.factorioData.technology)
      const unlockTechnologies = technologies
        .filter(
          a =>
            a?.effects?.length > 0 &&
            a?.effects?.filter(
              effect => effect.type === 'unlock-recipe' && effect.recipe === data.recipe?.name
            )?.length > 0
        )
        .map(technology => {
          // todo deal with unit not being defined
          const ingredients =
            technology.unit?.ingredients.length > 0 ? technology.unit.ingredients : []
          const items = ingredients.map(ingredient => ({
            name: ingredient[0],
            type: 'item',
            amount: ingredient[1]
          }))
          return { name: technology.name, type: 'technology', items: (technology.name, items) }
        })
      return { items: unlockTechnologies, type: 'unlock_technologies' }
    },
    condition: data => data.recipe?.name !== undefined
  }
]

// Legacy exports for backward compatibility
export const recipeStatisticsRules = recipeRules.filter(rule => rule.type === 'statistics')
export const recipeSectionRules = recipeRules.filter(rule => rule.type === 'section')
