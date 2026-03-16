import { sectionTypes, labels } from '../detailsDataTypes.js'

import { transforms } from './rulesEngine.js'

/**
 * Tile rules - unified format for both statistics and sections
 */
export const tileRules = [
  // Statistics rules
  {
    name: labels.walking_speed,
    order: 1,
    type: 'statistics',
    forType: 'tile',
    shownInTooltip: true,
    getValue: data => data.tile?.walking_speed_modifier,
    transform: transforms.formatPercent,
    condition: data => data.tile?.walking_speed_modifier !== undefined
  },
  {
    name: labels.pollution_absorption,
    order: 2,
    type: 'statistics',
    forType: 'tile',
    shownInTooltip: true,
    getValue: data => {
      // 32x32 area, 60 seconds figure is /m per chunk
      return data.tile?.absorptions_per_second?.pollution
        ? `${(data.tile?.absorptions_per_second.pollution * 32 * 32 * 60)?.toFixed(2)}/m per chunk`
        : null
    },
    condition: data => data.tile?.absorptions_per_second?.pollution !== undefined
  },

  // Section rules
  {
    name: sectionTypes.allows_placement,
    order: 1,
    type: 'section',
    forType: 'tile',
    shownInTooltip: false,
    getValue: (data, context) => {
      const placeableAsTiles = Object.values(context.factorioData.item).filter(
        tile => tile.place_as_tile
      )

      let validPlaceableAsTiles = []

      for (const tile of placeableAsTiles) {
        const { place_as_tile } = tile

        if (checkTilePlacementCondition(place_as_tile, data.tile)) {
          console.log('valid placeable as tile', tile.name)
          validPlaceableAsTiles.push({ name: tile.name, type: 'tile' })
        }
      }

      validPlaceableAsTiles = validPlaceableAsTiles.map(tile => ({ name: tile.name, type: 'item' }))
      return validPlaceableAsTiles.length > 0 ? { items: validPlaceableAsTiles } : null
    },
    postCondition: data => data.items?.length > 0
  },
  {
    name: sectionTypes.source_of,
    order: 2,
    type: 'section',
    forType: 'tile',
    shownInTooltip: false,
    getValue: data =>
      data.tile?.fluid ? { items: [{ name: data.tile?.fluid, type: 'fluid' }] } : null,
    postCondition: data => data.items?.length > 0
  },
  {
    name: sectionTypes.extracted_by,
    order: 3,
    type: 'section',
    forType: 'tile',
    shownInTooltip: false,
    getValue: data =>
      data.tile?.fluid ? { items: [{ name: 'offshore-pump', type: 'entity' }] } : null,
    postCondition: data => data.items?.length > 0
  }
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

// Legacy exports for backward compatibility
export const tileStatisticsRules = tileRules.filter(rule => rule.type === 'statistics')
export const tileSectionRules = tileRules.filter(rule => rule.type === 'section')
