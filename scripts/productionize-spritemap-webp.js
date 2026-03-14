#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

import sharp from 'sharp'

const DEFAULT_DATA_DIR = './generated/data/dev'
const DEFAULT_INPUT = `${DEFAULT_DATA_DIR}/spritemap.png`
const DEFAULT_OUTPUT = `${DEFAULT_DATA_DIR}/spritemap.webp`

function parseArgs(argv) {
  const args = argv.slice(2)
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    quality: 95
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--input' && i + 1 < args.length) {
      options.input = args[i + 1]
      i++
      continue
    }
    if (arg === '--output' && i + 1 < args.length) {
      options.output = args[i + 1]
      i++
      continue
    }
    if (arg === '--quality' && i + 1 < args.length) {
      const parsed = Number.parseInt(args[i + 1], 10)
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
        throw new Error('Invalid quality value. Use a number between 1 and 100.')
      }
      options.quality = parsed
      i++
      continue
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
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
  console.log(`  --output PATH    Output WebP path (default: ${DEFAULT_OUTPUT})`)
  console.log('  --quality N      WebP quality 1-100 (default: 95)')
  console.log('  -h, --help       Show this help text')
}

export async function generateSpritemapWebp({
  input = DEFAULT_INPUT,
  output = DEFAULT_OUTPUT,
  quality = 95
} = {}) {
  const resolvedInput = path.resolve(input)
  const resolvedOutput = path.resolve(output)

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Input PNG not found: ${resolvedInput}`)
  }

  const outputDir = path.dirname(resolvedOutput)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  await sharp(resolvedInput)
    .webp({
      quality,
      lossless: false,
      effort: 6,
      smartSubsample: true
    })
    .toFile(resolvedOutput)

  return { input: resolvedInput, output: resolvedOutput, quality }
}

async function main() {
  try {
    const options = parseArgs(process.argv)
    if (options.help) {
      printHelp()
      process.exit(0)
    }

    console.log('Generating spritemap WebP for production...')
    const result = await generateSpritemapWebp(options)
    console.log(`✓ Generated spritemap WebP: ${result.output}`)
  } catch (error) {
    console.error(`✗ Failed to generate spritemap WebP: ${error.message}`)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
