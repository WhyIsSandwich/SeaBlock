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
      const sciencePacks = data.unit?.ingredients?.map(unit => ({
        name: unit[0],
        type: 'item',
        amount: unit[1]
      }))
      return {
        items: sciencePacks,
        statistics: [
          { label: labels.technology_cost, value: data.unit?.count },
          { label: labels.technology_time, value: data.unit?.time }
        ]
      }
    },
    condition: data => data.unit !== undefined
  },
  {
    name: sectionTypes.technology_effects,
    order: 2,
    type: 'section',
    forType: 'technology',
    shownInTooltip: true,
    getValue: data => ({ items: data.effects }),
    condition: data => data.effects !== undefined
  },
  {
    name: sectionTypes.technology_prerequisites,
    order: 3,
    type: 'section',
    forType: 'technology',
    shownInTooltip: true,
    getValue: (data, context) => {
      const technologies = Object.values(context.factorioData.technology)
      const prerequisites = technologies
        .filter(technology => data.prerequisites?.includes(technology.name))
        .map(technology => ({ name: technology.name, type: 'technology' }))
      return { items: prerequisites }
    },
    condition: data => data.prerequisites !== undefined
  },
  {
    name: sectionTypes.technology_descendants,
    order: 4,
    type: 'section',
    forType: 'technology',
    shownInTooltip: true,
    getValue: (data, context) => {
      const technologies = Object.values(context.factorioData.technology)
      const descendants = technologies
        .filter(technology => technology.prerequisites?.includes(data.name))
        .map(technology => ({ name: technology.name, type: 'technology' }))
      return { items: descendants }
    },
    condition: data => data.name !== undefined
  }
]

// Legacy exports for backward compatibility
export const technologyStatisticsRules = technologyRules.filter(rule => rule.type === 'statistics')
export const technologySectionRules = technologyRules.filter(rule => rule.type === 'section')
