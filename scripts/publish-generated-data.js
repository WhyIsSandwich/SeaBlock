#!/usr/bin/env node

/**
 * Publish generated data assets to CDN/object storage.
 * Use after process-factorio-data and convert-to-webp.
 *
 * Unified upload: walks the source folder, uploads all files. For PNGs, uploads the
 * corresponding .webp if it exists (never uploads PNG). Otherwise uploads as-is.
 *
 * For production:
 *   1. Run: node scripts/process-factorio-data.js --script-output PATH --output generated/data/prod/HASH [--tooltips]
 *   2. Run: node scripts/convert-to-webp.js --source generated/data/prod/HASH
 *   3. Run: node scripts/publish-generated-data.js --source generated/data/prod/HASH
 *   4. Set VITE_ASSET_DATA_BASE_URL (include hash path, e.g. https://cdn.example.com/abc123) for the site build
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import CloudflareUploader from './upload-to-cloudflare.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_SOURCE = './generated/data/dev'

function parseArgs(argv) {
  const args = argv.slice(2)
  const options = {
    source: DEFAULT_SOURCE,
    dryRun: false,
    prefix: null,
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && i + 1 < args.length) {
      options.source = args[++i]
    } else if (args[i] === '--prefix' && i + 1 < args.length) {
      options.prefix = args[++i]
    } else if (args[i] === '--dry-run') {
      options.dryRun = true
    } else if (args[i] === '--help' || args[i] === '-h') {
      options.help = true
    }
  }
  return options
}

/**
 * Collect files to upload: for PNGs use .webp if exists, otherwise upload as-is.
 * Returns array of absolute paths.
 */
function collectFilesToUpload(sourceDir) {
  const toUpload = new Map() // relative path -> absolute path (dedupes)

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      const rel = path.relative(sourceDir, full)

      if (e.isDirectory()) {
        walk(full)
      } else if (e.isFile()) {
        if (/\.png$/i.test(rel)) {
          const webpPath = full.replace(/\.png$/i, '.webp')
          if (fs.existsSync(webpPath)) {
            const webpRel = path.relative(sourceDir, webpPath)
            toUpload.set(webpRel, webpPath)
          }
          // Skip PNG when WebP exists; skip PNG when WebP missing (no graphics)
        } else {
          toUpload.set(rel, full)
        }
      }
    }
  }

  walk(sourceDir)
  return Array.from(toUpload.values())
}

async function main() {
  const options = parseArgs(process.argv)

  if (options.help) {
    console.log(`
Publish generated data to CDN (Cloudflare R2).

Usage:
  node scripts/publish-generated-data.js [--source PATH] [--prefix PREFIX] [--dry-run]

Options:
  --source PATH   Source directory (default: ${DEFAULT_SOURCE})
  --prefix PATH   R2 key prefix (e.g. prod/abc123/)
  --dry-run       List files that would be published, no upload
  -h, --help      Show this help

For PNGs in */graphics/*: uploads the corresponding .webp if it exists (never the PNG).
All other files are uploaded as-is.

For production, use generated/data/prod/<hash> as source and set --prefix to match.
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

  const files = collectFilesToUpload(source)
  console.log(`Found ${files.length} files to publish from ${source}`)

  if (options.dryRun) {
    files.slice(0, 50).forEach(f => console.log(`  - ${path.relative(source, f)}`))
    if (files.length > 50) {
      console.log(`  ... and ${files.length - 50} more`)
    }
    console.log('\nDry run complete. Run without --dry-run to upload.')
    return
  }

  const uploader = new CloudflareUploader({
    sourceDir: source,
    prefix: options.prefix ?? process.env.R2_PREFIX
  })

  await uploader.upload({ files })
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
