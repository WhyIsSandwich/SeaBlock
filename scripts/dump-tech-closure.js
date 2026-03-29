#!/usr/bin/env node
/**
 * Debug helper: load processed `data.json`, print prerequisite closure + layout summary for one technology.
 *
 * Usage:
 *   node scripts/dump-tech-closure.js <path-to-data.json> <technologyName>
 *
 * Example:
 *   node scripts/dump-tech-closure.js generated/data/dev/data.json angels-ore-floatation
 */

import fs from 'fs'
import path from 'path'

import {
  collectVisiblePrerequisiteClosure,
  computeResearchMapLayout,
  effectivePrerequisites
} from '../src/utils/researchMapLayout.js'
import { preloadResearchMapHighs } from '../src/utils/researchMapHighs.js'

async function main() {
  const dataPath = process.argv[2]
  const techName = process.argv[3]
  if (!dataPath || !techName) {
    console.error('Usage: node scripts/dump-tech-closure.js <path-to-data.json> <technologyName>')
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
  const eff = effectivePrerequisites(technologies, techName)
  await preloadResearchMapHighs()
  const layout = computeResearchMapLayout(technologies, techName)

  const out = {
    name: techName,
    effectivePrerequisites: eff,
    closureSize: closure.size,
    closureNames: [...closure].sort(),
    layout: layout
      ? {
          maxRank: layout.maxRank,
          rowsTopToBottom: layout.rowsTopToBottom.map(r => ({
            layerIndex: r.layerIndex,
            names: r.names
          })),
          nodeCenters: [...layout.nodeLayouts.entries()].map(([id, nl]) => ({
            id,
            rank: nl.rank,
            centerX: Math.round(nl.centerX * 100) / 100
          }))
        }
      : null
  }
  console.log(JSON.stringify(out, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
