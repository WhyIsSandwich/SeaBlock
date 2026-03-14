#!/usr/bin/env node

/**
 * Publish generated data assets to CDN/object storage.
 * Use after process-factorio-data and productionize-spritemap-webp.
 *
 * For production:
 *   1. Run: node scripts/process-factorio-data.js --script-output PATH --output generated/data/prod/HASH [--tooltips]
 *   2. Run: node scripts/productionize-spritemap-webp.js --input generated/data/prod/HASH/spritemap.png --output generated/data/prod/HASH/spritemap.webp
 *   3. Run: node scripts/publish-generated-data.js --source generated/data/prod/HASH
 *   4. Set VITE_ASSET_DATA_BASE_URL (include hash path, e.g. https://cdn.example.com/abc123) for the site build
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_SOURCE = './generated/data/dev'

function parseArgs(argv) {
  const args = argv.slice(2)
  const options = { source: DEFAULT_SOURCE, dryRun: false }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && i + 1 < args.length) {
      options.source = args[i + 1]
      i++
    } else if (args[i] === '--dry-run') {
      options.dryRun = true
    } else if (args[i] === '--help' || args[i] === '-h') {
      options.help = true
    }
  }
  return options
}

function main() {
  const options = parseArgs(process.argv)
  if (options.help) {
    console.log(`
Publish generated data to CDN.

Usage:
  node scripts/publish-generated-data.js [--source PATH] [--dry-run]

Options:
  --source PATH   Source directory (default: ${DEFAULT_SOURCE})
  --dry-run      List files that would be published, no upload
  -h, --help     Show this help

For production, use generated/data/prod/<hash> as source.
Then set for the site build:
  VITE_ASSET_DATA_BASE_URL=https://your-cdn.example.com/<hash>
  VITE_ASSET_SPRITE_FORMAT=webp
`)
    process.exit(0)
  }

  const source = path.resolve(process.cwd(), options.source)
  if (!fs.existsSync(source)) {
    console.error(`Source not found: ${source}`)
    process.exit(1)
  }

  const files = fs.readdirSync(source)
  console.log(`Would publish ${files.length} files from ${source}`)
  files.forEach(f => console.log(`  - ${f}`))

  if (options.dryRun) {
    console.log('\nDry run complete. Configure upload target (R2/S3) to enable actual publish.')
    return
  }

  console.log('\nActual upload not yet implemented. Use upload-to-cloudflare.js or similar.')
  console.log('Set VITE_ASSET_* env vars for the production build after publishing.')
}

main()
