import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { computeResearchMapEdgeSnapshot } from './researchMapHarness.js'
import { computeResearchMapLayout } from './researchMapLayout.js'
import {
  assertAllOrthogonal,
  assertAttachmentSpreadOnChild,
  assertGutterHorizontalSeparation,
  assertPortEntryStub,
  assertSegmentsOrthogonal,
  checkColocatedEntrySpread,
  checkGutterMidYSpread,
  checkNoDegenerateSegments,
  checkNoHorizontalBacktrackSameY,
  checkPortEntryStub,
  checkPortExitStub,
  checkSegmentsOrthogonal
} from './researchMapEdgeBehaviors.test-helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(__dirname, '__fixtures__')
const sctFixturePath = join(fixtureDir, 'research-map-sct-lab-t3.json')

describe('researchMapEdgeBehaviors helpers (unit)', () => {
  it('rejects diagonal segments', () => {
    const r = checkSegmentsOrthogonal([
      [0, 0],
      [10, 10]
    ])
    expect(r.ok).toBe(false)
  })

  it('accepts axis-aligned segments', () => {
    expect(
      checkSegmentsOrthogonal([
        [0, 0],
        [0, 10],
        [5, 10]
      ]).ok
    ).toBe(true)
  })

  it('checkColocatedEntrySpread fails when all toX equal under colocated parents', () => {
    const r = checkColocatedEntrySpread([100, 100, 100], { colocated: true })
    expect(r.ok).toBe(false)
  })

  it('checkColocatedEntrySpread passes when toX differ', () => {
    expect(checkColocatedEntrySpread([75, 100, 125], { colocated: true }).ok).toBe(true)
  })

  it('checkNoDegenerateSegments rejects duplicate consecutive points', () => {
    const r = checkNoDegenerateSegments([
      [1, 1],
      [1, 1]
    ])
    expect(r.ok).toBe(false)
  })

  it('checkNoHorizontalBacktrackSameY fails when a gutter line goes right then left', () => {
    const y = 50
    const bad = [
      [200, 10],
      [200, y],
      [215, y],
      [205, y],
      [220, y],
      [220, 80]
    ]
    expect(checkNoHorizontalBacktrackSameY(bad).ok).toBe(false)
  })

  it('checkNoHorizontalBacktrackSameY passes for monotonic horizontal runs at one y', () => {
    const y = 50
    const good = [
      [200, 10],
      [200, y],
      [205, y],
      [215, y],
      [220, y],
      [220, 80]
    ]
    expect(checkNoHorizontalBacktrackSameY(good).ok).toBe(true)
  })

  it('assertSegmentsOrthogonal throws on diagonal (negative)', () => {
    expect(() =>
      assertSegmentsOrthogonal([
        [0, 0],
        [3, 4]
      ])
    ).toThrow()
  })

  it('checkPortEntryStub fails when horizontal sits on child top y2 (flush bend regression)', () => {
    const meta = { toX: 100, y1: 20, y2: 200 }
    const badVertices = [
      [100, 20],
      [100, 100],
      [40, 200],
      [100, 200]
    ]
    expect(checkPortEntryStub(badVertices, meta, { portStubMinPx: 6 }).ok).toBe(false)
  })
})

describe('research map behaviors (harness sample)', () => {
  it('orthogonal, stubs, and gutter spread for minimal graph', () => {
    const raw = JSON.parse(
      readFileSync(join(fixtureDir, 'research-map-harness-sample.json'), 'utf8')
    )
    const snap = computeResearchMapEdgeSnapshot(raw.technology, 'goal')
    expect(snap.ok).toBe(true)
    if (!snap.ok) return

    assertAllOrthogonal(snap.edges)

    const bucket = snap.edges.filter(e => e.meta.bucketKey === '1-0')
    const spread = checkGutterMidYSpread(bucket)
    expect(spread.ok).toBe(true)

    for (const e of snap.edges) {
      const ex = checkPortExitStub(e.vertices, e.meta, {})
      expect(ex.ok, ex.reason).toBe(true)
      const en = checkPortEntryStub(e.vertices, e.meta, {})
      expect(en.ok, en.reason).toBe(true)
    }
  })
})

describe('research map behaviors (two children, one parent: exit X spread)', () => {
  it('uses distinct fromX for p→a and p→b in the same gutter bucket', () => {
    const raw = JSON.parse(
      readFileSync(join(fixtureDir, 'research-map-behavior-two-children-one-parent.json'), 'utf8')
    )
    const snap = computeResearchMapEdgeSnapshot(raw.technology, 'g')
    expect(snap.ok).toBe(true)
    if (!snap.ok) return

    assertAllOrthogonal(snap.edges)
    const fromP = snap.edges.filter(e => e.from === 'p')
    expect(fromP.length).toBe(2)
    const xs = fromP.map(e => e.meta.fromX)
    expect(new Set(xs.map(x => Math.round(x * 100) / 100)).size).toBe(2)
  })
})

describe('research map behaviors (three exits from one parent)', () => {
  it('staggered midY for p→x, p→y, p→z', () => {
    const raw = JSON.parse(
      readFileSync(join(fixtureDir, 'research-map-behavior-three-from-parent.json'), 'utf8')
    )
    const snap = computeResearchMapEdgeSnapshot(raw.technology, 't')
    expect(snap.ok).toBe(true)
    if (!snap.ok) return

    assertAllOrthogonal(snap.edges)
    const hub = snap.edges.filter(e => e.from === 'p')
    expect(hub.length).toBe(3)
    assertGutterHorizontalSeparation(hub)
  })
})

describe('research map behaviors (gutter lanes: hub → three children)', () => {
  it('keeps distinct midY lanes for three parallel edges in the same bucket', () => {
    const raw = JSON.parse(
      readFileSync(join(fixtureDir, 'research-map-behavior-gutter-lanes.json'), 'utf8')
    )
    const snap = computeResearchMapEdgeSnapshot(raw.technology, 'goal')
    expect(snap.ok).toBe(true)
    if (!snap.ok) return

    assertAllOrthogonal(snap.edges)

    const hubEdges = snap.edges.filter(e => e.from === 'hub')
    expect(hubEdges.length).toBe(3)

    const byBucket = new Map()
    for (const e of hubEdges) {
      const k = e.meta.bucketKey
      if (!byBucket.has(k)) byBucket.set(k, [])
      byBucket.get(k).push(e)
    }
    for (const group of byBucket.values()) {
      const r = checkGutterMidYSpread(group)
      expect(r.ok, r.reason).toBe(true)
    }

    for (const e of snap.edges) {
      expect(checkPortExitStub(e.vertices, e.meta, {}).ok).toBe(true)
      expect(checkPortEntryStub(e.vertices, e.meta, {}).ok).toBe(true)
    }
  })
})

describe('research map behaviors (colocated parents → goal)', () => {
  it('fans child entry X when parent centers collapse (index-based attachment)', () => {
    const raw = JSON.parse(
      readFileSync(join(fixtureDir, 'research-map-behavior-colocated-in.json'), 'utf8')
    )
    const layout = computeResearchMapLayout(raw.technology, 'goal')
    expect(layout).not.toBeNull()
    const cx = ['p0', 'p1', 'p2'].map(id => layout.nodeLayouts.get(id).centerX)
    const colocated = Math.max(...cx) - Math.min(...cx) < 2

    const snap = computeResearchMapEdgeSnapshot(raw.technology, 'goal')
    expect(snap.ok).toBe(true)
    if (!snap.ok) return

    assertAllOrthogonal(snap.edges)

    const intoGoal = snap.edges.filter(e => e.to === 'goal')
    expect(intoGoal.length).toBe(3)

    const toXs = intoGoal.map(e => e.meta.toX)
    expect(() => assertAttachmentSpreadOnChild(toXs, { colocated })).not.toThrow()
  })
})

describe('research map behaviors (sct-lab-t3 integration)', () => {
  it.skipIf(!existsSync(sctFixturePath))('orthogonal + stubs on every edge', () => {
    const raw = JSON.parse(readFileSync(sctFixturePath, 'utf8'))
    const snap = computeResearchMapEdgeSnapshot(raw.technology, 'sct-lab-t3')
    expect(snap.ok).toBe(true)
    if (!snap.ok) return

    assertAllOrthogonal(snap.edges)

    for (const e of snap.edges) {
      const g = e.meta.y2 - e.meta.y1
      if (g >= 12) {
        expect(checkPortExitStub(e.vertices, e.meta, {}).ok).toBe(true)
        expect(checkPortEntryStub(e.vertices, e.meta, {}).ok).toBe(true)
      }
    }

    const byBucket = new Map()
    for (const edge of snap.edges) {
      if (edge.meta.rankGap > 1) continue
      const k = edge.meta.bucketKey
      if (!byBucket.has(k)) byBucket.set(k, [])
      byBucket.get(k).push(edge)
    }
    for (const group of byBucket.values()) {
      if (group.length >= 2) {
        const r = checkGutterMidYSpread(group)
        expect(r.ok, r.reason).toBe(true)
      }
    }
  })
})
