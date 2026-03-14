/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config/assetConfig.js', () => ({
  assetConfig: {
    dataBaseUrl: '',
    spritePreferredFormat: 'png',
    isDev: true
  }
}))

describe('assetResolver (dev config)', () => {
  beforeEach(() => {
    vi.doMock('../config/assetConfig.js', () => ({
      assetConfig: {
        dataBaseUrl: '',
        spritePreferredFormat: 'png',
        isDev: true
      }
    }))
  })

  it('resolveDataUrl returns withBase path when dataBaseUrl is empty', async () => {
    const { resolveDataUrl } = await import('./assetResolver.js')
    const withBase = p => `__base__${p}`
    expect(resolveDataUrl('data.json', withBase)).toBe('__base__/generated/data/dev/data.json')
    expect(resolveDataUrl('spritemap.json', withBase)).toBe('__base__/generated/data/dev/spritemap.json')
  })

  it('resolveDataUrl normalizes leading slashes', async () => {
    const { resolveDataUrl } = await import('./assetResolver.js')
    const withBase = p => `__base__${p}`
    expect(resolveDataUrl('/data.json', withBase)).toBe('__base__/generated/data/dev/data.json')
  })

  it('resolveSpriteImageUrl uses png extension in dev', async () => {
    const { resolveSpriteImageUrl } = await import('./assetResolver.js')
    const withBase = p => `__base__${p}`
    expect(resolveSpriteImageUrl('spritemap.png', withBase)).toBe('__base__/generated/data/dev/spritemap.png')
  })
})
