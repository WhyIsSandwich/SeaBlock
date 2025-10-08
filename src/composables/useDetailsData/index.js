/**
 * Centralized exports for all detail rules
 */

// Rules engine
export { applyRules, applyRulesSorted, transforms } from './rulesEngine.js'

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
