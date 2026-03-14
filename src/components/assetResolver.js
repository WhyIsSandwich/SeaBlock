/**
 * Canonical URL resolver for public data and sprite assets.
 * Uses build-time assetConfig for base URL and format.
 */

import { assetConfig } from '../config/assetConfig.js'

/**
 * Resolve a public data URL (JSON, spritemap image, etc.).
 * @param {string} relativePath - Path relative to data root (e.g. "spritemap.json", "data.json")
 * @param {function} withBase - VitePress withBase for site-relative paths
 * @returns {string} Absolute URL
 */
export function resolveDataUrl(relativePath, withBase) {
  const normalized = String(relativePath).replace(/^\/+/, '')

  if (!assetConfig.dataBaseUrl) {
    return withBase(`/generated/data/dev/${normalized}`)
  }

  const base = assetConfig.dataBaseUrl.replace(/\/+$/, '')
  return `${base}/${normalized}`
}

/**
 * Resolve sprite sheet image URL with format from config.
 * @param {string} imageBasename - Basename from spritemap.json (e.g. "spritemap.png")
 * @param {function} withBase - VitePress withBase for site-relative paths
 * @returns {string} Absolute URL for the configured format (png or webp)
 */
export function resolveSpriteImageUrl(imageBasename, withBase) {
  const base = String(imageBasename || 'spritemap.png').replace(/\.(png|webp)$/i, '')
  const ext = assetConfig.spritePreferredFormat === 'webp' ? '.webp' : '.png'
  const filename = `${base}${ext}`
  return resolveDataUrl(filename, withBase)
}

/**
 * Resolve arbitrary asset path (e.g. entity/tile graphics) with format from config.
 * Applies png/webp based on spritePreferredFormat for image paths.
 * @param {string} relativePath - Path relative to data root (e.g. "base/graphics/entity/x.png")
 * @param {function} withBase - VitePress withBase for site-relative paths
 * @returns {string} Absolute URL
 */
export function resolveAssetUrl(relativePath, withBase) {
  let normalized = String(relativePath).replace(/^\/+/, '')
  if (/\.(png|webp)$/i.test(normalized)) {
    const base = normalized.replace(/\.(png|webp)$/i, '')
    const ext = assetConfig.spritePreferredFormat === 'webp' ? '.webp' : '.png'
    normalized = `${base}${ext}`
  }
  return resolveDataUrl(normalized, withBase)
}
