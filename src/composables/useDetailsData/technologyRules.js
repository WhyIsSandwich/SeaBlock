import { sectionTypes, labels } from '../detailsDataTypes.js'

/**
 * Technology rules - unified format for both statistics and sections
 */
export const technologyRules = [
  // Statistics rules - technologies typically don't have direct statistics
  // (empty array for now, can be extended if needed)

  // Section rules
  {
    name: sectionTypes.technology_cost,
    order: 1,
    type: 'section',
    forType: 'technology',
    shownInTooltip: true,
    getValue: data => {
      const sciencePacks = data.technology.unit?.ingredients?.map(unit => ({
        name: unit[0],
        type: 'item',
        amount: unit[1]
      }))
      return {
        items: sciencePacks,
        type: 'technology_cost',
        itemsType: 'grid',
        statistics: [
          { label: labels.technology_cost, value: data.technology.unit?.count },
          { label: labels.technology_time, value: data.technology.unit?.time }
        ]
      }
    },
    condition: data => data.technology.unit !== undefined
  },
  {
    name: sectionTypes.technology_effects,
    order: 2,
    type: 'section',
    forType: 'technology',
    shownInTooltip: true,
    getValue: (data, context) => {
      const transformedEffects = []
      //const modifiers = Object.values(context.factorioData.modifier)
      //console.log(modifiers)
      for (const effect of data.technology.effects)
        if (effect.type === 'unlock-recipe') {
          transformedEffects.push({
            name: effect.recipe,
            type: 'recipe'
          })
        } else {
          //TODO: add other effects
        }
      return { items: transformedEffects, itemsType: 'grid' }
    },
    postCondition: data => data.items?.length > 0
  },
  {
    name: sectionTypes.technology_prerequisites,
    order: 3,
    type: 'section',
    forType: 'technology',
    shownInTooltip: false,
    getValue: (data, context) => {
      const technologies = Object.values(context.factorioData.technology)
      const prerequisites = technologies
        .filter(technology => data.technology.prerequisites?.includes(technology.name))
        .map(technology => ({ name: technology.name, type: 'technology' }))
      return { items: prerequisites }
    },
    postCondition: data => data.items?.length > 0
  },
  {
    name: sectionTypes.technology_descendants,
    order: 4,
    type: 'section',
    forType: 'technology',
    shownInTooltip: false,
    getValue: (data, context) => {
      const technologies = Object.values(context.factorioData.technology)
      const descendants = technologies
        .filter(technology => technology.prerequisites?.includes(data.technology.name))
        .map(technology => ({ name: technology.name, type: 'technology' }))
      return { items: descendants, itemsType: 'grid' }
    },
    postCondition: data => data.items?.length > 0
  }
]
