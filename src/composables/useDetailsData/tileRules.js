import {
  createSimpleStatisticsRule,
  createCustomStatisticsRule,
  createSectionRule,
  transforms
} from './rulesEngine.js'
import { sectionTypes, labels } from '../detailsDataTypes.js'

/**
 * Tile statistics rules
 */
export const tileStatisticsRules = [
  createSimpleStatisticsRule(
    'walking_speed_modifier',
    labels.walking_speed,
    transforms.formatPercent
  ),
  createCustomStatisticsRule(
    'absorptions_per_second.pollution',
    labels.pollution_absorption,
    // 32x32 area, 60 seconds figure is /m per chunk
    data =>
      data.absorptions_per_second?.pollution
        ? `${(data.absorptions_per_second.pollution * 32 * 32 * 60)?.toFixed(2)}/m per chunk`
        : null
  )
]

/**
 * Tile section rules - tiles typically don't have sections
 */
export const tileSectionRules = [
  createSectionRule(sectionTypes.allows_placement, (data, context) => {
    const placeableAsTiles = Object.values(context.factorioData.item).filter(
      tile => tile.place_as_tile
    )

    let validPlaceableAsTiles = []

    for (const tile of placeableAsTiles) {
      const place_as_tile = tile.place_as_tile

      if (checkTilePlacementCondition(place_as_tile, data)) {
        console.log('valid placeable as tile', tile.name)
        validPlaceableAsTiles.push({ name: tile.name, type: 'tile' })
      }
    }

    validPlaceableAsTiles = validPlaceableAsTiles.map(tile => ({ name: tile.name, type: 'tile' }))
    if (validPlaceableAsTiles.length > 0) {
      return { items: validPlaceableAsTiles }
    }
  }),
  createSectionRule(sectionTypes.source_of, (data, context) => {
    if (data.fluid) {
      return { items: [{ name: data.fluid, type: 'fluid' }] }
    }
  }),
  createSectionRule(sectionTypes.extracted_by, (data, context) => {
    if (data.fluid) {
      return { items: [{ name: 'offshore-pump', type: 'entity' }] }
    }
  })
]

export function checkTilePlacementCondition(placeAsTile, targetTile) {
  if (!placeAsTile || !targetTile) return false
  const invert = placeAsTile.invert ?? false
  // Check tile_condition first (explicit whitelist)
  if (placeAsTile.tile_condition) {
    const allowedTiles = Array.isArray(placeAsTile.tile_condition)
      ? placeAsTile.tile_condition
      : [placeAsTile.tile_condition]

    if (allowedTiles.includes(targetTile.name) !== invert) {
      return true
    }
  }

  // Check collision mask condition
  if (placeAsTile.condition) {
    const targetCollisionMask = targetTile.collision_mask || {}
    let maskPasses = true

    // Handle both array and object formats for condition
    if (typeof placeAsTile.condition === 'object') {
      // Object format: { "water-tile": true, "ground-tile": true }
      for (const [layer, required] of Object.entries(placeAsTile.condition)) {
        const hasLayer = targetCollisionMask.layers?.[layer] || targetCollisionMask[layer]
        const shouldHaveLayer = placeAsTile.invert ? !required : required

        if (hasLayer !== shouldHaveLayer) {
          maskPasses = false
          break
        }
      }
    }

    if (!maskPasses) {
      return false
    }
  }

  return true
}
