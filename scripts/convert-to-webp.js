#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

// Configuration
const DEFAULT_GRAPHICS_SOURCE = './generated/data/dev'

const CONFIG = {
  // Source directory (PNG files in */graphics/* subdirs)
  sourceDir: path.resolve(process.cwd(), DEFAULT_GRAPHICS_SOURCE),

  // WebP quality (0-100, higher = better quality, larger file)
  quality: 95,

  // Maximum parallel processes (default to CPU count, but cap at 8 for memory efficiency)
  maxConcurrency: Math.min(os.cpus().length, 8),

  // Whether to preserve original files
  preserveOriginals: true,

  // Whether to overwrite existing WebP files
  overwrite: false,

  // Progress reporting interval
  progressInterval: 100
}

class WebPConverter {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config }
    this.stats = {
      total: 0,
      processed: 0,
      skipped: 0,
      errors: 0,
      startTime: null,
      endTime: null
    }
    this.workers = []
    this.workQueue = []
  }

  async checkDependencies() {
    try {
      await execAsync('which cwebp')
      console.log('✓ cwebp found')
    } catch (error) {
      console.error('❌ cwebp not found. Please install WebP tools:')
      console.error('  Ubuntu/Debian: sudo apt-get install webp')
      console.error('  macOS: brew install webp')
      console.error('  Windows: Download from https://developers.google.com/speed/webp/download')
      process.exit(1)
    }
  }

  async findPngFiles() {
    console.log('🔍 Scanning for PNG files in */graphics/* directories...')

    const findCommand = `find "${this.config.sourceDir}" -path "*/graphics/*" -name "*.png" -type f`
    const { stdout } = await execAsync(findCommand)

    const files = stdout
      .trim()
      .split('\n')
      .filter(file => file.length > 0)
    console.log(`📁 Found ${files.length} PNG files in graphics subdirectories`)

    return files
  }

  async shouldConvertFile(pngPath) {
    const webpPath = pngPath.replace(/\.png$/i, '.webp')

    // Check if WebP already exists
    if (!this.config.overwrite && fs.existsSync(webpPath)) {
      return false
    }

    // Check if PNG file is readable
    try {
      await fs.promises.access(pngPath, fs.constants.R_OK)
      return true
    } catch (error) {
      return false
    }
  }

  async convertFile(pngPath) {
    const webpPath = pngPath.replace(/\.png$/i, '.webp')
    const tempWebpPath = `${webpPath  }.tmp`

    try {
      // Create output directory if it doesn't exist
      const outputDir = path.dirname(webpPath)
      await fs.promises.mkdir(outputDir, { recursive: true })

      // Convert PNG to WebP using external process
      const command = `cwebp -q ${this.config.quality} -m 6 "${pngPath}" -o "${tempWebpPath}"`
      await execAsync(command)

      // Move temp file to final location
      await fs.promises.rename(tempWebpPath, webpPath)

      // Optionally remove original PNG
      if (!this.config.preserveOriginals) {
        await fs.promises.unlink(pngPath)
      }

      return { success: true, pngPath, webpPath }
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.promises.unlink(tempWebpPath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      return { success: false, pngPath, error: error.message }
    }
  }

  async worker(workerId) {
    console.log(`🔧 Worker ${workerId} started`)

    while (true) {
      const pngPath = this.workQueue.shift()

      if (!pngPath) {
        // No more work available
        break
      }

      try {
        const shouldConvert = await this.shouldConvertFile(pngPath)

        if (!shouldConvert) {
          this.stats.skipped++
          continue
        }

        const result = await this.convertFile(pngPath)

        if (result.success) {
          this.stats.processed++
        } else {
          this.stats.errors++
          console.error(`❌ Worker ${workerId} failed to convert ${pngPath}: ${result.error}`)
        }

        // Report progress
        if (
          (this.stats.processed + this.stats.skipped + this.stats.errors) %
            this.config.progressInterval ===
          0
        ) {
          this.reportProgress()
        }
      } catch (error) {
        this.stats.errors++
        console.error(`❌ Worker ${workerId} error processing ${pngPath}:`, error.message)
      }
    }

    console.log(`🔧 Worker ${workerId} finished`)
  }

  async dispatchWorkers(files) {
    console.log(`🚀 Dispatching ${files.length} files to ${this.config.maxConcurrency} workers...`)

    // Add all files to work queue
    this.workQueue = [...files]

    // Start heartbeat timer for periodic progress updates
    const heartbeatInterval = setInterval(() => {
      this.reportProgress()
    }, 10000) // Report every 10 seconds

    // Start workers
    const workerPromises = []
    for (let i = 0; i < this.config.maxConcurrency; i++) {
      workerPromises.push(this.worker(i + 1))
    }

    // Wait for all workers to complete
    await Promise.all(workerPromises)

    // Clear heartbeat timer
    clearInterval(heartbeatInterval)
  }

  reportProgress() {
    const elapsed = Date.now() - this.stats.startTime
    const completed = this.stats.processed + this.stats.skipped + this.stats.errors
    const rate = completed / (elapsed / 1000)
    const remaining = this.stats.total - completed
    const eta = remaining / rate
    const percentage = ((completed / this.stats.total) * 100).toFixed(1)

    console.log(
      `📊 Progress: ${this.stats.processed} converted, ${this.stats.skipped} skipped, ${this.stats.errors} errors | ${percentage}% | Rate: ${rate.toFixed(1)} files/sec | ETA: ${Math.round(eta)}s | Queue: ${this.workQueue.length} | Active: ${this.workQueue.length > 0 ? '🔄' : '✅'}`
    )
  }

  async convert() {
    console.log('🚀 Starting WebP conversion with worker-based high throughput...')
    console.log(
      `⚙️  Configuration: Quality=${this.config.quality}, Workers=${this.config.maxConcurrency}, PreserveOriginals=${this.config.preserveOriginals}`
    )

    this.stats.startTime = Date.now()

    // Check dependencies
    await this.checkDependencies()

    // Find all PNG files
    const pngFiles = await this.findPngFiles()
    this.stats.total = pngFiles.length

    if (this.stats.total === 0) {
      console.log('ℹ️  No PNG files found to convert')
      return
    }

    // Dispatch files to workers
    await this.dispatchWorkers(pngFiles)

    this.stats.endTime = Date.now()
    this.printSummary()
  }

  printSummary() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000
    const rate = this.stats.total / duration

    console.log('\n📈 Conversion Summary:')
    console.log(`   Total files: ${this.stats.total}`)
    console.log(`   Converted: ${this.stats.processed}`)
    console.log(`   Skipped: ${this.stats.skipped}`)
    console.log(`   Errors: ${this.stats.errors}`)
    console.log(`   Duration: ${duration.toFixed(1)}s`)
    console.log(`   Average rate: ${rate.toFixed(1)} files/sec`)
    console.log(`   Quality: ${this.config.quality}`)
    console.log(`   Workers: ${this.config.maxConcurrency}`)

    if (this.stats.errors > 0) {
      console.log(
        `\n⚠️  ${this.stats.errors} files failed to convert. Check the error messages above.`
      )
    }
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2)
  const config = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
      case '-s':
        config.sourceDir = path.resolve(args[++i])
        break
      case '--quality':
      case '-q':
        config.quality = parseInt(args[++i])
        break
      case '--concurrency':
      case '-c':
        config.maxConcurrency = parseInt(args[++i])
        break
      case '--no-preserve':
        config.preserveOriginals = false
        break
      case '--overwrite':
        config.overwrite = true
        break
      case '--help':
      case '-h':
        console.log(`
WebP Converter - High Throughput PNG to WebP Conversion

Usage: node convert-to-webp.js [options]

Options:
  -s, --source <path>        Source directory (default: ${DEFAULT_GRAPHICS_SOURCE})
  -q, --quality <number>     WebP quality (0-100, default: 95)
  -c, --concurrency <number> Max parallel processes (default: CPU count)
  --no-preserve              Remove original PNG files after conversion
  --overwrite                Overwrite existing WebP files
  -h, --help                 Show this help message

Examples:
  node convert-to-webp.js
  node convert-to-webp.js --source ./generated/data/dev
  node convert-to-webp.js --quality 90 --concurrency 8
  node convert-to-webp.js --no-preserve --overwrite
        `)
        process.exit(0)
        break
    }
  }

  const converter = new WebPConverter(config)
  await converter.convert()
}

// Handle uncaught errors
process.on('uncaughtException', error => {
  console.error('💥 Uncaught exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  })
}

export default WebPConverter
