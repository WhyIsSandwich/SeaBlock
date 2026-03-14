/**
 * Build-time asset delivery configuration.
 * Values are injected via Vite env at build/start time.
 * Dev: local /generated/data/dev/... + png. Prod: CDN base URL (can include hash path) + webp.
 */

const isDev = Boolean(import.meta.env?.DEV)

/** Base URL for public data assets. Empty = use site-relative paths (dev). Include hash path in prod, e.g. https://cdn.example.com/abc123 */
const dataBaseUrl =
  import.meta.env?.VITE_ASSET_DATA_BASE_URL ??
  (isDev ? '' : 'https://factorio.whyissandwich.workers.dev')

/** Preferred sprite image format: "png" (dev) or "webp" (prod). */
const spritePreferredFormat =
  import.meta.env?.VITE_ASSET_SPRITE_FORMAT ?? (isDev ? 'png' : 'webp')

export const assetConfig = {
  dataBaseUrl: String(dataBaseUrl).replace(/\/+$/, ''),
  spritePreferredFormat: spritePreferredFormat === 'webp' ? 'webp' : 'png',
  isDev
}
