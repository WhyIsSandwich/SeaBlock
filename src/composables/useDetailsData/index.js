/**
 * Centralized exports for all detail rules
 */

// Rules engine
export { applyRules, applyRulesSorted, transforms } from './rulesEngine.js'

// Individual rule types
export { entityRules, entityStatisticsRules, entitySectionRules } from './entityRules.js'
export { itemRules, itemStatisticsRules, itemSectionRules } from './itemRules.js'
export { tileRules, tileStatisticsRules, tileSectionRules } from './tileRules.js'
export { fluidRules, fluidStatisticsRules, fluidSectionRules } from './fluidRules.js'
export { recipeRules, recipeStatisticsRules, recipeSectionRules } from './recipeRules.js'
export {
  technologyRules,
  technologyStatisticsRules,
  technologySectionRules
} from './technologyRules.js'

// Unified rules array - combines all rule types
import { entityRules } from './entityRules.js'
import { itemRules } from './itemRules.js'
import { tileRules } from './tileRules.js'
import { fluidRules } from './fluidRules.js'
import { recipeRules } from './recipeRules.js'
import { technologyRules } from './technologyRules.js'

export const allRules = [
  ...entityRules,
  ...itemRules,
  ...tileRules,
  ...fluidRules,
  ...recipeRules,
  ...technologyRules
]
