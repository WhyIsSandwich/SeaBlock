import { describe, expect, it } from 'vitest'

import {
  buildVisualRows,
  findSelectedGridIndex,
  getFlatGridItems,
  resolveVerticalNavigationTarget
} from '../gridNavigation.js'

describe('gridNavigation', () => {
  describe('getFlatGridItems', () => {
    it('flattens subgroup recipes preserving order', () => {
      const grouped = [
        { subgroup: 'a', recipes: [{ name: 'a1' }, { name: 'a2' }] },
        { subgroup: 'b', recipes: [{ name: 'b1' }] }
      ]

      expect(getFlatGridItems(grouped).map(item => item.name)).toEqual(['a1', 'a2', 'b1'])
    })
  })

  describe('findSelectedGridIndex', () => {
    it('finds index by name and primary type', () => {
      const items = [
        { name: 'x', __type: 'item' },
        { name: 'x', __type: 'recipe' }
      ]
      const selected = { name: 'x', __type: 'recipe' }

      const index = findSelectedGridIndex(items, selected, obj => obj.__type)
      expect(index).toBe(1)
    })
  })

  describe('resolveVerticalNavigationTarget', () => {
    it('moves in same column for uniform rows', () => {
      const rows = buildVisualRows([{ recipes: new Array(9).fill(null) }], 3)
      const result = resolveVerticalNavigationTarget({
        currentIndex: 5, // row 1, col 2 (cols=3)
        deltaRow: -1,
        rows
      })

      expect(result).toEqual({ targetIndex: 2, preferredColumn: 2 })
    })

    it('clamps to row end for shorter target row', () => {
      const rows = buildVisualRows([{ recipes: new Array(8).fill(null) }], 3)
      const result = resolveVerticalNavigationTarget({
        currentIndex: 5, // row 1, col 2
        deltaRow: 1,
        rows // last row length is 2
      })

      expect(result).toEqual({ targetIndex: 7, preferredColumn: 2 })
    })

    it('keeps preferred column when moving to longer row after clamp', () => {
      const rows = buildVisualRows([{ recipes: new Array(8).fill(null) }], 3)
      const result = resolveVerticalNavigationTarget({
        currentIndex: 7, // row 2, col 1 (clamped state)
        deltaRow: -1,
        rows,
        preferredColumn: 2
      })

      expect(result).toEqual({ targetIndex: 5, preferredColumn: 2 })
    })

    it('returns null at top and bottom boundaries', () => {
      const rows = buildVisualRows([{ recipes: new Array(8).fill(null) }], 3)
      const up = resolveVerticalNavigationTarget({
        currentIndex: 1,
        deltaRow: -1,
        rows
      })
      const down = resolveVerticalNavigationTarget({
        currentIndex: 7,
        deltaRow: 1,
        rows
      })

      expect(up).toBeNull()
      expect(down).toBeNull()
    })

    it('respects subgroup row boundaries instead of packing rows across groups', () => {
      const grouped = [
        { recipes: new Array(7).fill(null) }, // rows: [0..4], [5..6]
        { recipes: new Array(4).fill(null) }  // rows: [7..10]
      ]
      const rows = buildVisualRows(grouped, 5)

      const result = resolveVerticalNavigationTarget({
        currentIndex: 1, // first row, second column
        deltaRow: 1,
        rows
      })

      // Next visual row is subgroup1 tail [5,6], so clamp to index 6.
      expect(result).toEqual({ targetIndex: 6, preferredColumn: 1 })
    })
  })
})
