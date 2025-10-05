#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Factorio Data Processor (Refactored)
 *
 * APPROACH:
 * - Preserves original data-raw format with minimal, reversible transformations
 * - Outputs language-specific locale file (locale-en.json, locale-de.json, etc.)
 * - Generates deduplicated spritemap (collapses identical images)
 * - Creates type-mapping.json showing type hierarchies
 * - Uses icon collapsing logic to find implicit icons
 * - All JSON output uses compact format (no pretty printing) for speed/size
 *
 * OUTPUT FILES:
 * - data.json: Original data-raw with minimal transforms (icon paths -> spritemap refs), compact
 * - locale-{lang}.json: Language-specific localization { lang, type: {name: {n: "", d: ""}} }, compact
 * - spritemap.json + spritemap.png: Deduplicated icon atlas, compact
 * - type-mapping.json: Maps which prototypes belong to which type hierarchies, compact
 */

class FactorioDataProcessorRefactored {
  constructor(scriptOutputPath, locale = 'en') {
    this.scriptOutputPath = scriptOutputPath
    this.outputPath = './docs/public/data'
    this.locale = locale // Language code (e.g., 'en', 'de', 'fr')
    this.rawData = null
    this.localeData = {}

    // Spritemap management
    this.spritemap = {} // key -> { x, y, width, height }
    this.spritemapSources = {} // key -> source path
    this.iconHashes = {} // hash -> spritemap key (for deduplication)
    this.spritemapIndex = 0

    // Type hierarchy tracking
    this.typeHierarchy = {} // type -> array of prototype names
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
          data[localeType][name].n = displayName
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
      return crypto.createHash('md5').update(buffer).digest('hex')
    } catch (error) {
      console.warn(`Failed to hash icon file ${filePath}:`, error.message)
      return null
    }
  }

  /**
   * Find icon for a prototype using collapsing logic
   * This mimics Factoriopedia behavior where some icons are inherited
   */
  findPrototypeIcon(prototypeType, prototypeName, prototypeData) {
    // Direct paths to try
    const possiblePaths = []

    // 1. Direct type/name path
    possiblePaths.push(path.join(this.scriptOutputPath, prototypeType, `${prototypeName}.png`))

    // 2. If it's an item with entity data, try entity path
    if (prototypeData.place_result) {
      possiblePaths.push(
        path.join(this.scriptOutputPath, 'entity', `${prototypeData.place_result}.png`)
      )
    }

    // 3. If it's a recipe, try the main product
    if (prototypeType === 'recipe' && prototypeData.results) {
      const mainResult = Array.isArray(prototypeData.results) ? prototypeData.results[0] : null
      if (mainResult && mainResult.name) {
        possiblePaths.push(
          path.join(this.scriptOutputPath, mainResult.type || 'item', `${mainResult.name}.png`)
        )
      }
    }

    // 4. If it has a result field (old recipe format)
    if (prototypeType === 'recipe' && prototypeData.result) {
      possiblePaths.push(path.join(this.scriptOutputPath, 'item', `${prototypeData.result}.png`))
    }

    // Try each path
    for (const iconPath of possiblePaths) {
      if (fs.existsSync(iconPath)) {
        return iconPath
      }
    }

    return null
  }

  /**
   * Add icon to spritemap with deduplication
   * Returns spritemap reference or null
   */
  addIconToSpritemap(iconPath, spritemapKey) {
    if (!iconPath || !fs.existsSync(iconPath)) {
      return null
    }

    // Hash the icon to detect duplicates
    const hash = this.hashIconFile(iconPath)
    if (!hash) return null

    // Check if we already have this icon (by hash)
    if (this.iconHashes[hash]) {
      // Reuse existing spritemap entry
      return this.iconHashes[hash]
    }

    // New unique icon - add to spritemap
    this.spritemap[spritemapKey] = {
      x: 0, // Will be calculated during spritemap generation
      y: 0,
      width: 64,
      height: 64
    }
    this.spritemapSources[spritemapKey] = iconPath
    this.iconHashes[hash] = spritemapKey
    this.spritemapIndex++

    return spritemapKey
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

        // Add to type hierarchy tracking
        const prototypeType = prototypeData.type || categoryKey
        if (!this.typeHierarchy[prototypeType]) {
          this.typeHierarchy[prototypeType] = []
        }
        this.typeHierarchy[prototypeType].push(prototypeName)
        typeMapping[categoryKey].push(prototypeName)

        // Find and process icon
        const iconPath = this.findPrototypeIcon(categoryKey, prototypeName, prototypeData)
        if (iconPath) {
          const spritemapKey = `${categoryKey}:${prototypeName}`
          const spritemapRef = this.addIconToSpritemap(iconPath, spritemapKey)

          if (spritemapRef) {
            // Add spritemap reference (reversible transform)
            processedPrototype.__iconRef = spritemapRef
          }
        }

        processedData[categoryKey][prototypeName] = processedPrototype
      }
    }

    return { data: processedData, typeMapping }
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

    console.log(`Generating spritemap with ${iconCount} unique icons...`)

    // Calculate spritemap dimensions
    const iconsPerRow = Math.ceil(Math.sqrt(iconCount))
    const iconSize = 64
    const spritemapWidth = iconsPerRow * iconSize
    const spritemapHeight = Math.ceil(iconCount / iconsPerRow) * iconSize

    console.log(
      `Spritemap dimensions: ${spritemapWidth}x${spritemapHeight} (${iconsPerRow} icons per row)`
    )

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
    const updatedSpritemap = {}

    let iconIndex = 0
    for (const [spritemapKey, _spriteData] of Object.entries(this.spritemap)) {
      const row = Math.floor(iconIndex / iconsPerRow)
      const col = iconIndex % iconsPerRow
      const x = col * iconSize
      const y = row * iconSize

      // Update coordinates
      updatedSpritemap[spritemapKey] = {
        x,
        y,
        width: iconSize,
        height: iconSize
      }

      // Get source file
      const sourcePath = this.spritemapSources[spritemapKey]
      if (sourcePath && fs.existsSync(sourcePath)) {
        try {
          // Process icon
          // eslint-disable-next-line no-await-in-loop
          const iconBuffer = await sharp(sourcePath)
            .resize(iconSize, iconSize, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer()

          compositeOperations.push({
            input: iconBuffer,
            left: x,
            top: y
          })
        } catch (error) {
          console.warn(`Failed to process icon ${sourcePath}:`, error.message)
        }
      }

      iconIndex++
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
        iconsPerRow,
        iconSize,
        sprites: updatedSpritemap
      }
      fs.writeFileSync(spritemapFile, JSON.stringify(spritemapData))
      console.log(`✓ Written spritemap JSON: ${spritemapFile}`)

      // Report deduplication stats
      const totalIcons = this.spritemapIndex
      const uniqueIcons = Object.keys(this.iconHashes).length
      const deduped = totalIcons - uniqueIcons
      if (deduped > 0) {
        console.log(
          `✓ Deduplicated ${deduped} duplicate icons (${((deduped / totalIcons) * 100).toFixed(1)}% reduction)`
        )
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

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--script-output' && i + 1 < args.length) {
      scriptOutputPath = args[i + 1]
      i++
    } else if (args[i] === '--locale' && i + 1 < args.length) {
      locale = args[i + 1]
      i++
    }
  }

  if (!scriptOutputPath) {
    console.error('✗ Script output path is required. Use --script-output PATH')
    console.error('Usage: node process-factorio-data.js --script-output PATH [--locale LANG]')
    console.error(
      'Example: node process-factorio-data.js --script-output ./script-output --locale en'
    )
    process.exit(1)
  }

  const processor = new FactorioDataProcessorRefactored(scriptOutputPath, locale)
  processor.process()
}

export default FactorioDataProcessorRefactored
