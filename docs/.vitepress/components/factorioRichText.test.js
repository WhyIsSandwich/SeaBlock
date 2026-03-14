import { readFileSync } from 'node:fs'
import path from 'node:path'

import { h } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import {
  FACTORIO_RICH_TEXT_PROJECT_TAGS,
  FACTORIO_RICH_TEXT_SPEC_TAGS,
  parseFactorioRichText,
  renderFactorioRichTextTokens
} from './factorioRichText.js'

function collectStrings(value, output) {
  if (typeof value === 'string') {
    output.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, output)
    }
    return
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      collectStrings(nested, output)
    }
  }
}

function collectRenderedText(nodes, out = []) {
  for (const node of nodes) {
    if (typeof node === 'string') {
      out.push(node)
      continue
    }
    const children = Array.isArray(node?.children) ? node.children : []
    if (children.length > 0) {
      collectRenderedText(children, out)
    }
  }
  return out
}

describe('factorioRichText parser', () => {
  it('parses base tags, color containers, and shorthand closes', () => {
    const text =
      '[color=#9cdcfe]Need [item=iron-plate,quality=normal] and [fluid=water][.color]'
    const { tokens, diagnostics } = parseFactorioRichText(text)
    expect(diagnostics).toEqual([])
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'open', tagName: 'color' }),
        expect.objectContaining({
          kind: 'reference',
          tagName: 'item',
          name: 'iron-plate',
          attributes: { quality: 'normal' }
        }),
        expect.objectContaining({ kind: 'reference', tagName: 'fluid', name: 'water' }),
        expect.objectContaining({ kind: 'close', tagName: 'color' })
      ])
    )
  })

  it('parses Space Age and utility tags', () => {
    const text =
      '[planet=gleba] [space-location=shattered-planet] [space-age] [img=utility.warning_icon] [tooltip=Hover,item-name.iron-plate]'
    const { tokens, diagnostics } = parseFactorioRichText(text)
    expect(diagnostics).toEqual([])
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'reference', tagName: 'planet', name: 'gleba' }),
        expect.objectContaining({
          kind: 'reference',
          tagName: 'space-location',
          name: 'shattered-planet'
        }),
        expect.objectContaining({ kind: 'meta', tagName: 'space-age' }),
        expect.objectContaining({ kind: 'img', spriteClass: 'utility', spriteName: 'warning_icon' }),
        expect.objectContaining({ kind: 'tooltip', text: 'Hover', localeKey: 'item-name.iron-plate' })
      ])
    )
  })

  it('keeps non-tag bracket text as literal content', () => {
    const { tokens, diagnostics } = parseFactorioRichText('[Place in rocket silo to launch into space]')
    expect(diagnostics).toEqual([])
    expect(tokens).toEqual([{ kind: 'text', content: '[Place in rocket silo to launch into space]' }])
  })

  it('reports unsupported tags in strict mode', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { diagnostics } = parseFactorioRichText('[unknown=thing]', { strict: true })
    expect(diagnostics).toEqual([
      expect.objectContaining({ kind: 'unsupported_tag', rawTag: '[unknown=thing]' })
    ])
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})

describe('factorioRichText renderer', () => {
  it('reports mismatched closes and keeps literal fallback', () => {
    const parsed = parseFactorioRichText('[color=green]A[/font]')
    const { nodes, diagnostics } = renderFactorioRichTextTokens(parsed.tokens)
    const text = collectRenderedText(nodes).join(' ')
    expect(text.includes('[/font]')).toBe(true)
    expect(diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'mismatched_close_tag' })])
    )
  })

  it('maps Factorio font names to deterministic CSS fallback styles', () => {
    const parsed = parseFactorioRichText('[font=default-semibold]A[/font] F[font=default-tiny-bold]6[/font]')
    const { nodes, diagnostics } = renderFactorioRichTextTokens(parsed.tokens)
    expect(diagnostics).toEqual([])

    const fontNodes = nodes.filter(node => typeof node !== 'string')
    expect(fontNodes.length).toBeGreaterThanOrEqual(2)

    const semiboldStyle = fontNodes[0].props?.style || {}
    expect(semiboldStyle.fontFamily).toContain('default-semibold')
    expect(semiboldStyle.fontWeight).toBe(600)

    const tinyBoldStyle = fontNodes[1].props?.style || {}
    expect(tinyBoldStyle.fontFamily).toContain('default-tiny-bold')
    expect(tinyBoldStyle.fontWeight).toBe(700)
    expect(tinyBoldStyle.fontSize).toBe('0.78em')
  })

  it('normalizes comma-separated Factorio colors into CSS rgb()', () => {
    const parsed = parseFactorioRichText('[color=255,230,192]Drops[/color]')
    const { nodes, diagnostics } = renderFactorioRichTextTokens(parsed.tokens)
    expect(diagnostics).toEqual([])

    const colorNode = nodes.find(node => typeof node !== 'string')
    expect(colorNode).toBeTruthy()
    expect(colorNode.props?.style?.color).toBe('rgb(255, 230, 192)')
  })

  it('renders item references as tooltip-enabled inline icon references', () => {
    const parsed = parseFactorioRichText('x [item=iron-plate] y')
    const IconButtonStub = { name: 'IconButtonStub', render: () => h('span') }
    const SpriteIconStub = { name: 'SpriteIconStub', render: () => h('span') }
    const { nodes, diagnostics } = renderFactorioRichTextTokens(parsed.tokens, {
      IconButton: IconButtonStub,
      SpriteIcon: SpriteIconStub
    })
    expect(diagnostics).toEqual([])

    const richNode = nodes.find(
      node => typeof node !== 'string' && node.type === IconButtonStub && node.props?.type === 'item'
    )
    expect(richNode).toBeTruthy()
    expect(richNode.props?.showTooltip).toBe(true)
    expect(richNode.props?.clickable).toBe(true)
    expect(typeof richNode.children?.container).toBe('function')
  })
})

describe('factorioRichText data completeness', () => {
  it('covers all encountered tag names in generated locale and tooltips data', () => {
    const dataDir = path.join(process.cwd(), 'generated/data/dev')
    const locale = JSON.parse(readFileSync(path.join(dataDir, 'locale-en.json'), 'utf8'))
    const tooltips = JSON.parse(readFileSync(path.join(dataDir, 'en-tooltips.json'), 'utf8'))
    const strings = []
    collectStrings(locale, strings)
    collectStrings(tooltips, strings)

    const unsupported = []
    const invalidStructure = []

    for (const text of strings) {
      const { diagnostics } = parseFactorioRichText(text)
      for (const diagnostic of diagnostics) {
        if (diagnostic.kind === 'unsupported_tag') unsupported.push(diagnostic.rawTag)
        if (
          diagnostic.kind === 'missing_argument' ||
          diagnostic.kind === 'malformed_argument' ||
          diagnostic.kind === 'malformed_close_tag'
        ) {
          invalidStructure.push(diagnostic.rawTag)
        }
      }
    }

    expect(FACTORIO_RICH_TEXT_SPEC_TAGS.length).toBeGreaterThan(10)
    expect(FACTORIO_RICH_TEXT_PROJECT_TAGS).toEqual(expect.arrayContaining(['size', 'bold']))
    expect(unsupported).toEqual([])
    expect(invalidStructure).toEqual([])
  })
})
