/**
 * Centralized exports for all detail rules
 */

// Rules engine
export { applyRules, applyRulesSorted, transforms } from './rulesEngine.js'

// Entity rules
export { entityRules, entityStatisticsRules, entitySectionRules } from './entityRules.js'

// Item rules
export { itemRules, itemStatisticsRules, itemSectionRules } from './itemRules.js'

// Tile rules
export { tileRules, tileStatisticsRules, tileSectionRules } from './tileRules.js'

// Fluid rules
export { fluidRules, fluidStatisticsRules, fluidSectionRules } from './fluidRules.js'

// Recipe rules
export { recipeRules, recipeStatisticsRules, recipeSectionRules } from './recipeRules.js'

// Technology rules
export {
  technologyRules,
  technologyStatisticsRules,
  technologySectionRules
} from './technologyRules.js'
