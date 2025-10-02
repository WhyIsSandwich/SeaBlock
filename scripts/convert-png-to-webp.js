#!/usr/bin/env node

/**
 * PNG to WebP Converter
 *
 * Converts all PNG files from animations2 folder to WebP format
 * with high-quality lossy compression and saves to animations folder.
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import os from 'os'

class PNGToWebPConverter {
  constructor(
    inputDir = './docs/public/data/animations2',
    outputDir = './docs/public/data/animations'
  ) {
    this.inputDir = inputDir
    this.outputDir = outputDir
    this.maxWorkers = Math.min(os.cpus().length, 8) // Use up to 8 cores
    this.stats = {
      filesProcessed: 0,
      filesSkipped: 0,
      totalOriginalSize: 0,
      totalOptimizedSize: 0,
      errors: []
    }
  }

  /**
   * Find all PNG files recursively
   */
  findPNGFiles(dir) {
    const pngFiles = []

    const scanDirectory = currentDir => {
      if (!fs.existsSync(currentDir)) {
        console.log(`⚠️  Directory not found: ${currentDir}`)
        return
      }

      const entries = fs.readdirSync(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        if (entry.isDirectory()) {
          scanDirectory(fullPath)
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
          pngFiles.push(fullPath)
        }
      }
    }

    scanDirectory(dir)
    return pngFiles
  }

  /**
   * Convert single PNG to WebP
   */
  async convertPNGToWebP(inputPath, outputPath) {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      // Get original file size
      const originalSize = fs.statSync(inputPath).size

      // Convert to WebP with high quality lossy compression
      await sharp(inputPath)
        .webp({
          quality: 95, // High quality (0-100)
          lossless: false, // Use lossy compression
          effort: 6, // Higher effort for better compression
          smartSubsample: true // Smart subsampling for better quality
        })
        .toFile(outputPath)

      // Get optimized file size
      const optimizedSize = fs.statSync(outputPath).size

      // Update stats
      this.stats.filesProcessed++
      this.stats.totalOriginalSize += originalSize
      this.stats.totalOptimizedSize += optimizedSize

      const savings = originalSize - optimizedSize
      const savingsPercent = ((savings / originalSize) * 100).toFixed(1)

      console.log(
        `✅ ${path.relative(this.inputDir, inputPath)} → ${path.relative(this.outputDir, outputPath)}`
      )
      console.log(
        `   📊 ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${savingsPercent}% saved)`
      )

      return true
    } catch (error) {
      console.error(`❌ Error converting ${inputPath}:`, error.message)
      this.stats.errors.push({ file: inputPath, error: error.message })
      return false
    }
  }

  /**
   * Convert all PNG files using parallel processing
   */
  async convertAllPNGFiles() {
    console.log('🔍 Scanning for PNG files...')
    const pngFiles = this.findPNGFiles(this.inputDir)

    if (pngFiles.length === 0) {
      console.log('⚠️  No PNG files found in input directory')
      return
    }

    console.log(`📁 Found ${pngFiles.length} PNG files to convert`)
    console.log(`📂 Input: ${this.inputDir}`)
    console.log(`📂 Output: ${this.outputDir}`)
    console.log(`🚀 Using ${this.maxWorkers} parallel workers`)
    console.log('')

    // Split files into chunks for parallel processing
    const chunkSize = Math.ceil(pngFiles.length / this.maxWorkers)
    const chunks = []
    for (let i = 0; i < pngFiles.length; i += chunkSize) {
      chunks.push(pngFiles.slice(i, i + chunkSize))
    }

    console.log(`📦 Split into ${chunks.length} chunks for parallel processing`)

    // Process chunks in parallel
    const workerPromises = chunks.map((chunk, chunkIndex) =>
      this.processChunk(chunk, chunkIndex, pngFiles.length)
    )

    // Wait for all workers to complete
    const results = await Promise.all(workerPromises)

    // Aggregate results
    for (const result of results) {
      this.stats.filesProcessed += result.filesProcessed
      this.stats.filesSkipped += result.filesSkipped
      this.stats.totalOriginalSize += result.totalOriginalSize
      this.stats.totalOptimizedSize += result.totalOptimizedSize
      this.stats.errors.push(...result.errors)
    }
  }

  /**
   * Process a chunk of files using a worker thread
   */
  async processChunk(files, chunkIndex, totalFiles) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), {
        workerData: {
          files,
          inputDir: this.inputDir,
          outputDir: this.outputDir,
          chunkIndex,
          totalFiles
        }
      })

      worker.on('message', result => {
        resolve(result)
        worker.terminate()
      })

      worker.on('error', error => {
        console.error(`❌ Worker ${chunkIndex} error:`, error)
        reject(error)
        worker.terminate()
      })

      worker.on('exit', code => {
        if (code !== 0) {
          console.error(`❌ Worker ${chunkIndex} exited with code ${code}`)
          reject(new Error(`Worker exited with code ${code}`))
        }
      })
    })
  }

  /**
   * Generate conversion report
   */
  generateReport() {
    const totalSavings = this.stats.totalOriginalSize - this.stats.totalOptimizedSize
    const savingsPercent = ((totalSavings / this.stats.totalOriginalSize) * 100).toFixed(1)

    console.log('\n📊 Conversion Report')
    console.log('===================')
    console.log(`Files processed: ${this.stats.filesProcessed}`)
    console.log(`Files skipped: ${this.stats.filesSkipped}`)
    console.log(`Errors: ${this.stats.errors.length}`)
    console.log('')
    console.log(
      `Original total size: ${(this.stats.totalOriginalSize / 1024 / 1024).toFixed(1)} MB`
    )
    console.log(
      `Optimized total size: ${(this.stats.totalOptimizedSize / 1024 / 1024).toFixed(1)} MB`
    )
    console.log(`Space saved: ${(totalSavings / 1024 / 1024).toFixed(1)} MB (${savingsPercent}%)`)

    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:')
      this.stats.errors.forEach(({ file, error }) => {
        console.log(`  - ${file}: ${error}`)
      })
    }
  }

  /**
   * Run the conversion process
   */
  async run() {
    console.log('🚀 Starting PNG to WebP conversion...')
    console.log(`📂 Input directory: ${this.inputDir}`)
    console.log(`📂 Output directory: ${this.outputDir}`)
    console.log('')

    // Check if input directory exists
    if (!fs.existsSync(this.inputDir)) {
      console.error(`❌ Input directory not found: ${this.inputDir}`)
      process.exit(1)
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
      console.log(`📁 Created output directory: ${this.outputDir}`)
    }

    // Convert all PNG files
    await this.convertAllPNGFiles()

    // Generate report
    this.generateReport()

    console.log('\n✅ PNG to WebP conversion complete!')
  }
}

// Worker thread code
if (isMainThread) {
  // Main thread - run the converter
  const converter = new PNGToWebPConverter()
  converter.run().catch(console.error)
} else {
  // Worker thread - process assigned files
  const { files, inputDir, outputDir, chunkIndex, totalFiles } = workerData

  const stats = {
    filesProcessed: 0,
    filesSkipped: 0,
    totalOriginalSize: 0,
    totalOptimizedSize: 0,
    errors: []
  }

  async function processFiles() {
    console.log(`🔄 Worker ${chunkIndex}: Processing ${files.length} files`)

    for (let i = 0; i < files.length; i++) {
      const inputPath = files[i]
      const relativePath = path.relative(inputDir, inputPath)
      const outputPath = path.join(outputDir, relativePath.replace(/\.png$/i, '.webp'))

      try {
        // Ensure output directory exists
        const outputDirPath = path.dirname(outputPath)
        if (!fs.existsSync(outputDirPath)) {
          fs.mkdirSync(outputDirPath, { recursive: true })
        }

        // Get original file size
        const originalSize = fs.statSync(inputPath).size

        // Convert to WebP with high quality lossy compression
        await sharp(inputPath)
          .webp({
            quality: 95, // High quality (0-100)
            lossless: false, // Use lossy compression
            effort: 6, // Higher effort for better compression
            smartSubsample: true // Smart subsampling for better quality
          })
          .toFile(outputPath)

        // Get optimized file size
        const optimizedSize = fs.statSync(outputPath).size

        // Update stats
        stats.filesProcessed++
        stats.totalOriginalSize += originalSize
        stats.totalOptimizedSize += optimizedSize

        const savings = originalSize - optimizedSize
        const savingsPercent = ((savings / originalSize) * 100).toFixed(1)

        console.log(`✅ Worker ${chunkIndex}: ${relativePath} (${savingsPercent}% saved)`)
      } catch (error) {
        console.error(`❌ Worker ${chunkIndex} error with ${inputPath}:`, error.message)
        stats.errors.push({ file: inputPath, error: error.message })
        stats.filesSkipped++
      }
    }

    console.log(`✅ Worker ${chunkIndex} completed: ${stats.filesProcessed} files processed`)
    parentPort.postMessage(stats)
  }

  processFiles().catch(error => {
    console.error(`❌ Worker ${chunkIndex} fatal error:`, error)
    parentPort.postMessage({
      ...stats,
      errors: [...stats.errors, { file: 'worker', error: error.message }]
    })
  })
}
