import { createSectionRule } from './rulesEngine.js'
import { sectionTypes } from '../useDetailsData.js'

/**
 * Technology statistics rules - technologies typically don't have direct statistics
 */
export const technologyStatisticsRules = []

/**
 * Technology section rules
 */
export const technologySectionRules = [
  createSectionRule(sectionTypes.technology_cost, data => []), // TODO: add unlock technologies
  createSectionRule(sectionTypes.technology_effects, data => []) // TODO: add unlock technologies
]

