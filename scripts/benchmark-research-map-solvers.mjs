#!/usr/bin/env node
/**
 * Compare Sugiyama coord step: stock d3-dag `coordSimplex` (javascript-lp-solver) vs vendored coord + HiGHS.
 * Full `layout(dag)` each sample (layering + decross + coord + tweaks); only the coord operator differs.
 *
 *   node scripts/benchmark-research-map-solvers.mjs --fixture [iterations]
 *   node scripts/benchmark-research-map-solvers.mjs [data.json] [technologyName] [iterations]
 *
 * Defaults: generated/data/dev/data.json, ftl-theory-D, 8 iterations.
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  coordSimplex,
  decrossTwoLayer,
  graphConnect,
  layeringLongestPath,
  shapeRect,
  sugiyama,
  tweakShape
} from 'd3-dag'

import {
  RESEARCH_MAP_CARD_HEIGHT,
  RESEARCH_MAP_CARD_WIDTH,
  RESEARCH_MAP_DECROSS_PASSES,
  RESEARCH_MAP_MIN_CENTER_GAP,
  RESEARCH_MAP_ROW_GAP,
  computeResearchMapLayout
} from '../src/utils/researchMapLayout.js'
import { coordSimplexWasm } from '../src/utils/researchMapCoordSimplexWasm.js'
import { preloadResearchMapHighs } from '../src/utils/researchMapHighs.js'
import { resolveResearchMapHighsSolveOptions } from '../src/utils/researchMapHighsOptions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const argv = process.argv.slice(2)
const useFixture = argv[0] === '--fixture'
let dataPath
let techName
let iterations
let warmup

if (useFixture) {
  dataPath = resolve(__dirname, '../src/utils/__fixtures__/research-map-harness-sample.json')
  techName = 'goal'
  iterations = Math.max(1, parseInt(argv[1] || '40', 10) || 40)
  warmup = 2
} else {
  dataPath = resolve(argv[0] || 'generated/data/dev/data.json')
  techName = argv[1] || 'ftl-theory-D'
  iterations = Math.max(1, parseInt(argv[2] || '8', 10) || 8)
  warmup = 2
}

if (!existsSync(dataPath)) {
  console.error(`File not found: ${dataPath}`)
  if (!useFixture) console.error('Run process-data first, or use --fixture for a tiny graph.')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(dataPath, 'utf8'))
const technologies = raw.technology
if (!technologies || typeof technologies !== 'object') {
  console.error('No `technology` table in JSON')
  process.exit(1)
}
if (!technologies[techName]) {
  console.error(`Unknown technology: ${techName}`)
  process.exit(1)
}

await preloadResearchMapHighs()

const layout = computeResearchMapLayout(technologies, techName)
if (!layout?.edges?.length) {
  console.error('computeResearchMapLayout returned no edges (empty or hidden tech).')
  process.exit(1)
}

const { edges } = layout
const nodeSizeTuple = /** @type {const} */ ([RESEARCH_MAP_CARD_WIDTH, RESEARCH_MAP_CARD_HEIGHT])
const minCenterGap = RESEARCH_MAP_MIN_CENTER_GAP
const rowGap = RESEARCH_MAP_ROW_GAP

function makeLayout(coordOp) {
  return sugiyama()
    .layering(layeringLongestPath().topDown(false))
    .decross(decrossTwoLayer().passes(RESEARCH_MAP_DECROSS_PASSES))
    .coord(coordOp)
    .nodeSize(nodeSizeTuple)
    .gap([minCenterGap, rowGap])
    .tweaks([tweakShape(nodeSizeTuple, shapeRect)])
}

function bench(coordOp) {
  const op = makeLayout(coordOp)
  for (let i = 0; i < warmup; i++) {
    const dag = graphConnect()(edges)
    op(dag)
  }
  const times = []
  for (let i = 0; i < iterations; i++) {
    const dag = graphConnect()(edges)
    const t0 = performance.now()
    op(dag)
    times.push(performance.now() - t0)
  }
  return times
}

function summarize(times) {
  const mean = times.reduce((a, b) => a + b, 0) / times.length
  const variance = times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length
  const std = Math.sqrt(variance)
  return { mean, std, min: Math.min(...times), max: Math.max(...times) }
}

const highsOpts = resolveResearchMapHighsSolveOptions({
  preset: 'large',
  userOptions: {}
})

console.log('')
console.log('Research map Sugiyama coord benchmark')
console.log('=====================================')
console.log(`data:        ${dataPath}`)
console.log(`technology:  ${techName}`)
console.log(`edges:       ${edges.length}`)
console.log(`iterations:  ${iterations} (warmup ${warmup} each)`)
console.log(`HiGHS opts:  preset large (${JSON.stringify(highsOpts)})`)
if (!useFixture && edges.length > 200) {
  console.log('(Large graph: stock coord may be very slow.)')
}
console.log('')

const tStock = bench(coordSimplex())
const tVendored = bench(coordSimplexWasm({ highsSolveOptions: highsOpts }))
const sStock = summarize(tStock)
const sVendored = summarize(tVendored)
const ratio = sStock.mean / sVendored.mean

console.log(
  `${'stock coordSimplex (d3-dag + jsLP)'.padEnd(44)} mean ${sStock.mean.toFixed(3)} ms  σ ${sStock.std.toFixed(3)}  [${sStock.min.toFixed(3)} … ${sStock.max.toFixed(3)}]`
)
console.log(
  `${'vendored coordSimplexWasm + HiGHS (large)'.padEnd(44)} mean ${sVendored.mean.toFixed(3)} ms  σ ${sVendored.std.toFixed(3)}  [${sVendored.min.toFixed(3)} … ${sVendored.max.toFixed(3)}]`
)
console.log('')
console.log(
  `Ratio (stock mean / vendored HiGHS mean): ${ratio.toFixed(3)}×  (${ratio > 1 ? 'HiGHS faster' : 'stock faster'} on average)`
)
console.log('')
console.log(
  'Note: each sample is full Sugiyama layout(dag); coord is the only differing phase.'
)
console.log('')
