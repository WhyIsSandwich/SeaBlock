/**
 * Main entry point for SeaBlock JavaScript modules
 * Exports all composables and components for easy importing
 *
 * This file provides a centralized import point while avoiding
 * naming collisions by only exporting specific named exports.
 */

// Composables - only export the main composable functions
export { useFactorioData } from './composables/useFactorioData.js'
// Utilities
export * from './composables/energyUtils.js'
export { useUnifiedObjects } from './composables/useUnifiedObjects.js'

// Components - only export the main functions we need
export { createFactorioAnimationEngine } from './components/FactorioAnimationEngine.js'
export { loadSpritemapData } from './components/spriteCache.js'
