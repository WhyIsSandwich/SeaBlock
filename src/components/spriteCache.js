// Global spritemap cache for SpriteIcon components
let spritemapCache = null
let spritemapCachePromise = null

import { resolveDataUrl, resolveSpriteImageUrl } from './assetResolver.js'

/** @deprecated Use resolveDataUrl from assetResolver. Kept for compatibility. */
export function getPublicDataUrl(relativePath, withBase) {
  return resolveDataUrl(relativePath, withBase)
}

/** Resolve sprite sheet image URL (format from build config). */
export function getSpriteImageUrl(imageBasename, withBase) {
  return resolveSpriteImageUrl(imageBasename, withBase)
}

export function loadSpritemapData(withBase) {
  if (spritemapCache) {
    return spritemapCache
  }

  if (spritemapCachePromise) {
    return spritemapCachePromise
  }

  spritemapCachePromise = fetch(resolveDataUrl('spritemap.json', withBase))
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then(data => {
      spritemapCache = data
      return spritemapCache
    })
    .catch(error => {
      console.error('Failed to load spritemap data:', error)
      spritemapCachePromise = null
      return null
    })

  return spritemapCachePromise
}
