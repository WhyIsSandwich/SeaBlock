import { h } from 'vue'

const BASE_REFERENCE_TAGS = new Set([
  'item',
  'entity',
  'technology',
  'recipe',
  'item-group',
  'fluid',
  'tile',
  'virtual-signal',
  'achievement',
  'equipment'
])

const SPACE_AGE_REFERENCE_TAGS = new Set(['planet', 'space-location'])

const UTILITY_REFERENCE_TAGS = new Set([
  'gps',
  'train',
  'train-stop',
  'shortcut',
  'tip',
  'tooltip',
  'space-platform',
  'space-age',
  'special-item',
  'blueprint',
  'armor',
  'quality',
  'img'
])

const PROJECT_EXTENSION_TAGS = new Set(['size', 'bold', 'italic', 'underline'])
const CONTAINER_TAGS = new Set(['color', 'font', 'size', 'bold', 'italic', 'underline'])
const SHORTHAND_CLOSE_TAGS = new Set(['color', 'font', 'size'])

const RENDERABLE_ICON_TAGS = new Set([
  ...BASE_REFERENCE_TAGS,
  ...SPACE_AGE_REFERENCE_TAGS,
  'space-platform'
])

const INLINE_META_TAGS = new Set(['gps', 'train', 'train-stop', 'shortcut', 'tip', 'armor', 'blueprint'])
const DEFAULT_FACTORIO_FONT_STACK = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
const MONOSPACE_FONT_STACK = "'Fira Code', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace"
const FACTORIO_FONT_PROFILE_OVERRIDES = Object.freeze({
  default: {},
  'default-semibold': { fontWeight: 600 },
  'default-bold': { fontWeight: 700 },
  'default-small': { fontSize: '0.9em' },
  'default-small-semibold': { fontSize: '0.9em', fontWeight: 600 },
  'default-small-bold': { fontSize: '0.9em', fontWeight: 700 },
  'default-tiny': { fontSize: '0.78em' },
  'default-tiny-semibold': { fontSize: '0.78em', fontWeight: 600 },
  'default-tiny-bold': { fontSize: '0.78em', fontWeight: 700 },
  'default-large': { fontSize: '1.15em' },
  'default-large-semibold': { fontSize: '1.15em', fontWeight: 600 },
  'default-large-bold': { fontSize: '1.15em', fontWeight: 700 },
  'default-game': { fontSize: '1.15em' }
})

export const FACTORIO_RICH_TEXT_SPEC_TAGS = Object.freeze(
  [...BASE_REFERENCE_TAGS, ...SPACE_AGE_REFERENCE_TAGS, ...UTILITY_REFERENCE_TAGS, 'color', 'font']
)

export const FACTORIO_RICH_TEXT_PROJECT_TAGS = Object.freeze([...PROJECT_EXTENSION_TAGS])

function createDiagnostic(kind, severity, message, rawTag) {
  return { kind, severity, message, rawTag }
}

function normalizeTagName(rawName) {
  if (!rawName) return ''
  return rawName.startsWith('.') ? rawName.slice(1) : rawName
}

function splitByCommaPreservingQuotes(value) {
  const parts = []
  let current = ''
  let quoteChar = null
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if ((char === '"' || char === "'") && (i === 0 || value[i - 1] !== '\\')) {
      if (quoteChar === char) {
        quoteChar = null
      } else if (!quoteChar) {
        quoteChar = char
      }
      current += char
      continue
    }
    if (char === ',' && !quoteChar) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.length > 0) {
    parts.push(current.trim())
  }
  return parts
}

function parseReferenceArgs(tagName, argsValue) {
  const parts = splitByCommaPreservingQuotes(argsValue)
  const primary = parts.shift()?.trim()
  if (!primary) return null
  const attributes = {}
  for (const segment of parts) {
    const [key, ...valueParts] = segment.split('=')
    if (!key || valueParts.length === 0) continue
    attributes[key.trim()] = valueParts.join('=').trim()
  }
  return { name: primary, attributes, tagName }
}

function parseTooltipArgs(argsValue) {
  const parts = splitByCommaPreservingQuotes(argsValue)
  if (parts.length === 0) return null
  const text = parts[0] ?? ''
  const localeKey = parts[1] ?? ''
  return { text, localeKey }
}

function parseGpsArgs(argsValue) {
  const parts = splitByCommaPreservingQuotes(argsValue)
  if (parts.length < 2) return null
  return {
    x: parts[0],
    y: parts[1],
    surface: parts[2] || ''
  }
}

function parseImgArgs(argsValue) {
  const value = argsValue.trim()
  if (!value) return null
  if (value.includes('/')) {
    const [spriteClass, ...nameParts] = value.split('/')
    const spriteName = nameParts.join('/').trim()
    if (!spriteClass || !spriteName) return null
    return { spriteClass: spriteClass.trim(), spriteName, source: value }
  }
  if (value.includes('.')) {
    const [spriteClass, ...nameParts] = value.split('.')
    const spriteName = nameParts.join('.').trim()
    if (!spriteClass || !spriteName) return null
    return { spriteClass: spriteClass.trim(), spriteName, source: value }
  }
  return { spriteClass: '', spriteName: value, source: value }
}

function isKnownTag(tagName, extensionTags) {
  return (
    BASE_REFERENCE_TAGS.has(tagName) ||
    SPACE_AGE_REFERENCE_TAGS.has(tagName) ||
    UTILITY_REFERENCE_TAGS.has(tagName) ||
    CONTAINER_TAGS.has(tagName) ||
    extensionTags.has(tagName)
  )
}

function parseTag(rawTag, extensionTags) {
  const diagnostics = []
  const inner = rawTag.slice(1, -1).trim()
  if (!inner) {
    diagnostics.push(createDiagnostic('empty_tag', 'error', 'Encountered empty rich text tag.', rawTag))
    return { token: null, diagnostics }
  }

  if (inner.startsWith('/')) {
    const closeName = normalizeTagName(inner.slice(1).trim())
    if (!closeName) {
      diagnostics.push(
        createDiagnostic('malformed_close_tag', 'error', `Malformed closing tag "${rawTag}".`, rawTag)
      )
      return { token: null, diagnostics }
    }
    return { token: { kind: 'close', tagName: closeName, rawTag }, diagnostics }
  }

  if (inner.startsWith('.')) {
    const closeName = normalizeTagName(inner.trim())
    if (SHORTHAND_CLOSE_TAGS.has(closeName)) {
      return { token: { kind: 'close', tagName: closeName, rawTag }, diagnostics }
    }
    diagnostics.push(
      createDiagnostic(
        'unsupported_shorthand_close',
        'error',
        `Unsupported shorthand closing tag "${rawTag}".`,
        rawTag
      )
    )
    return { token: null, diagnostics }
  }

  const eqIndex = inner.indexOf('=')
  const tagName = normalizeTagName((eqIndex >= 0 ? inner.slice(0, eqIndex) : inner).trim())
  const argsValue = eqIndex >= 0 ? inner.slice(eqIndex + 1).trim() : ''

  if (!/^[a-z][a-z-]*$/i.test(tagName)) {
    return { token: null, diagnostics }
  }

  if (!isKnownTag(tagName, extensionTags)) {
    diagnostics.push(
      createDiagnostic('unsupported_tag', 'error', `Unsupported rich text tag "${tagName}".`, rawTag)
    )
    return { token: null, diagnostics }
  }

  if (CONTAINER_TAGS.has(tagName)) {
    if (!argsValue && (tagName === 'color' || tagName === 'font' || tagName === 'size')) {
      diagnostics.push(
        createDiagnostic('missing_argument', 'error', `Tag "${tagName}" requires an argument.`, rawTag)
      )
      return { token: null, diagnostics }
    }
    return { token: { kind: 'open', tagName, argsValue, rawTag }, diagnostics }
  }

  if (BASE_REFERENCE_TAGS.has(tagName) || SPACE_AGE_REFERENCE_TAGS.has(tagName)) {
    const parsed = parseReferenceArgs(tagName, argsValue)
    if (!parsed) {
      diagnostics.push(
        createDiagnostic('missing_argument', 'error', `Tag "${tagName}" requires a valid name.`, rawTag)
      )
      return { token: null, diagnostics }
    }
    return { token: { kind: 'reference', tagName, ...parsed, rawTag }, diagnostics }
  }

  switch (tagName) {
    case 'img': {
      const parsed = parseImgArgs(argsValue)
      if (!parsed) {
        diagnostics.push(
          createDiagnostic('missing_argument', 'error', 'Tag "img" requires a sprite path.', rawTag)
        )
        return { token: null, diagnostics }
      }
      return { token: { kind: 'img', tagName, ...parsed, rawTag }, diagnostics }
    }
    case 'tooltip': {
      const parsed = parseTooltipArgs(argsValue)
      if (!parsed) {
        diagnostics.push(
          createDiagnostic('missing_argument', 'error', 'Tag "tooltip" requires text payload.', rawTag)
        )
        return { token: null, diagnostics }
      }
      return { token: { kind: 'tooltip', tagName, ...parsed, rawTag }, diagnostics }
    }
    case 'gps': {
      const parsed = parseGpsArgs(argsValue)
      if (!parsed) {
        diagnostics.push(
          createDiagnostic('malformed_argument', 'error', 'Tag "gps" requires x,y[,surface].', rawTag)
        )
        return { token: null, diagnostics }
      }
      return { token: { kind: 'meta', tagName, payload: parsed, rawTag }, diagnostics }
    }
    case 'train':
    case 'train-stop':
    case 'shortcut':
    case 'tip':
    case 'armor':
    case 'blueprint':
    case 'special-item':
    case 'space-platform':
    case 'quality': {
      if (!argsValue) {
        diagnostics.push(
          createDiagnostic('missing_argument', 'error', `Tag "${tagName}" requires an argument.`, rawTag)
        )
        return { token: null, diagnostics }
      }
      return { token: { kind: 'meta', tagName, payload: argsValue, rawTag }, diagnostics }
    }
    case 'space-age':
      return { token: { kind: 'meta', tagName, payload: '', rawTag }, diagnostics }
    default:
      diagnostics.push(
        createDiagnostic(
          'unsupported_tag',
          'error',
          `Tag "${tagName}" is known but has no parser branch.`,
          rawTag
        )
      )
      return { token: null, diagnostics }
  }
}

export function parseFactorioRichText(text, options = {}) {
  const strict = Boolean(options.strict)
  const extensionTags = new Set([...(options.extensionTags || []), ...PROJECT_EXTENSION_TAGS])
  const input = typeof text === 'string' ? text : String(text ?? '')
  const tokens = []
  const diagnostics = []
  const tagRegex = /\[([^[\]]+)\]/g
  let currentIndex = 0
  let match

  while ((match = tagRegex.exec(input)) !== null) {
    if (match.index > currentIndex) {
      tokens.push({ kind: 'text', content: input.slice(currentIndex, match.index) })
    }

    const rawTag = match[0]
    const parsed = parseTag(rawTag, extensionTags)
    diagnostics.push(...parsed.diagnostics)
    if (parsed.token) {
      tokens.push(parsed.token)
    } else {
      tokens.push({ kind: 'text', content: rawTag })
    }
    currentIndex = match.index + rawTag.length
  }

  if (currentIndex < input.length) {
    tokens.push({ kind: 'text', content: input.slice(currentIndex) })
  }

  if (strict) {
    for (const diagnostic of diagnostics) {
      if (diagnostic.severity === 'error') {
        console.error(`[FactorioRichText] ${diagnostic.message}`)
      } else {
        console.warn(`[FactorioRichText] ${diagnostic.message}`)
      }
    }
  }

  return { tokens, diagnostics }
}

function normalizeInlineSpriteKey(spriteClass, spriteName) {
  if (!spriteClass) return spriteName
  return `${spriteClass}-${spriteName}`.replace(/[/.]/g, '-')
}

function resolveFactorioFontStyle(fontName) {
  const normalized = String(fontName || '').trim()
  if (!normalized) return {}

  const lower = normalized.toLowerCase()
  const hasExplicitList = normalized.includes(',')
  const preferMonospace = lower.includes('mono') || lower.includes('code')
  const fallbackStack = preferMonospace ? MONOSPACE_FONT_STACK : DEFAULT_FACTORIO_FONT_STACK
  const fontFamily = hasExplicitList ? normalized : `${JSON.stringify(normalized)}, ${fallbackStack}`

  const profile = {
    ...(FACTORIO_FONT_PROFILE_OVERRIDES[lower] || {})
  }

  if (!profile.fontWeight) {
    if (lower.includes('bold')) profile.fontWeight = 700
    else if (lower.includes('semibold')) profile.fontWeight = 600
  }

  if (!profile.fontSize) {
    if (lower.includes('tiny')) profile.fontSize = '0.78em'
    else if (lower.includes('small')) profile.fontSize = '0.9em'
    else if (lower.includes('large')) profile.fontSize = '1.15em'
  }

  return { fontFamily, ...profile }
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeFactorioColor(colorValue) {
  const raw = String(colorValue || '').trim()
  if (!raw) return raw

  if (raw.startsWith('#')) return raw
  if (/^(rgb|rgba|hsl|hsla|lab|lch|oklab|oklch|color|var)\(/i.test(raw)) return raw

  const parts = raw.split(',').map(part => part.trim())
  if (!(parts.length === 3 || parts.length === 4)) return raw

  const numeric = parts.map(part => Number(part))
  if (numeric.some(value => Number.isNaN(value))) return raw

  const hasByteRange = numeric.slice(0, 3).some(value => Math.abs(value) > 1)
  const [rRaw, gRaw, bRaw] = numeric
  const r = hasByteRange ? clampNumber(Math.round(rRaw), 0, 255) : clampNumber(Math.round(rRaw * 255), 0, 255)
  const g = hasByteRange ? clampNumber(Math.round(gRaw), 0, 255) : clampNumber(Math.round(gRaw * 255), 0, 255)
  const b = hasByteRange ? clampNumber(Math.round(bRaw), 0, 255) : clampNumber(Math.round(bRaw * 255), 0, 255)

  if (parts.length === 3) {
    return `rgb(${r}, ${g}, ${b})`
  }

  const alphaRaw = numeric[3]
  const alpha = hasByteRange ? clampNumber(alphaRaw / 255, 0, 1) : clampNumber(alphaRaw, 0, 1)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function humanizeReferenceName(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function formatReferenceTypeLabel(tagName) {
  const labelByTag = {
    item: 'Item',
    entity: 'Entity',
    technology: 'Technology',
    recipe: 'Recipe',
    'item-group': 'Item Group',
    fluid: 'Fluid',
    tile: 'Tile',
    'virtual-signal': 'Virtual Signal',
    achievement: 'Achievement',
    equipment: 'Equipment',
    planet: 'Planet',
    'space-location': 'Space Location',
    'space-platform': 'Space Platform'
  }
  return labelByTag[tagName] || humanizeReferenceName(tagName)
}

function formatInlineReferenceLabel(token) {
  const typeLabel = formatReferenceTypeLabel(token.tagName)
  const objectLabel = humanizeReferenceName(token.name)
  return `[${typeLabel}: ${objectLabel}]`
}

function createContainerNode(token) {
  switch (token.tagName) {
    case 'color':
      return {
        __container: true,
        tag: 'span',
        props: { style: { color: normalizeFactorioColor(token.argsValue) } },
        children: [],
        tagName: token.tagName
      }
    case 'font':
      return {
        __container: true,
        tag: 'span',
        props: { style: resolveFactorioFontStyle(token.argsValue) },
        children: [],
        tagName: token.tagName
      }
    case 'size':
      return {
        __container: true,
        tag: 'span',
        props: { style: { fontSize: token.argsValue } },
        children: [],
        tagName: token.tagName
      }
    case 'bold':
      return { __container: true, tag: 'strong', props: {}, children: [], tagName: token.tagName }
    case 'italic':
      return { __container: true, tag: 'em', props: {}, children: [], tagName: token.tagName }
    case 'underline':
      return { __container: true, tag: 'u', props: {}, children: [], tagName: token.tagName }
    default:
      return null
  }
}

function appendNode(target, value) {
  if (value === null || value === undefined || value === '') return
  target.push(value)
}

function renderReferenceToken(token, components) {
  if (!RENDERABLE_ICON_TAGS.has(token.tagName)) {
    return h('span', { class: 'factorio-richtext-tag-ref', title: 'Tag is not interactive in web view.' }, token.rawTag)
  }
  const inlineLabel = formatInlineReferenceLabel(token)
  if (!components.IconButton || !components.SpriteIcon) {
    return h('span', { class: 'factorio-richtext-tag-ref', title: inlineLabel }, inlineLabel)
  }

  return h(
    components.IconButton,
    {
      type: token.tagName,
      name: token.name,
      size: 16,
      clickable: true,
      showTooltip: true
    },
    {
      container: slotProps =>
        h(
          'span',
          {
            class: 'factorio-richtext-reference-inline',
            title: slotProps?.title || inlineLabel,
            'aria-label': slotProps?.['aria-label'] || inlineLabel,
            onClick: slotProps?.click
          },
          [
            h(components.SpriteIcon, {
              spriteKey: `${token.tagName}-${token.name}`,
              size: 16,
              title: inlineLabel
            }),
            h('span', { class: 'factorio-richtext-reference-label' }, inlineLabel)
          ]
        )
    }
  )
}

function renderMetaToken(token, components) {
  if (token.tagName === 'quality') {
    return h('span', { class: 'factorio-richtext-quality' }, `[quality:${token.payload}]`)
  }
  if (INLINE_META_TAGS.has(token.tagName) || token.tagName === 'space-age') {
    return h('span', { class: 'factorio-richtext-tag-ref', title: 'Tag is not interactive in web view.' }, token.rawTag)
  }
  if (token.tagName === 'space-platform') {
    if (!components.IconButton) {
      return h('span', { class: 'factorio-richtext-tag-ref' }, token.rawTag)
    }
    return h(components.IconButton, {
      type: token.tagName,
      name: String(token.payload),
      size: 18,
      clickable: false,
      showTooltip: false
    })
  }
  return h('span', { class: 'factorio-richtext-tag-ref' }, token.rawTag)
}

function renderTooltipToken(token) {
  return h(
    'span',
    {
      class: 'factorio-richtext-tooltip',
      title: token.localeKey || 'Factorio locale key tooltip'
    },
    token.text
  )
}

function renderImgToken(token, components) {
  if (!components.SpriteIcon) {
    return h('span', { class: 'factorio-richtext-tag-ref' }, token.rawTag)
  }
  return h(components.SpriteIcon, {
    spriteKey: normalizeInlineSpriteKey(token.spriteClass, token.spriteName),
    size: 16,
    fallbackText: '?',
    title: token.source
  })
}

function finalizeNodes(nodes) {
  return nodes.map(node => {
    if (typeof node === 'string') return node
    if (node?.__container) {
      return h(node.tag, node.props, finalizeNodes(node.children))
    }
    return node
  })
}

export function renderFactorioRichTextTokens(tokens, options = {}) {
  const strict = Boolean(options.strict)
  const components = {
    IconButton: options.IconButton || null,
    SpriteIcon: options.SpriteIcon || null
  }
  const roots = []
  const stack = []
  const diagnostics = []

  function addNode(node) {
    if (stack.length > 0) {
      appendNode(stack[stack.length - 1].children, node)
      return
    }
    appendNode(roots, node)
  }

  for (const token of tokens) {
    if (token.kind === 'text') {
      addNode(token.content)
      continue
    }

    if (token.kind === 'open') {
      const container = createContainerNode(token)
      if (!container) {
        addNode(token.rawTag)
        diagnostics.push(
          createDiagnostic(
            'unsupported_open_tag',
            'error',
            `Opening tag "${token.tagName}" has no renderer mapping.`,
            token.rawTag
          )
        )
        continue
      }
      addNode(container)
      stack.push(container)
      continue
    }

    if (token.kind === 'close') {
      if (stack.length === 0) {
        addNode(token.rawTag)
        diagnostics.push(
          createDiagnostic(
            'unexpected_close_tag',
            'error',
            `Closing tag "${token.tagName}" does not match any open tag.`,
            token.rawTag
          )
        )
        continue
      }

      const top = stack[stack.length - 1]
      if (top.tagName !== token.tagName) {
        addNode(token.rawTag)
        diagnostics.push(
          createDiagnostic(
            'mismatched_close_tag',
            'error',
            `Closing tag "${token.tagName}" mismatched open tag "${top.tagName}".`,
            token.rawTag
          )
        )
        continue
      }
      stack.pop()
      continue
    }

    if (token.kind === 'reference') {
      addNode(renderReferenceToken(token, components))
      continue
    }

    if (token.kind === 'img') {
      addNode(renderImgToken(token, components))
      continue
    }

    if (token.kind === 'meta') {
      addNode(renderMetaToken(token, components))
      continue
    }

    if (token.kind === 'tooltip') {
      addNode(renderTooltipToken(token))
      continue
    }

    addNode(token.rawTag || '')
    diagnostics.push(
      createDiagnostic('unknown_token_kind', 'error', `Unknown token kind "${token.kind}".`, token.rawTag || '')
    )
  }

  if (stack.length > 0) {
    for (let i = stack.length - 1; i >= 0; i--) {
      diagnostics.push(
        createDiagnostic(
          'unclosed_tag',
          'error',
          `Unclosed rich text tag "${stack[i].tagName}".`,
          `[${stack[i].tagName}]`
        )
      )
    }
  }

  if (strict) {
    for (const diagnostic of diagnostics) {
      if (diagnostic.severity === 'error') {
        console.error(`[FactorioRichText] ${diagnostic.message}`)
      } else {
        console.warn(`[FactorioRichText] ${diagnostic.message}`)
      }
    }
  }

  return { nodes: finalizeNodes(roots), diagnostics }
}
