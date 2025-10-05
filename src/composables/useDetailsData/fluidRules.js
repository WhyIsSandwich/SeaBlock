import { createSimpleStatisticsRule } from './rulesEngine.js'
import { labels } from '../useDetailsData.js'

/**
 * Fluid statistics rules
 */
export const fluidStatisticsRules = [
  createSimpleStatisticsRule('fuel_value', labels.fuel_value),
  createSimpleStatisticsRule('fuel_pollution', labels.fuel_pollution),
  createSimpleStatisticsRule('min_temperature', labels.min_temperature),
  createSimpleStatisticsRule('max_temperature', labels.max_temperature),
  createSimpleStatisticsRule('heat_capacity', labels.heat_capacity)
]

/**
 * Fluid section rules - fluids typically don't have sections
 */
export const fluidSectionRules = []
