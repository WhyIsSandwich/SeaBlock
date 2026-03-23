#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { execFileSync } from 'child_process'

import sharp from 'sharp'

import { useFactorioPrototypeMapping } from '../src/composables/useFactorioPrototypeMapping.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function formatInfiniteTechnologyDisplayName(prototypeName, displayName, technologyData) {
  if (!displayName) {
    return displayName
  }

  if (technologyData?.max_level !== 'infinite') {
    return displayName
  }

  const levelMatch = prototypeName?.match(/(\d+)$/)
  if (!levelMatch) {
    return displayName
  }

  if (/\s\d+\+?$/.test(displayName)) {
    return displayName
  }

  return `${displayName} ${levelMatch[1]}+`
}

/**
 * Factorio Data Processor (Refactored)
 *
 * APPROACH:
 * - Preserves original data-raw format with minimal, reversible transformations
 * - Outputs language-specific locale file (locale-en.json, locale-de.json, etc.)
 * - Generates deduplicated spritemap (collapses identical images)
 * - Uses skyline bin packing algorithm for efficient sprite atlas (icons capped at 64x64)
 * - Creates type-mapping.json showing type hierarchies
 * - Uses icon collapsing logic to find implicit icons
 * - All JSON output uses compact format (no pretty printing) for speed/size
 *
 * OUTPUT FILES:
 * - data.json: Original data-raw with minimal transforms (icon paths -> spritemap refs), compact
 * - locale-{lang}.json: Language-specific localization { lang, type: {name: {n: "", d: ""}} }, compact
 * - spritemap.json + spritemap.png: Skyline-packed, deduplicated icon atlas (max 64x64), compact
 * - type-mapping.json: Maps which prototypes belong to which type hierarchies, compact
 */

const DEFAULT_OUTPUT_PATH = './generated/data/dev'

class FactorioDataProcessorRefactored {
  constructor(scriptOutputPath, locale = 'en', outputPath = DEFAULT_OUTPUT_PATH) {
    this.scriptOutputPath = scriptOutputPath
    this.outputPath = outputPath
    this.locale = locale // Language code (e.g., 'en', 'de', 'fr')
    this.rawData = null
    this.localeData = {}
    this.localeKeyMap = {}

    // Spritemap management
    this.spritemap = {} // key -> { x, y, width, height }
    this.spritemapSources = {} // key -> source path
    this.iconHashes = {} // hash -> spritemap key (for deduplication)
    this.spritemapIndex = 0

    // Type hierarchy tracking
    this.typeHierarchy = {} // type -> array of prototype names
  }

  /**
   * Build a lookup map for raw locale keys from Factorio cfg locale files.
   * Example key: "factoriopedia-description.asteroid-collector"
   *
   * NOTE:
   * This is a fallback path kept for compatibility with current script-output dumps.
   * Ideally we should not scan game/mod locale files directly here. The preferred long-term
   * approach is for script-output JSON artifacts to already contain localized
   * `factoriopedia_description` values so this resolver can be removed.
   */
  loadLocaleKeyMap() {
    console.log(`Loading locale key map for language: ${this.locale}...`)

    const factorioRoot = path.resolve(this.scriptOutputPath, '..')
    const localeDirs = []

    const dataPath = path.join(factorioRoot, 'data')
    if (fs.existsSync(dataPath)) {
      for (const entry of fs.readdirSync(dataPath, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const localeDir = path.join(dataPath, entry.name, 'locale', this.locale)
        if (fs.existsSync(localeDir)) localeDirs.push(localeDir)
      }
    }

    const modsPath = path.join(factorioRoot, 'mods')
    const modZipFiles = []
    if (fs.existsSync(modsPath)) {
      for (const entry of fs.readdirSync(modsPath, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const localeDir = path.join(modsPath, entry.name, 'locale', this.locale)
          if (fs.existsSync(localeDir)) localeDirs.push(localeDir)
          continue
        }
        if (entry.isFile() && entry.name.endsWith('.zip')) {
          modZipFiles.push(path.join(modsPath, entry.name))
        }
      }
    }

    let parsedFiles = 0
    let parsedKeys = 0
    for (const localeDir of localeDirs.sort((a, b) => a.localeCompare(b))) {
      const cfgFiles = fs
        .readdirSync(localeDir)
        .filter(fileName => fileName.endsWith('.cfg'))
        .sort((a, b) => a.localeCompare(b))

      for (const cfgFile of cfgFiles) {
        const cfgPath = path.join(localeDir, cfgFile)
        try {
          const content = fs.readFileSync(cfgPath, 'utf8')
          parsedKeys += this.parseLocaleCfg(content)
          parsedFiles++
        } catch (error) {
          console.warn(`⚠ Failed to parse locale cfg ${cfgPath}:`, error.message)
        }
      }
    }

    for (const zipPath of modZipFiles.sort((a, b) => a.localeCompare(b))) {
      const { files, keys } = this.loadLocaleFromZip(zipPath)
      parsedFiles += files
      parsedKeys += keys
    }

    console.log(`✓ Loaded ${parsedKeys} locale keys from ${parsedFiles} cfg files`)
  }

  loadLocaleFromZip(zipPath) {
    let parsedFiles = 0
    let parsedKeys = 0
    try {
      const zipEntriesOutput = execFileSync('unzip', ['-Z1', zipPath], {
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024
      })
      const zipEntries = zipEntriesOutput.split(/\r?\n/).filter(Boolean)
      const localePathSegment = `/locale/${this.locale}/`
      const localeCfgEntries = zipEntries.filter(
        entry =>
          entry.includes(localePathSegment) &&
          entry.endsWith('.cfg') &&
          !entry.endsWith('/info.cfg') &&
          !entry.endsWith('/settings.cfg')
      )

      for (const entry of localeCfgEntries) {
        try {
          const content = execFileSync('unzip', ['-p', zipPath, entry], {
            encoding: 'utf8',
            maxBuffer: 20 * 1024 * 1024
          })
          parsedKeys += this.parseLocaleCfg(content)
          parsedFiles++
        } catch (error) {
          console.warn(`⚠ Failed to read locale cfg ${entry} from ${zipPath}:`, error.message)
        }
      }
    } catch (error) {
      console.warn(`⚠ Failed to list locale files in ${zipPath}:`, error.message)
    }

    return { files: parsedFiles, keys: parsedKeys }
  }

  parseLocaleCfg(content) {
    const lines = content.split(/\r?\n/)
    let currentSection = null
    let added = 0

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith(';') || line.startsWith('#')) continue

      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.slice(1, -1).trim()
        continue
      }

      const separatorIndex = line.indexOf('=')
      if (separatorIndex === -1 || !currentSection) continue

      const key = line.slice(0, separatorIndex).trim()
      const value = this.unescapeLocaleCfgValue(line.slice(separatorIndex + 1).trim())
      if (!key) continue

      this.localeKeyMap[`${currentSection}.${key}`] = value
      added++
    }

    return added
  }

  unescapeLocaleCfgValue(value) {
    if (!value || !value.includes('\\')) return value

    let result = ''
    let isEscaped = false

    for (const char of value) {
      if (isEscaped) {
        switch (char) {
          case 'n':
            result += '\n'
            break
          case 't':
            result += '\t'
            break
          case 'r':
            result += '\r'
            break
          case '\\':
            result += '\\'
            break
          case '=':
            result += '='
            break
          case ';':
            result += ';'
            break
          case '#':
            result += '#'
            break
          default:
            // Unknown escape sequence: preserve the escaped character.
            result += char
            break
        }
        isEscaped = false
        continue
      }

      if (char === '\\') {
        isEscaped = true
      } else {
        result += char
      }
    }

    // Preserve trailing backslash when present.
    if (isEscaped) {
      result += '\\'
    }

    return result
  }

  resolveLocalisedString(value, depth = 0) {
    if (value === null || value === undefined) return null
    if (depth > 20) return null

    if (typeof value === 'string') {
      return this.localeKeyMap[value] ?? value
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return null
      const [head, ...rest] = value

      if (head === '') {
        const parts = rest
          .map(part => this.resolveLocalisedString(part, depth + 1))
          .filter(part => part !== null && part !== undefined && part !== '')
        if (parts.length === 0) return null
        return parts.join('\n')
      }

      if (typeof head === 'string') {
        const template = this.localeKeyMap[head]
        const args = rest.map(arg => this.resolveLocalisedString(arg, depth + 1) ?? '')
        if (template) {
          let resolved = template
          args.forEach((arg, index) => {
            const placeholder = `__${index + 1}__`
            resolved = resolved.split(placeholder).join(arg)
          })
          return resolved
        }

        if (args.length === 0) return head
        return [head, ...args].filter(Boolean).join(' ')
      }

      return rest
        .map(part => this.resolveLocalisedString(part, depth + 1))
        .filter(Boolean)
        .join(' ')
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }

    return null
  }

  hasOnlyUnresolvedLocaleTokens(value) {
    if (typeof value !== 'string') return false
    const lines = value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
    if (lines.length === 0) return false
    return lines.every(line => /^[a-z0-9-]+\.[a-z0-9-]+$/i.test(line))
  }

  /**
   * Load and parse the raw data dump
   */
  loadRawData() {
    console.log('Loading raw data dump...')
    const rawDataPath = path.join(this.scriptOutputPath, 'data-raw-dump.json')

    try {
      const rawDataContent = fs.readFileSync(rawDataPath, 'utf8')
      this.rawData = JSON.parse(rawDataContent)
      console.log('✓ Raw data loaded successfully')
    } catch (error) {
      console.error('✗ Failed to load raw data:', error.message)
      throw error
    }
  }

  /**
   * Load all locale files into a unified structure
   * Dynamically scans for all *-locale.json files
   */
  loadLocaleData() {
    console.log('Loading locale data...')

    try {
      // Read all files in script output directory
      const files = fs.readdirSync(this.scriptOutputPath)

      // Filter for locale files matching *-locale.json pattern
      const localeFiles = files.filter(file => file.endsWith('-locale.json'))

      if (localeFiles.length === 0) {
        console.log('⚠ No locale files found')
        return
      }

      console.log(`Found ${localeFiles.length} locale files`)

      for (const localeFile of localeFiles) {
        const localePath = path.join(this.scriptOutputPath, localeFile)
        const localeType = localeFile.replace('-locale.json', '')

        try {
          const content = fs.readFileSync(localePath, 'utf8')
          this.localeData[localeType] = JSON.parse(content)
          console.log(`✓ Loaded ${localeFile}`)
        } catch (error) {
          console.error(`✗ Failed to load ${localeFile}:`, error.message)
        }
      }
    } catch (error) {
      console.error('✗ Failed to read locale directory:', error.message)
      throw error
    }
  }

  /**
   * Generate unified locale JSON
   * Optimized format for speed/size (inverted nesting - n/d at bottom level):
   * {
   *   "lang": "en",
   *   "recipe": {
   *     "iron-plate": { "n": "Iron plate", "d": "description..." },
   *     "copper-plate": { "n": "Copper plate" }
   *   },
   *   "item": {
   *     "iron-ore": { "n": "Iron ore", "d": "description..." }
   *   }
   * }
   * Minimizes repetition: "n"/"d" repeated per entity vs type names repeated once per type
   * Lookup: locale[type][name].n for name, locale[type][name].d for description
   */
  generateLocaleJson() {
    console.log('Generating unified locale JSON...')
    const data = { lang: this.locale }

    // Process each locale type
    for (const [localeType, localeContent] of Object.entries(this.localeData)) {
      if (!data[localeType]) data[localeType] = {}

      // Collect names
      if (localeContent.names) {
        for (const [name, displayName] of Object.entries(localeContent.names)) {
          if (!data[localeType][name]) data[localeType][name] = {}
          if (localeType === 'technology') {
            const technologyData = this.rawData?.technology?.[name]
            data[localeType][name].n = formatInfiniteTechnologyDisplayName(
              name,
              displayName,
              technologyData
            )
          } else {
            data[localeType][name].n = displayName
          }
        }
      }

      // Collect descriptions
      if (localeContent.descriptions) {
        for (const [name, description] of Object.entries(localeContent.descriptions)) {
          if (!data[localeType][name]) data[localeType][name] = {}
          data[localeType][name].d = description
        }
      }
    }

    // Count entries
    let totalEntries = 0
    let nameCount = 0
    let descCount = 0
    for (const [type, entries] of Object.entries(data)) {
      if (type === 'lang') continue
      totalEntries += Object.keys(entries).length
      for (const entry of Object.values(entries)) {
        if (entry.n) nameCount++
        if (entry.d) descCount++
      }
    }

    const typeCount = Object.keys(data).length - 1 // -1 for 'lang'
    console.log(
      `✓ Generated ${totalEntries} entries (${nameCount} names, ${descCount} descriptions) across ${typeCount} types`
    )

    return data
  }

  /**
   * Hash an icon file to detect duplicates
   */
  hashIconFile(filePath) {
    try {
      const buffer = fs.readFileSync(filePath)
      const hash = crypto.createHash('md5').update(buffer).digest('hex')

      // Debug logging for first few files
      if (this.spritemapIndex < 3) {
        console.log(`Hashing ${filePath}: ${buffer.length} bytes -> ${hash.substring(0, 8)}...`)
      }

      return hash
    } catch (error) {
      console.warn(`Failed to hash icon file ${filePath}:`, error.message)
      return null
    }
  }

  baseTypesWithIcons = [
    'achievement',
    'airborne-pollutant',
    'ammo-category',
    'asteroid-chunk',
    'container',
    'damage-type',
    'decorative',
    'entity',
    'equipment',
    'fluid',
    'item',
    'item-group',
    'quality',
    'recipe',
    'shortcut',
    'space-location',
    'technology',
    'tile',
    'virtual-signal'
  ]
  /**
   * Find icon for a prototype using collapsing logic
   * This mimics Factoriopedia behavior where some icons are inherited
   */
  findPrototypeIcon(prototypeType, prototypeName, _prototypeData) {
    // Get the mapping from the composable
    const { subtypeToBaseType } = useFactorioPrototypeMapping()

    // Determine the base type for this prototype
    const baseType = subtypeToBaseType[prototypeType]

    if (!this.baseTypesWithIcons.includes(baseType)) {
      return { iconPath: null, baseType }
    }

    // Direct paths to try
    const possiblePaths = []

    // 1. Direct base type/name path
    possiblePaths.push(path.join(this.scriptOutputPath, baseType, `${prototypeName}.png`))

    // 2. Fallback to subtype folder when icon dumps are organized by concrete prototype type.
    // This covers cases like capsule/gun-family prototypes that may not be mirrored under base folders.
    if (prototypeType && prototypeType !== baseType) {
      possiblePaths.push(path.join(this.scriptOutputPath, prototypeType, `${prototypeName}.png`))
    }

    // Try each path
    for (const iconPath of possiblePaths) {
      if (fs.existsSync(iconPath)) {
        return { iconPath, baseType }
      }
    }
    console.warn(`No icon found for ${baseType}-${prototypeName}`)

    return { iconPath: null, baseType }
  }

  /**
   * Register an icon for spritemap generation
   * This just records the icon without processing it yet
   */
  registerIcon(iconPath, spritemapKey) {
    if (!iconPath || !fs.existsSync(iconPath)) {
      return null
    }

    // Hash the icon to detect duplicates
    const hash = this.hashIconFile(iconPath)
    if (!hash) {
      console.warn(`Failed to hash icon: ${iconPath}`)
      return null
    }

    // Debug logging for first few icons
    if (this.spritemapIndex < 5) {
      console.log(`Icon ${spritemapKey}: hash=${hash.substring(0, 8)}...`)
    }

    // Check if we already have this icon (by hash)
    if (this.iconHashes[hash]) {
      // Reuse existing icon - just record the mapping
      const existingKey = this.iconHashes[hash]

      // Debug logging for duplicates
      console.log(
        `Duplicate found: ${spritemapKey} -> ${existingKey} (hash: ${hash.substring(0, 8)}...)`
      )

      // Record that this key maps to the existing icon
      this.spritemap[spritemapKey] = existingKey

      return spritemapKey
    }

    // New unique icon - record it
    this.iconHashes[hash] = spritemapKey
    this.spritemapSources[spritemapKey] = iconPath
    this.spritemapIndex++

    return spritemapKey
  }

  /**
   * Process all registered icons and create the final spritemap
   * This is where we do the actual image processing and bin packing
   */
  async processRegisteredIcons() {
    console.log('Processing registered icons...')

    // Get unique icons (only those in spritemapSources)
    const uniqueIcons = {}
    for (const [key, sourcePath] of Object.entries(this.spritemapSources)) {
      // Get actual image dimensions (capped at 64x64)
      let width = 64
      let height = 64
      try {
        // eslint-disable-next-line no-await-in-loop
        const metadata = await sharp(sourcePath).metadata()
        width = Math.min(metadata.width || 64, 64)
        height = Math.min(metadata.height || 64, 64)
      } catch (error) {
        console.warn(`Failed to read dimensions for ${sourcePath}, using 64x64`)
      }

      uniqueIcons[key] = {
        x: 0, // Will be calculated during bin packing
        y: 0,
        width,
        height
      }
    }

    // Do bin packing on unique icons only
    const {
      packed,
      width: spritemapWidth,
      height: spritemapHeight
    } = this.binPackSprites(uniqueIcons)

    // Update the spritemap with packed coordinates
    for (const [key, packedSprite] of Object.entries(packed)) {
      this.spritemap[key] = packedSprite
    }

    // For duplicate icons, copy the coordinates from their referenced icon
    for (const [key, referencedKey] of Object.entries(this.spritemap)) {
      if (typeof referencedKey === 'string' && referencedKey !== key) {
        // This is a duplicate - copy coordinates from the referenced icon
        this.spritemap[key] = { ...this.spritemap[referencedKey] }
      }
    }

    return { spritemapWidth, spritemapHeight }
  }

  /**
   * Process all prototypes and build spritemap + type hierarchy
   */
  processPrototypes() {
    console.log('Processing prototypes...')

    const processedData = {}
    const typeMapping = {}

    // Iterate through all prototype categories in data-raw
    for (const [categoryKey, categoryData] of Object.entries(this.rawData)) {
      if (typeof categoryData !== 'object' || categoryData === null) continue

      processedData[categoryKey] = {}

      // Track type hierarchy
      if (!typeMapping[categoryKey]) {
        typeMapping[categoryKey] = []
      }

      // Process each prototype in this category
      for (const [prototypeName, prototypeData] of Object.entries(categoryData)) {
        if (typeof prototypeData !== 'object' || prototypeData === null) continue

        // Clone the prototype data (shallow copy + deep copy for nested objects we'll modify)
        const processedPrototype = { ...prototypeData }

        if (processedPrototype.factoriopedia_description !== undefined) {
          const resolvedFactoriopediaDescription = this.resolveLocalisedString(
            processedPrototype.factoriopedia_description
          )
          if (
            resolvedFactoriopediaDescription !== null &&
            !this.hasOnlyUnresolvedLocaleTokens(resolvedFactoriopediaDescription)
          ) {
            processedPrototype.factoriopedia_description = resolvedFactoriopediaDescription
          } else {
            processedPrototype.factoriopedia_description = null
          }
        }

        // Add to type hierarchy tracking
        const prototypeType = prototypeData.type || categoryKey
        if (!this.typeHierarchy[prototypeType]) {
          this.typeHierarchy[prototypeType] = []
        }
        this.typeHierarchy[prototypeType].push(prototypeName)
        typeMapping[categoryKey].push(prototypeName)

        // Find and register icon for spritemap generation
        const { iconPath, baseType } = this.findPrototypeIcon(
          categoryKey,
          prototypeName,
          prototypeData
        )
        if (iconPath) {
          const spritemapKey = `${baseType}-${prototypeName}`
          this.registerIcon(iconPath, spritemapKey)
        }

        processedData[categoryKey][prototypeName] = processedPrototype
      }
    }

    // Process combined types for icons (items that are also entities, etc.)
    // Note: This only adds icons to spritemap, doesn't modify original data
    this.processCombinedTypeIcons(processedData)

    processedData._factoriopedia = {
      generatedAt: new Date().toISOString(),
      processor: 'process-factorio-data'
    }

    return { data: processedData, typeMapping }
  }

  /**
   * Process combined types for icons (items that are also entities, etc.)
   * This ensures that combined types get icons even when they don't override the icon
   */
  processCombinedTypeIcons(processedData) {
    console.log('Processing combined type icons...')

    // Get all unique keys across all categories
    const allKeys = new Set()
    for (const [_categoryKey, categoryData] of Object.entries(processedData)) {
      for (const prototypeName of Object.keys(categoryData)) {
        allKeys.add(prototypeName)
      }
    }

    // Process each key to find combined types
    for (const key of allKeys) {
      const combinedTypes = this.findCombinedTypes(key, processedData)

      if (combinedTypes.length > 1) {
        // This key exists in multiple categories - it's a combined type
        const { iconPath, baseType } = this.findCombinedTypeIcon(key, combinedTypes, processedData)

        if (iconPath) {
          // Use the base type for the spritemap key
          const spritemapKey = `${baseType}-${key}`

          // Check if we already have an icon for this key
          const existingRef = this.findExistingIconRef(key, processedData)
          if (!existingRef) {
            this.registerIcon(iconPath, spritemapKey)
          }
        }
      }
    }
  }

  /**
   * Find all categories/types that contain a given key
   */
  findCombinedTypes(key, processedData) {
    const types = []
    for (const [categoryKey, categoryData] of Object.entries(processedData)) {
      if (categoryData[key]) {
        types.push(categoryKey)
      }
    }
    return types
  }

  /**
   * Find icon for a combined type using the same hierarchy as unified objects
   * Priority: recipe > item > entity > fluid > tile
   */
  findCombinedTypeIcon(key, combinedTypes, processedData) {
    // Define priority order (same as unified objects)
    const priorityOrder = ['recipe', 'item', 'entity', 'fluid', 'tile']

    // Sort combined types by priority
    const sortedTypes = combinedTypes.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a)
      const bIndex = priorityOrder.indexOf(b)
      return aIndex - bIndex
    })

    // Try to find icon using the hierarchy
    for (const type of sortedTypes) {
      const prototypeData = processedData[type]?.[key]
      if (prototypeData) {
        const { iconPath, baseType } = this.findPrototypeIcon(type, key, prototypeData)
        if (iconPath) {
          return { iconPath, baseType }
        }
      }
    }

    return { iconPath: null, baseType: null }
  }

  /**
   * Check if we already have an icon in the spritemap for this key
   */
  findExistingIconRef(key, _processedData) {
    // Check if we already have this icon in our spritemap
    for (const [spritemapKey, _spriteData] of Object.entries(this.spritemap)) {
      if (spritemapKey.endsWith(`-${key}`)) {
        return spritemapKey
      }
    }
    return null
  }

  /**
   * Skyline bin packing algorithm
   * Better for mostly-square images - maintains a "skyline" and places rectangles optimally
   */
  binPackSprites(sprites) {
    // Sort sprites by max dimension (descending), then by area for better packing
    const sortedSprites = Object.entries(sprites).sort((a, b) => {
      const maxA = Math.max(a[1].width, a[1].height)
      const maxB = Math.max(b[1].width, b[1].height)
      if (maxA !== maxB) return maxB - maxA
      return b[1].width * b[1].height - a[1].width * a[1].height
    })

    const packed = {}
    //nearest power of two based on square root of the total area of the sprites
    const totalArea = Object.values(sprites).reduce(
      (acc, sprite) => acc + sprite.width * sprite.height,
      0
    )
    //nearest power of two
    const maxWidth = Math.pow(2, Math.ceil(Math.log2(Math.sqrt(totalArea))))
    const padding = 2 // Padding between sprites to avoid bleeding

    // Skyline: array of {x, y, width} representing the top edge
    const skyline = [{ x: 0, y: 0, width: maxWidth }]

    for (const [key, sprite] of sortedSprites) {
      const w = sprite.width + padding * 2
      const h = sprite.height + padding * 2

      // Find best position on skyline (lowest y position that fits)
      let bestIdx = -1
      let bestY = Infinity
      let bestWastedHeight = Infinity

      for (let i = 0; i < skyline.length; i++) {
        const skylineSegment = skyline[i]
        // eslint-disable-next-line prefer-destructuring
        let y = skylineSegment.y
        let wastedHeight = 0
        let widthLeft = w
        let canFit = true

        // Check if sprite fits starting at this position
        for (let j = i; j < skyline.length && widthLeft > 0; j++) {
          const checkSegment = skyline[j]
          if (checkSegment.x >= skylineSegment.x + w) break

          if (checkSegment.y > y) {
            // eslint-disable-next-line prefer-destructuring
            y = checkSegment.y
          }

          const segmentWidth = Math.min(checkSegment.width, widthLeft)
          wastedHeight += (y - checkSegment.y) * segmentWidth
          widthLeft -= segmentWidth
        }

        if (widthLeft > 0) {
          canFit = false // Doesn't fit within skyline segments
        }

        // Check if this is the best position so far
        if (canFit && (y < bestY || (y === bestY && wastedHeight < bestWastedHeight))) {
          bestIdx = i
          bestY = y
          bestWastedHeight = wastedHeight
        }
      }

      if (bestIdx === -1) {
        // Couldn't fit anywhere, place at end
        const lastSegment = skyline[skyline.length - 1]
        bestIdx = skyline.length - 1
        bestY = lastSegment.y
      }

      // Place sprite at best position
      const { x } = skyline[bestIdx]
      packed[key] = {
        x: x + padding,
        y: bestY + padding,
        width: sprite.width,
        height: sprite.height
      }

      // Update skyline
      const newSkylineSegment = { x, y: bestY + h, width: w }

      // Remove segments that are fully covered
      const updatedSkyline = []
      let segmentAdded = false

      for (let i = 0; i < skyline.length; i++) {
        const seg = skyline[i]

        // Segment is before new sprite
        if (seg.x + seg.width <= x) {
          updatedSkyline.push(seg)
        }
        // Segment is after new sprite
        else if (seg.x >= x + w) {
          if (!segmentAdded) {
            updatedSkyline.push(newSkylineSegment)
            segmentAdded = true
          }
          updatedSkyline.push(seg)
        }
        // Segment is partially covered
        else {
          if (!segmentAdded) {
            updatedSkyline.push(newSkylineSegment)
            segmentAdded = true
          }

          // Keep the uncovered part
          if (seg.x + seg.width > x + w) {
            updatedSkyline.push({
              x: x + w,
              y: seg.y,
              width: seg.x + seg.width - (x + w)
            })
          }
        }
      }

      if (!segmentAdded) {
        updatedSkyline.push(newSkylineSegment)
      }

      skyline.length = 0
      skyline.push(...updatedSkyline)

      // Merge adjacent segments with same height
      const mergedSkyline = []
      for (const seg of skyline) {
        if (
          mergedSkyline.length > 0 &&
          mergedSkyline[mergedSkyline.length - 1].y === seg.y &&
          mergedSkyline[mergedSkyline.length - 1].x +
            mergedSkyline[mergedSkyline.length - 1].width ===
            seg.x
        ) {
          mergedSkyline[mergedSkyline.length - 1].width += seg.width
        } else {
          mergedSkyline.push(seg)
        }
      }
      skyline.length = 0
      skyline.push(...mergedSkyline)
    }

    // Calculate final dimensions
    const width = Math.max(...Object.values(packed).map(s => s.x + s.width + padding), 64)
    const height = Math.max(...Object.values(packed).map(s => s.y + s.height + padding), 64)

    return { packed, width, height }
  }

  /**
   * Generate spritemap image from collected icons
   */
  async generateSpritemap() {
    const iconCount = Object.keys(this.spritemap).length
    if (iconCount === 0) {
      console.log('No icons to generate spritemap')
      return
    }

    console.log(`Generating spritemap with ${iconCount} total icons...`)

    // Process all registered icons (deduplication and bin packing)
    const { spritemapWidth, spritemapHeight } = await this.processRegisteredIcons()

    console.log(`Spritemap dimensions: ${spritemapWidth}x${spritemapHeight}`)

    // Create blank canvas
    const spritemapCanvas = sharp({
      create: {
        width: spritemapWidth,
        height: spritemapHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })

    // Prepare composite operations
    const compositeOperations = []

    // Only process unique icons (those in spritemapSources)
    for (const [spritemapKey, sourcePath] of Object.entries(this.spritemapSources)) {
      const spriteData = this.spritemap[spritemapKey]
      if (spriteData && sourcePath && fs.existsSync(sourcePath)) {
        try {
          // Process icon (resize to match packed dimensions, capped at 64x64)
          // eslint-disable-next-line no-await-in-loop
          const iconBuffer = await sharp(sourcePath)
            .resize(spriteData.width, spriteData.height, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer()

          compositeOperations.push({
            input: iconBuffer,
            left: spriteData.x,
            top: spriteData.y
          })
        } catch (error) {
          console.warn(`Failed to process icon ${sourcePath}:`, error.message)
        }
      }
    }

    // Generate spritemap image
    try {
      const spritemapBuffer = await spritemapCanvas.composite(compositeOperations).png().toBuffer()

      // Write image
      const spritemapImageFile = path.join(this.outputPath, 'spritemap.png')
      fs.writeFileSync(spritemapImageFile, spritemapBuffer)
      console.log(`✓ Generated spritemap image: ${spritemapImageFile}`)

      // Write JSON (compact format for speed/size)
      const spritemapFile = path.join(this.outputPath, 'spritemap.json')
      const spritemapData = {
        image: 'spritemap.png',
        width: spritemapWidth,
        height: spritemapHeight,
        imageSize: 64, // Standard icon size for Factorio sprites
        sprites: this.spritemap
      }
      fs.writeFileSync(spritemapFile, JSON.stringify(spritemapData))
      console.log(`✓ Written spritemap JSON: ${spritemapFile}`)

      // Report deduplication stats
      const totalIcons = this.spritemapIndex
      const uniqueIcons = Object.keys(this.iconHashes).length
      const deduped = totalIcons - uniqueIcons

      console.log(`📊 Deduplication stats:`)
      console.log(`  Total icons processed: ${totalIcons}`)
      console.log(`  Unique icons: ${uniqueIcons}`)
      console.log(`  Duplicates found: ${deduped}`)

      if (deduped > 0) {
        console.log(
          `✓ Deduplicated ${deduped} duplicate icons (${((deduped / totalIcons) * 100).toFixed(1)}% reduction)`
        )
      } else {
        console.log(`⚠ No duplicates found - all icons are unique`)
      }
    } catch (error) {
      console.error('Failed to generate spritemap:', error.message)
      throw error
    }
  }

  /**
   * Create output directory
   */
  createOutputDirectory() {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true })
      console.log(`✓ Created output directory: ${this.outputPath}`)
    }
  }

  /**
   * Main processing function
   */
  async process() {
    try {
      console.log('Starting Factorio data processing (refactored)...')

      // Load data
      this.loadRawData()
      this.loadLocaleData()
      this.loadLocaleKeyMap()

      // Process prototypes
      const { data, typeMapping } = this.processPrototypes()

      // Generate outputs
      this.createOutputDirectory()

      // Write data.json (original data-raw with minimal transforms)
      const dataFile = path.join(this.outputPath, 'data.json')
      fs.writeFileSync(dataFile, JSON.stringify(data))
      console.log(`✓ Written data.json`)

      // Write locale.json (compact format for speed/size)
      const locale = this.generateLocaleJson()
      const localeFile = path.join(this.outputPath, `locale-${this.locale}.json`)
      fs.writeFileSync(localeFile, JSON.stringify(locale))
      console.log(`✓ Written locale-${this.locale}.json`)

      // Write type-mapping.json (compact format)
      const typeMappingFile = path.join(this.outputPath, 'type-mapping.json')
      fs.writeFileSync(
        typeMappingFile,
        JSON.stringify({
          categoryMapping: typeMapping,
          typeHierarchy: this.typeHierarchy
        })
      )
      console.log(`✓ Written type-mapping.json`)

      // Generate spritemap
      await this.generateSpritemap()

      console.log('✓ Data processing completed successfully!')
    } catch (error) {
      console.error('✗ Data processing failed:', error.message)
      console.error(error.stack)
      process.exit(1)
    }
  }
}

// Run the processor if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  let scriptOutputPath = null
  let locale = 'en' // Default to English
  let outputPath = DEFAULT_OUTPUT_PATH
  let runTooltips = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--script-output' && i + 1 < args.length) {
      scriptOutputPath = args[i + 1]
      i++
    } else if (args[i] === '--locale' && i + 1 < args.length) {
      locale = args[i + 1]
      i++
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputPath = args[i + 1]
      i++
    } else if (args[i] === '--tooltips') {
      runTooltips = true
    }
  }

  if (!scriptOutputPath) {
    console.error('✗ Script output path is required. Use --script-output PATH')
    console.error(
      'Usage: node process-factorio-data.js --script-output PATH [--locale LANG] [--output PATH] [--tooltips]'
    )
    console.error(
      'Example: node process-factorio-data.js --script-output ./script-output --locale en'
    )
    console.error(`Output defaults to ${DEFAULT_OUTPUT_PATH}`)
    process.exit(1)
  }

  const processor = new FactorioDataProcessorRefactored(scriptOutputPath, locale, outputPath)
  processor.process()

  if (runTooltips) {
    const tooltipsPath = path.join(__dirname, 'generate-tooltips.js')
    try {
      execFileSync('node', [tooltipsPath, '--output', outputPath], {
        stdio: 'inherit',
        cwd: process.cwd()
      })
    } catch (err) {
      process.exit(err.status ?? 1)
    }
  }
}

export default FactorioDataProcessorRefactored
