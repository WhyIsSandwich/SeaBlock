#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { useDetailsData } from '../src/composables/useDetailsData.js'
import { useFactorioPrototypeMapping } from '../src/composables/useFactorioPrototypeMapping.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Tooltip Generator
 *
 * Generates en-tooltips.json for all possible prototypes using the new useDetailsProvider system.
 * This script processes all prototypes and generates structured tooltip data that can be used
 * by the frontend components.
 */

class TooltipGenerator {
  constructor() {
    this.outputPath = './docs/public/data'
    this.rawData = null
    this.localeData = null
    this.tooltips = {}
    this.processedCount = 0
    this.errorCount = 0

    // Initialize the details data system
    this.detailsData = useDetailsData()
  }

  /**
   * Load raw data from data.json
   */
  loadRawData() {
    console.log('Loading raw data...')
    const dataPath = path.join(this.outputPath, 'data.json')

    try {
      const dataContent = fs.readFileSync(dataPath, 'utf8')
      this.rawData = JSON.parse(dataContent)
      console.log('✓ Raw data loaded successfully')
    } catch (error) {
      console.error('✗ Failed to load raw data:', error.message)
      throw error
    }
  }

  /**
   * Load locale data
   */
  loadLocaleData() {
    console.log('Loading locale data...')
    const localePath = path.join(this.outputPath, 'locale-en.json')

    try {
      const localeContent = fs.readFileSync(localePath, 'utf8')
      this.localeData = JSON.parse(localeContent)
      console.log('✓ Locale data loaded successfully')
    } catch (error) {
      console.error('✗ Failed to load locale data:', error.message)
      throw error
    }
  }

  /**
   * Create unified object for a prototype
   */
  createUnifiedObject(prototypeType, prototypeName, prototypeData) {
    // Get locale data for this prototype
    const typeLocale = this.localeData[prototypeType] || {}
    const prototypeLocale = typeLocale[prototypeName] || {}

    // Create the unified object structure
    const unifiedObject = {
      types: [prototypeType],
      [prototypeType]: prototypeData,
      displayName: prototypeLocale.n || prototypeName,
      description: prototypeLocale.d || ''
    }

    // Add additional data for entities that are also items
    if (prototypeType === 'entity' && this.localeData.item?.[prototypeName]) {
      const itemLocale = this.localeData.item[prototypeName]
      unifiedObject.item = {
        displayName: itemLocale.n,
        description: itemLocale.d
      }
    }

    return unifiedObject
  }

  /**
   * Generate tooltip data for a single prototype
   */
  generateTooltipForPrototype(prototypeType, prototypeName, prototypeData) {
    try {
      // Validate prototype data
      if (!prototypeData || typeof prototypeData !== 'object') {
        console.warn(`⚠ Skipping ${prototypeType}:${prototypeName} - invalid data`)
        return null
      }

      // Create unified object
      const unifiedObject = this.createUnifiedObject(prototypeType, prototypeName, prototypeData)

      // Validate unified object
      if (!unifiedObject || !unifiedObject.types) {
        console.warn(
          `⚠ Skipping ${prototypeType}:${prototypeName} - failed to create unified object`
        )
        return null
      }

      // Generate details data for tooltip
      const tooltipData = this.detailsData.getDetailsData(
        [prototypeType],
        unifiedObject,
        true, // isTooltip = true
        this.rawData
      )

      // Validate tooltip data
      if (!tooltipData) {
        console.warn(`⚠ Skipping ${prototypeType}:${prototypeName} - no tooltip data generated`)
        return null
      }

      // Store the tooltip data
      if (!this.tooltips[prototypeType]) {
        this.tooltips[prototypeType] = {}
      }

      this.tooltips[prototypeType][prototypeName] = tooltipData
      this.processedCount++

      return tooltipData
    } catch (error) {
      console.error(`✗ Error processing ${prototypeType}:${prototypeName}:`, error.message)
      this.errorCount++
      return null
    }
  }

  /**
   * Process all prototypes and generate tooltips
   */
  processAllPrototypes() {
    console.log('Processing all prototypes...')

    if (!this.rawData || !this.localeData) {
      throw new Error('Raw data and locale data must be loaded first')
    }

    // Get prototype mapping to understand type hierarchy
    const { subtypeToBaseType } = useFactorioPrototypeMapping('en')

    // Process each prototype type
    for (const [prototypeType, prototypes] of Object.entries(this.rawData)) {
      console.log(`Processing ${prototypeType} prototypes...`)

      if (typeof prototypes !== 'object' || prototypes === null) {
        console.log(`  Skipping ${prototypeType} (not an object)`)
        continue
      }

      let typeCount = 0
      for (const [prototypeName, prototypeData] of Object.entries(prototypes)) {
        if (typeof prototypeData !== 'object' || prototypeData === null) {
          continue
        }

        this.generateTooltipForPrototype(prototypeType, prototypeName, prototypeData)
        typeCount++
      }

      console.log(`  ✓ Processed ${typeCount} ${prototypeType} prototypes`)
    }
  }

  /**
   * Clean up tooltip data by nulling empty arrays and filtering empty tooltips
   */
  cleanTooltipData() {
    console.log('Cleaning tooltip data...')

    let emptyCount = 0
    let totalCount = 0
    let cleanedCount = 0

    for (const [type, prototypes] of Object.entries(this.tooltips)) {
      for (const [prototypeName, tooltipData] of Object.entries(prototypes)) {
        totalCount++

        // Remove empty arrays entirely
        if (tooltipData.statistics && tooltipData.statistics.length === 0) {
          delete tooltipData.statistics
          cleanedCount++
        }
        if (tooltipData.sections && tooltipData.sections.length === 0) {
          delete tooltipData.sections
          cleanedCount++
        }
        if (tooltipData.tooltipExtras && tooltipData.tooltipExtras.length === 0) {
          delete tooltipData.tooltipExtras
          cleanedCount++
        }

        // Check if tooltip is empty (no meaningful content)
        const isEmpty =
          !tooltipData.title ||
          tooltipData.title === prototypeName ||
          (!tooltipData.statistics && !tooltipData.sections && !tooltipData.tooltipExtras)

        if (isEmpty) {
          delete this.tooltips[type][prototypeName]
          emptyCount++
        }
      }

      // Remove empty type objects
      if (Object.keys(this.tooltips[type]).length === 0) {
        delete this.tooltips[type]
      }
    }

    console.log(
      `  Cleaned ${cleanedCount} empty arrays, filtered out ${emptyCount} empty tooltips (${totalCount - emptyCount} remaining)`
    )
  }

  /**
   * Write tooltips to file
   */
  writeTooltipsFile() {
    console.log('Writing tooltips file...')

    const tooltipsPath = path.join(this.outputPath, 'en-tooltips.json')

    try {
      // Clean up tooltip data first
      this.cleanTooltipData()

      // Create the final tooltips structure
      const tooltipsData = {
        language: 'en',
        generated: new Date().toISOString(),
        tooltips: this.tooltips,
        stats: {
          totalPrototypes: this.processedCount,
          errors: this.errorCount,
          types: Object.keys(this.tooltips).length
        }
      }

      // Write in compact format to save space
      fs.writeFileSync(tooltipsPath, JSON.stringify(tooltipsData))
      console.log(`✓ Written en-tooltips.json`)
      console.log(`  Total prototypes: ${this.processedCount}`)
      console.log(`  Errors: ${this.errorCount}`)
      console.log(`  Types: ${Object.keys(this.tooltips).length}`)
    } catch (error) {
      console.error('✗ Failed to write tooltips file:', error.message)
      throw error
    }
  }

  /**
   * Create output directory if it doesn't exist
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
      console.log('Starting tooltip generation...')

      // Create output directory
      this.createOutputDirectory()

      // Load data
      this.loadRawData()
      this.loadLocaleData()

      // Process all prototypes
      this.processAllPrototypes()

      // Write tooltips file
      this.writeTooltipsFile()

      console.log('✓ Tooltip generation completed successfully!')
    } catch (error) {
      console.error('✗ Tooltip generation failed:', error.message)
      console.error(error.stack)
      process.exit(1)
    }
  }
}

// Run the generator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new TooltipGenerator()
  generator.process()
}

export { TooltipGenerator }
