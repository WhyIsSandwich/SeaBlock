import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  assertAllOrthogonal,
  checkColocatedEntrySpread,
  checkGutterMidYSpread,
  checkPortEntryStub,
  checkPortExitStub,
  checkSegmentsOrthogonal
} from './researchMapEdgeBehaviors.test-helpers.js'
import {
  RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX,
  computeResearchMapLayout
} from './researchMapLayout.js'
import {
  computeResearchMapEdgeSnapshot,
  verticesFromOrthogonalSvgPath
} from './researchMapHarness.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(__dirname, '__fixtures__')
const sctFixturePath = join(fixtureDir, 'research-map-sct-lab-t3.json')

describe('verticesFromOrthogonalSvgPath', () => {
  it('parses M/L-only orthogonal paths', () => {
    const d = 'M 10 20 L 10 26 L 50 26 L 50 94 L 90 94 L 90 100'
    expect(verticesFromOrthogonalSvgPath(d)).toEqual([
      [10, 20],
      [10, 26],
      [50, 26],
      [50, 94],
      [90, 94],
      [90, 100]
    ])
  })

  it('returns empty for invalid input', () => {
    expect(verticesFromOrthogonalSvgPath('')).toEqual([])
    expect(verticesFromOrthogonalSvgPath(null)).toEqual([])
  })
})

describe('computeResearchMapEdgeSnapshot (harness sample)', () => {
  it('matches routed edge geometry for a tiny closure', () => {
    const raw = JSON.parse(
      readFileSync(join(fixtureDir, 'research-map-harness-sample.json'), 'utf8')
    )
    const snap = computeResearchMapEdgeSnapshot(raw.technology, 'goal')
    expect(snap.ok).toBe(true)
    if (!snap.ok) return
    expect(snap.nodeCount).toBe(3)
    expect(snap.edgeCount).toBe(2)
    for (const e of snap.edges) {
      expect(e.meta).toBeDefined()
      expect(e.meta.bucketKey).toBe('1-0')
      expect(e.vertexCount).toBeGreaterThanOrEqual(2)
      expect(e.vertices.length).toBe(e.vertexCount)
      for (const [x, y] of e.vertices) {
        expect(Number.isFinite(x)).toBe(true)
        expect(Number.isFinite(y)).toBe(true)
      }
    }
    expect(snap).toMatchSnapshot()
  })

  it('satisfies orthogonal + stub + gutter checks using routing meta', () => {
    const raw = JSON.parse(
      readFileSync(join(fixtureDir, 'research-map-harness-sample.json'), 'utf8')
    )
    const snap = computeResearchMapEdgeSnapshot(raw.technology, 'goal')
    expect(snap.ok).toBe(true)
    if (!snap.ok) return

    assertAllOrthogonal(snap.edges)

    const bucket = snap.edges.filter(e => e.meta.bucketKey === '1-0')
    expect(checkGutterMidYSpread(bucket).ok).toBe(true)

    const layout = computeResearchMapLayout(raw.technology, 'goal')
    expect(layout).not.toBeNull()
    const intoGoal = snap.edges.filter(e => e.to === 'goal')
    const parentCx = intoGoal.map(e => layout.nodeLayouts.get(e.from).centerX)
    const colocated = Math.max(...parentCx) - Math.min(...parentCx) < 2
    expect(
      checkColocatedEntrySpread(
        intoGoal.map(e => e.meta.toX),
        { colocated }
      ).ok
    ).toBe(true)

    for (const e of snap.edges) {
      expect(checkSegmentsOrthogonal(e.vertices).ok).toBe(true)
      if (e.meta.y2 - e.meta.y1 >= 2 * RESEARCH_MAP_EDGE_PORT_STUB_MIN_PX) {
        expect(checkPortExitStub(e.vertices, e.meta, {}).ok).toBe(true)
        expect(checkPortEntryStub(e.vertices, e.meta, {}).ok).toBe(true)
      }
    }
  })
})

describe('computeResearchMapEdgeSnapshot (sct-lab-t3 fixture)', () => {
  it.skipIf(!existsSync(sctFixturePath))('regresses full edge list and vertices', () => {
    const raw = JSON.parse(readFileSync(sctFixturePath, 'utf8'))
    const snap = computeResearchMapEdgeSnapshot(raw.technology, 'sct-lab-t3')
    expect(snap.ok).toBe(true)
    if (!snap.ok) return
    expect(snap.edges.length).toBe(snap.edgeCount)
    for (const e of snap.edges) {
      expect(e.path.length).toBeGreaterThan(0)
      expect(e.vertices.length).toBeGreaterThanOrEqual(2)
      expect(e.meta).toBeDefined()
    }
    expect(snap).toMatchSnapshot()
  })
})
