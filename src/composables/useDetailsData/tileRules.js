import { createSimpleStatisticsRule } from './rulesEngine.js'
import { labels } from '../useDetailsData.js'

/**
 * Tile statistics rules
 */
export const tileStatisticsRules = [
  createSimpleStatisticsRule('walking_speed', labels.walking_speed),
  createSimpleStatisticsRule('pollution_absorption', labels.pollution_absorption)
]

/**
 * Tile section rules - tiles typically don't have sections
 */
export const tileSectionRules = []
