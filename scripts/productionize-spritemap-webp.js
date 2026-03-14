#!/usr/bin/env node

/**
 * Generate WebP spritemap for production delivery.
 *
 * DEPRECATED: Use convert-to-webp.js --spritemap-only instead.
 * This script is a thin wrapper that delegates to convert-to-webp.
 */

import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_DATA_DIR = './generated/data/dev'
const DEFAULT_INPUT = `${DEFAULT_DATA_DIR}/spritemap.png`

function parseArgs(argv) {
  const args = argv.slice(2)
  const options = { input: DEFAULT_INPUT, output: null, quality: 95, help: false }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      options.input = args[++i]
    } else if (args[i] === '--output' && i + 1 < args.length) {
      options.output = args[++i]
    } else if (args[i] === '--quality' && i + 1 < args.length) {
      options.quality = parseInt(args[++i], 10)
    } else if (args[i] === '--help' || args[i] === '-h') {
      options.help = true
    }
  }
  return options
}

function printHelp() {
  console.log('Generate WebP spritemap for production delivery.')
  console.log('')
  console.log('Usage:')
  console.log('  node scripts/productionize-spritemap-webp.js [options]')
  console.log('')
  console.log('Options:')
  console.log(`  --input PATH     Input PNG path (default: ${DEFAULT_INPUT})`)
  console.log('  --output PATH    Output WebP path (optional, defaults to input with .webp)')
  console.log('  --quality N      WebP quality 1-100 (default: 95)')
  console.log('  -h, --help       Show this help text')
  console.log('')
  console.log('Note: Prefer "node scripts/convert-to-webp.js --source DIR --spritemap-only"')
}

async function main() {
  const options = parseArgs(process.argv)

  if (options.help) {
    printHelp()
    process.exit(0)
  }

  const sourceDir = path.resolve(path.dirname(options.input))
  const convertScript = path.join(__dirname, 'convert-to-webp.js')

  const args = [
    convertScript,
    '--source',
    sourceDir,
    '--spritemap-only',
    '--spritemap-quality',
    String(options.quality)
  ]

  if (options.output) {
    console.warn('--output is ignored; convert-to-webp writes to <source>/spritemap.webp')
  }

  return new Promise((resolve, reject) => {
    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })

    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`convert-to-webp exited with code ${code}`))
    })
  })
}

main().catch(err => {
  console.error(`✗ Failed to generate spritemap WebP: ${err.message}`)
  process.exit(1)
})
