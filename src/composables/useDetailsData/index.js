/**
 * Centralized exports for all detail rules
 */

// Rules engine
export {
  applyStatisticsRules,
  applySectionRules,
  createSimpleStatisticsRule,
  createCustomStatisticsRule,
  createStatisticsRule,
  createSectionRule,
  transforms
} from './rulesEngine.js'

// Entity rules
export { entityStatisticsRules, entitySectionRules } from './entityRules.js'

// Item rules
export { itemStatisticsRules, itemSectionRules } from './itemRules.js'

// Tile rules
export { tileStatisticsRules, tileSectionRules } from './tileRules.js'

// Fluid rules
export { fluidStatisticsRules, fluidSectionRules } from './fluidRules.js'

// Recipe rules
export { recipeStatisticsRules, recipeSectionRules } from './recipeRules.js'

// Technology rules
export { technologyStatisticsRules, technologySectionRules } from './technologyRules.js'
