#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

import { useDetailsData } from '../src/composables/useDetailsData.js'
import { useFactorioPrototypeMapping } from '../src/composables/useFactorioPrototypeMapping.js'
import { useUnifiedObjects } from '../src/composables/useUnifiedObjects.js'

/**
 * Tooltip Generator
 *
 * Generates en-tooltips.json for all possible prototypes using the new useDetailsProvider system.
 * This script processes all prototypes and generates structured tooltip data that can be used
 * by the frontend components.
 */

const DEFAULT_OUTPUT_PATH = './generated/data/dev'

class TooltipGenerator {
  constructor(outputPath = DEFAULT_OUTPUT_PATH) {
    this.outputPath = path.resolve(process.cwd(), outputPath)
    this.rawData = null
    this.organizedData = null
    this.localeData = null
    this.tooltips = {}
    this.processedCount = 0
    this.errorCount = 0

    // Enhanced tracking for rule analysis
    this.ruleStats = {
      totalRules: 0,
      executedRules: 0,
      failedRules: 0,
      ruleTypes: {},
      ruleFailures: {},
      prototypeFailures: {}
    }

    // Initialize the details data system
    this.detailsData = useDetailsData()
    this.unifiedObjects = useUnifiedObjects()
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
   * Organize raw data by grouping subtypes into parent collections
   * Similar to how useFactorioData organizes data
   */
  organizeData() {
    console.log('Organizing data by grouping subtypes...')
    const { subtypeToBaseType } = useFactorioPrototypeMapping('en')

    const organizedData = {}

    // Process each prototype type in the raw data
    for (const [prototypeType, prototypes] of Object.entries(this.rawData)) {
      const baseType = subtypeToBaseType[prototypeType]

      if (!baseType) {
        console.warn(`No base type found for ${prototypeType}, using as-is`)
        // If no mapping found, use the original type
        if (!organizedData[prototypeType]) {
          organizedData[prototypeType] = {}
        }
        organizedData[prototypeType] = { ...organizedData[prototypeType], ...prototypes }
        continue
      }

      // Group under the base type
      if (!organizedData[baseType]) {
        organizedData[baseType] = {}
      }

      // Merge the prototypes into the base type collection
      organizedData[baseType] = { ...organizedData[baseType], ...prototypes }
    }

    // Log the organized data structure for debugging
    console.log('Organized data structure:')
    for (const [baseType, prototypes] of Object.entries(organizedData)) {
      console.log(`  ${baseType}: ${Object.keys(prototypes).length} prototypes`)
    }
    this.organizedData = organizedData
    console.log('✓ Data organized successfully')
  }

  /**
   * Create unified object for a prototype
   */
  createUnifiedObject(prototypeType, prototypeName, prototypeData) {
    const objects = this.unifiedObjects.createUnifiedObjectByKey(prototypeName, prototypeData)
    const runtimeEquivalent = objects.find(object => object.types.includes(prototypeType))

    if (!runtimeEquivalent) {
      const typeLocale = this.localeData[prototypeType] || {}
      const prototypeLocale = typeLocale[prototypeName] || {}
      return {
        types: [prototypeType],
        [prototypeType]: prototypeData[prototypeType][prototypeName],
        displayName: prototypeLocale.n || prototypeName,
        description: prototypeLocale.d || ''
      }
    }

    const localeByType =
      runtimeEquivalent.types
        ?.map(type => this.localeData[type]?.[prototypeName])
        .find(locale => locale) || {}

    return {
      ...runtimeEquivalent,
      displayName: runtimeEquivalent.displayName || localeByType.n || prototypeName,
      description: runtimeEquivalent.description || localeByType.d || ''
    }
  }

  /**
   * Generate tooltip data for a single prototype with detailed rule tracking
   */
  generateTooltipForPrototype(prototypeType, prototypeName, prototypeData) {
    const startTime = Date.now()
    const ruleExecutionDetails = {
      prototype: `${prototypeType}:${prototypeName}`,
      rulesExecuted: 0,
      rulesFailed: 0,
      ruleDetails: [],
      errors: []
    }

    try {
      // Validate prototype data
      if (!prototypeData || typeof prototypeData !== 'object') {
        console.warn(`⚠ Skipping ${prototypeType}:${prototypeName} - invalid data`)
        return null
      }

      // Create unified object
      const unifiedObject = this.createUnifiedObject(prototypeType, prototypeName, prototypeData)
      //console.log(unifiedObject)
      // Validate unified object
      if (!unifiedObject || !unifiedObject.types) {
        console.warn(
          `⚠ Skipping ${prototypeType}:${prototypeName} - failed to create unified object`
        )
        return null
      }

      // Track rule execution by monkey-patching the rules engine
      const originalGetDetailsData = this.detailsData.getDetailsData
      this.detailsData.getDetailsData = (types, unifiedObject, isTooltip, factorioData, options) => {
        const result = originalGetDetailsData.call(
          this.detailsData,
          types,
          unifiedObject,
          isTooltip,
          factorioData,
          options
        )

        // Analyze the result to understand what rules were applied
        if (result) {
          const statsCount = result.statistics?.length || 0
          const sectionsCount = result.sections?.length || 0
          const extrasCount = result.tooltipExtras?.length || 0

          ruleExecutionDetails.rulesExecuted = statsCount + sectionsCount + extrasCount

          // Log detailed rule execution
          if (statsCount > 0) {
            console.log(
              `  📊 ${prototypeType}:${prototypeName} - Generated ${statsCount} statistics`
            )
          }
          if (sectionsCount > 0) {
            console.log(
              `  📋 ${prototypeType}:${prototypeName} - Generated ${sectionsCount} sections`
            )
          }
          if (extrasCount > 0) {
            console.log(
              `  🔗 ${prototypeType}:${prototypeName} - Generated ${extrasCount} tooltip extras`
            )
          }
        }

        return result
      }

      // Generate details data for tooltip
      const tooltipData = this.detailsData.getDetailsData(
        [prototypeType],
        unifiedObject,
        true, // isTooltip = true
        this.organizedData,
        { excludeHiddenFromFactorioData: true }
      )

      //console.log(tooltipData)

      // Restore original method
      this.detailsData.getDetailsData = originalGetDetailsData

      // Validate tooltip data
      if (!tooltipData) {
        console.warn(`⚠ Skipping ${prototypeType}:${prototypeName} - no tooltip data generated`)
        this.ruleStats.prototypeFailures[`${prototypeType}:${prototypeName}`] =
          'No tooltip data generated'
        return null
      }

      // Check if tooltip has meaningful content
      const hasContent =
        tooltipData.statistics?.length > 0 ||
        tooltipData.sections?.length > 0 ||
        tooltipData.tooltipExtras?.length > 0

      if (!hasContent) {
        /*console.log(
          `ℹ️ ${prototypeType}:${prototypeName} - No applicable rules (expected for some prototypes)`
        )*/
        // Don't count empty tooltips as failures - they're expected for many prototypes
      }

      // Store the tooltip data
      if (!this.tooltips[prototypeType]) {
        this.tooltips[prototypeType] = {}
      }

      this.tooltips[prototypeType][prototypeName] = tooltipData
      this.processedCount++

      // Update rule statistics
      this.ruleStats.executedRules += ruleExecutionDetails.rulesExecuted
      if (!this.ruleStats.ruleTypes[prototypeType]) {
        this.ruleStats.ruleTypes[prototypeType] = { executed: 0, failed: 0 }
      }
      this.ruleStats.ruleTypes[prototypeType].executed += ruleExecutionDetails.rulesExecuted

      const processingTime = Date.now() - startTime
      if (processingTime > 100) {
        // Log slow processing
        console.log(`⏱️ ${prototypeType}:${prototypeName} took ${processingTime}ms to process`)
      }

      return tooltipData
    } catch (error) {
      console.error(`✗ Error processing ${prototypeType}:${prototypeName}:`, error.message)
      console.error(`  Stack trace:`, error.stack)
      this.errorCount++
      this.ruleStats.failedRules++
      this.ruleStats.prototypeFailures[`${prototypeType}:${prototypeName}`] = error.message
      return null
    }
  }

  /**
   * Process all prototypes and generate tooltips
   */
  processAllPrototypes() {
    console.log('Processing all prototypes...')

    if (!this.organizedData || !this.localeData) {
      throw new Error('Organized data and locale data must be loaded first')
    }

    // Process each prototype type using organized data
    for (const [prototypeType, prototypes] of Object.entries(this.organizedData)) {
      if (typeof prototypes !== 'object' || prototypes === null) {
        console.log(`  Skipping ${prototypeType} (not an object)`)
        continue
      }

      let typeCount = 0
      for (const [prototypeName, prototypeData] of Object.entries(prototypes)) {
        if (typeof prototypeData !== 'object' || prototypeData === null) {
          console.log(`  Skipping ${prototypeName} (not an object)`)
          continue
        }

        this.generateTooltipForPrototype(prototypeType, prototypeName, this.organizedData)
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

        const hasContent = Boolean(
          tooltipData.statistics || tooltipData.sections || tooltipData.tooltipExtras
        )
        const hasText = Boolean(tooltipData.title?.trim() || tooltipData.description?.trim())

        // Only filter entries that truly have no text and no generated content
        const isEmpty = !hasContent && !hasText

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
   * Write tooltips to file with enhanced statistics
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
          types: Object.keys(this.tooltips).length,
          ruleStats: this.ruleStats
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
   * Generate comprehensive rule analysis report
   */
  generateRuleAnalysisReport() {
    console.log('\n📊 Rule Analysis Report')
    console.log('======================')

    // Overall statistics
    console.log(`\n📈 Overall Statistics:`)
    console.log(`  Total prototypes processed: ${this.processedCount}`)
    console.log(`  Total errors: ${this.errorCount}`)
    console.log(`  Rules executed: ${this.ruleStats.executedRules}`)
    console.log(`  Rules failed: ${this.ruleStats.failedRules}`)

    // Rule type breakdown
    console.log(`\n📋 Rule Type Breakdown:`)
    for (const [type, stats] of Object.entries(this.ruleStats.ruleTypes)) {
      const successRate =
        stats.executed > 0
          ? (((stats.executed - stats.failed) / stats.executed) * 100).toFixed(1)
          : '0.0'
      console.log(
        `  ${type}: ${stats.executed} executed, ${stats.failed} failed (${successRate}% success)`
      )
    }

    // Prototype failures
    const failureCount = Object.keys(this.ruleStats.prototypeFailures).length
    if (failureCount > 0) {
      console.log(`\n❌ Prototype Failures (${failureCount} total):`)
      const failuresByType = {}
      for (const [prototype, error] of Object.entries(this.ruleStats.prototypeFailures)) {
        const [type] = prototype.split(':')
        if (!failuresByType[type]) failuresByType[type] = []
        failuresByType[type].push({ prototype, error })
      }

      for (const [type, failures] of Object.entries(failuresByType)) {
        console.log(`\n  ${type} failures (${failures.length}):`)
        failures.slice(0, 10).forEach(({ prototype, error }) => {
          console.log(`    ${prototype}: ${error}`)
        })
        if (failures.length > 10) {
          console.log(`    ... and ${failures.length - 10} more`)
        }
      }
    }

    // Success rate calculation
    const totalPossible = this.processedCount + this.errorCount
    const successRate =
      totalPossible > 0 ? ((this.processedCount / totalPossible) * 100).toFixed(1) : '0.0'
    console.log(`\n🎯 Overall Success Rate: ${successRate}%`)

    // Recommendations
    console.log(`\n💡 Recommendations:`)
    if (this.ruleStats.failedRules > 0) {
      console.log(
        `  - ${this.ruleStats.failedRules} rules failed - review rule conditions and data availability`
      )
    }
    if (failureCount > 0) {
      console.log(
        `  - ${failureCount} prototypes failed - check data structure and rule compatibility`
      )
    }
    if (this.ruleStats.executedRules === 0) {
      console.log(`  - No rules were executed - check rule definitions and conditions`)
    }
    if (failureCount === 0 && this.ruleStats.failedRules === 0) {
      console.log(`  - All rules executed successfully! No issues detected.`)
    }

    console.log('\n✅ Rule analysis complete!')
  }

  /**
   * Write detailed rule failure report to file
   */
  writeRuleFailureReport() {
    const reportPath = path.join(this.outputPath, 'rule-failure-report.json')

    const report = {
      generated: new Date().toISOString(),
      summary: {
        totalPrototypes: this.processedCount,
        totalErrors: this.errorCount,
        totalRulesExecuted: this.ruleStats.executedRules,
        totalRulesFailed: this.ruleStats.failedRules,
        successRate:
          this.processedCount > 0
            ? ((this.processedCount / (this.processedCount + this.errorCount)) * 100).toFixed(1)
            : '0.0'
      },
      ruleTypeStats: this.ruleStats.ruleTypes,
      prototypeFailures: this.ruleStats.prototypeFailures,
      recommendations: this.generateRecommendations()
    }

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      console.log(`\n📄 Detailed rule failure report written to: ${reportPath}`)
    } catch (error) {
      console.error('✗ Failed to write rule failure report:', error.message)
    }
  }

  /**
   * Generate actionable recommendations based on the analysis
   */
  generateRecommendations() {
    const recommendations = []

    // Analyze rule type performance
    for (const [type, stats] of Object.entries(this.ruleStats.ruleTypes)) {
      if (stats.failed > 0) {
        const failureRate = ((stats.failed / (stats.executed + stats.failed)) * 100).toFixed(1)
        if (failureRate > 50) {
          recommendations.push({
            priority: 'HIGH',
            type: 'rule_failure',
            message: `${type} rules have ${failureRate}% failure rate - review rule conditions and data structure`,
            affectedType: type,
            failureRate: parseFloat(failureRate)
          })
        }
      }
    }

    // Analyze prototype failures
    const failureCount = Object.keys(this.ruleStats.prototypeFailures).length
    if (failureCount > 0) {
      const failureRate = ((failureCount / this.processedCount) * 100).toFixed(1)
      if (failureRate > 10) {
        recommendations.push({
          priority: 'MEDIUM',
          type: 'prototype_failure',
          message: `${failureRate}% of prototypes failed - check data structure and rule compatibility`,
          failureCount,
          failureRate: parseFloat(failureRate)
        })
      }
    }

    // Note: Empty tooltips are expected and not considered failures
    // Only actual errors (validation failures, missing properties, etc.) are tracked

    return recommendations
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
  process() {
    try {
      console.log('Starting tooltip generation...')

      // Create output directory
      this.createOutputDirectory()

      // Load data
      this.loadRawData()
      this.loadLocaleData()

      // Organize data by grouping subtypes
      this.organizeData()

      // Process all prototypes
      this.processAllPrototypes()

      // Write tooltips file
      this.writeTooltipsFile()

      // Generate comprehensive rule analysis report
      this.generateRuleAnalysisReport()

      // Write detailed rule failure report
      this.writeRuleFailureReport()

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
  const args = process.argv.slice(2)
  let outputPath = DEFAULT_OUTPUT_PATH
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--output' || args[i] === '-o') && i + 1 < args.length) {
      outputPath = args[i + 1]
      break
    }
  }
  const generator = new TooltipGenerator(outputPath)

  // Check for verbose flag
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v')
  if (verbose) {
    console.log('🔍 Verbose mode enabled - detailed rule execution logging')
  }

  generator.process()
}

export { TooltipGenerator }
