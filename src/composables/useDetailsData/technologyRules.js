import { createSectionRule } from './rulesEngine.js'
import { sectionTypes, labels } from '../detailsDataTypes.js'

/**
 * Technology statistics rules - technologies typically don't have direct statistics
 */
export const technologyStatisticsRules = []

/**
 * Technology section rules
 */
export const technologySectionRules = [
  createSectionRule(sectionTypes.technology_cost, data => {
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
  }), // TODO: add unlock technologies
  createSectionRule(sectionTypes.technology_effects, data => ({ items: data.effects })),
  createSectionRule(sectionTypes.technology_prerequisites, (data, context) => {
    const technologies = Object.values(context.factorioData.technology)
    const prerequisites = technologies
      .filter(technology => data.prerequisites?.includes(technology.name))
      .map(technology => ({ name: technology.name, type: 'technology' }))
    return { items: prerequisites }
  }),
  createSectionRule(sectionTypes.technology_descendants, (data, context) => {
    const technologies = Object.values(context.factorioData.technology)
    const descendants = technologies
      .filter(technology => technology.prerequisites?.includes(data.name))
      .map(technology => ({ name: technology.name, type: 'technology' }))
    return { items: descendants }
  })
]
