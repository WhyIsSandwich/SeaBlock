// Global spritemap cache for SpriteIcon components
let spritemapCache = null
let spritemapCachePromise = null

const DEFAULT_PUBLIC_DATA_BASE_URL = 'https://factorio.whyissandwich.workers.dev'

export function getPublicDataUrl(relativePath, withBase) {
  const normalizedPath = relativePath.replace(/^\/+/, '')
  const isDev = Boolean(import.meta.env?.DEV)

  if (isDev) {
    return withBase(`/data/${normalizedPath}`)
  }

  const configuredBase = import.meta.env?.VITE_PUBLIC_DATA_BASE_URL || DEFAULT_PUBLIC_DATA_BASE_URL
  const trimmedBase = configuredBase.replace(/\/+$/, '')
  return `${trimmedBase}/${normalizedPath}`
}

export async function loadSpritemapData(withBase) {
  if (spritemapCache) {
    return spritemapCache
  }

  if (spritemapCachePromise) {
    return spritemapCachePromise
  }

  spritemapCachePromise = fetch(getPublicDataUrl('spritemap.json', withBase))
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
