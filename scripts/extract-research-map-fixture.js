#!/usr/bin/env node
/**
 * Writes a minimal `technology` JSON for one technology’s **visible prerequisite closure** so tests can import
 * it without shipping full `data.json`. Consumed by `src/utils/researchMapHarness.js` tests.
 *
 * Usage:
 *   node scripts/extract-research-map-fixture.js <path-to-data.json> <technologyName> [out.json]
 *
 * Default output: src/utils/__fixtures__/research-map-<technologyName>.json
 *
 * Example (good manual spot-check graph — medium depth, many edge types):
 *   node scripts/extract-research-map-fixture.js generated/data/dev/data.json sct-lab-t3
 */

import fs from 'fs'
import path from 'path'

import { collectVisiblePrerequisiteClosure } from '../src/utils/researchMapLayout.js'

function main() {
  const dataPath = process.argv[2]
  const techName = process.argv[3]
  const outArg = process.argv[4]
  if (!dataPath || !techName) {
    console.error(
      'Usage: node scripts/extract-research-map-fixture.js <path-to-data.json> <technologyName> [out.json]'
    )
    process.exit(1)
  }
  const abs = path.isAbsolute(dataPath) ? dataPath : path.join(process.cwd(), dataPath)
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`)
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
  const technologies = raw.technology
  if (!technologies || typeof technologies !== 'object') {
    console.error('No `technology` table in JSON')
    process.exit(1)
  }
  if (!technologies[techName]) {
    console.error(`Unknown technology: ${techName}`)
    process.exit(1)
  }

  const closure = collectVisiblePrerequisiteClosure(technologies, techName)
  const subset = {}
  for (const name of closure) {
    subset[name] = technologies[name]
  }

  const defaultOut = path.join(
    process.cwd(),
    'src',
    'utils',
    '__fixtures__',
    `research-map-${techName}.json`
  )
  const outPath = outArg ? path.resolve(process.cwd(), outArg) : defaultOut
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify({ technology: subset }, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${Object.keys(subset).length} technologies to ${outPath}`)
}

main()
