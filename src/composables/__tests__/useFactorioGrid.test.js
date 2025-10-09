import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useFactorioGrid } from '../useFactorioGrid.js'

describe('useFactorioGrid', () => {
  let containerWidth
  let itemCount
  let options

  beforeEach(() => {
    containerWidth = ref(0)
    itemCount = ref(0)
    options = {
      containerWidth,
      itemCount,
      minButtonSize: 44,
      maxColumns: 10,
      gap: 4,
      padding: 16
    }
  })

  describe('basic functionality', () => {
    it('should return all required properties', () => {
      const grid = useFactorioGrid(options)

      expect(grid).toHaveProperty('columns')
      expect(grid).toHaveProperty('buttonSize')
      expect(grid).toHaveProperty('cellSize')
      expect(grid).toHaveProperty('maxColumnsWithMinSize')
      expect(grid).toHaveProperty('gridTemplateColumns')
      expect(grid).toHaveProperty('backgroundSize')
      expect(grid).toHaveProperty('backgroundPattern')
      expect(grid).toHaveProperty('generateGridPattern')
    })

    it('should handle zero container width with defaults', () => {
      const grid = useFactorioGrid(options)

      expect(grid.columns.value).toBe(10) // maxColumns default
      expect(grid.buttonSize.value).toBe(44) // minButtonSize default
      expect(grid.cellSize.value).toBe(48) // buttonSize + gap
    })
  })

  describe('column calculations', () => {
    it('should calculate correct columns for small container', () => {
      containerWidth.value = 200
      itemCount.value = 20

      const grid = useFactorioGrid(options)

      // With 200px width, 16px padding = 184px available
      // 44px min button + 4px gap = 48px per column
      // 184 / 48 = 3.83, so floor = 3 columns
      expect(grid.columns.value).toBe(3)
    })

    it('should calculate correct columns for medium container', () => {
      containerWidth.value = 500
      itemCount.value = 20

      const grid = useFactorioGrid(options)

      // With 500px width, 16px padding = 484px available
      // 484 / 48 = 10.08, so floor = 10 columns (capped at maxColumns)
      expect(grid.columns.value).toBe(10)
    })

    it('should respect item count limit', () => {
      containerWidth.value = 1000
      itemCount.value = 5

      const grid = useFactorioGrid(options)

      // Should not exceed item count
      expect(grid.columns.value).toBe(5)
    })

    it('should have at least 1 column', () => {
      containerWidth.value = 50
      itemCount.value = 0

      const grid = useFactorioGrid(options)

      expect(grid.columns.value).toBe(1)
    })
  })

  describe('button size calculations', () => {
    it('should calculate button size for small container', () => {
      containerWidth.value = 200
      itemCount.value = 3

      const grid = useFactorioGrid(options)

      // 200px - 16px padding = 184px available
      // 3 columns with 2 gaps (4px each) = 8px total gap
      // (184 - 8) / 3 = 58.67, floor = 58px
      expect(grid.buttonSize.value).toBe(58)
    })

    it('should calculate button size for large container', () => {
      containerWidth.value = 1000
      itemCount.value = 10

      const grid = useFactorioGrid(options)

      // 1000px - 16px padding = 984px available
      // 10 columns with 9 gaps (4px each) = 36px total gap
      // (984 - 36) / 10 = 94.8, floor = 94px
      expect(grid.buttonSize.value).toBe(94)
    })

    it('should handle single column', () => {
      containerWidth.value = 100
      itemCount.value = 1

      const grid = useFactorioGrid(options)

      // 100px - 16px padding = 84px available
      // 1 column, no gaps
      // 84 / 1 = 84px
      expect(grid.buttonSize.value).toBe(84)
    })
  })

  describe('cell size calculations', () => {
    it('should calculate cell size correctly', () => {
      containerWidth.value = 200
      itemCount.value = 3

      const grid = useFactorioGrid(options)

      // cellSize = buttonSize + gap
      expect(grid.cellSize.value).toBe(grid.buttonSize.value + 4)
    })
  })

  describe('CSS properties', () => {
    it('should generate correct grid template columns', () => {
      containerWidth.value = 200
      itemCount.value = 3

      const grid = useFactorioGrid(options)

      expect(grid.gridTemplateColumns.value).toBe(`repeat(3, ${grid.buttonSize.value}px)`)
    })

    it('should generate correct background size', () => {
      containerWidth.value = 200
      itemCount.value = 3

      const grid = useFactorioGrid(options)

      expect(grid.backgroundSize.value).toBe(`${grid.cellSize.value}px ${grid.cellSize.value}px`)
    })

    it('should generate background pattern', () => {
      const grid = useFactorioGrid(options)

      expect(grid.backgroundPattern.value).toContain('data:image/svg+xml;base64,')
      expect(grid.backgroundPattern.value).toContain('url(')
    })
  })

  describe('custom options', () => {
    it('should respect custom minButtonSize', () => {
      const customOptions = {
        ...options,
        minButtonSize: 60
      }

      containerWidth.value = 200
      itemCount.value = 20

      const grid = useFactorioGrid(customOptions)

      // With 60px min button + 4px gap = 64px per column
      // 184px available / 64px = 2.875, so floor = 2 columns
      expect(grid.columns.value).toBe(2)
    })

    it('should respect custom maxColumns', () => {
      const customOptions = {
        ...options,
        maxColumns: 5
      }

      containerWidth.value = 1000
      itemCount.value = 20

      const grid = useFactorioGrid(customOptions)

      expect(grid.columns.value).toBe(5)
    })

    it('should respect custom gap', () => {
      const customOptions = {
        ...options,
        gap: 8
      }

      containerWidth.value = 200
      itemCount.value = 3

      const grid = useFactorioGrid(customOptions)

      // 200px - 16px padding = 184px available
      // 3 columns with 2 gaps (8px each) = 16px total gap
      // (184 - 16) / 3 = 56px button size
      expect(grid.buttonSize.value).toBe(56)
      expect(grid.cellSize.value).toBe(64) // 56 + 8
    })

    it('should respect custom padding', () => {
      const customOptions = {
        ...options,
        padding: 32
      }

      containerWidth.value = 200
      itemCount.value = 3

      const grid = useFactorioGrid(customOptions)

      // 200px - 32px padding = 168px available
      // 3 columns with 2 gaps (4px each) = 8px total gap
      // (168 - 8) / 3 = 53.33, floor = 53px
      expect(grid.buttonSize.value).toBe(53)
    })

    it('should use custom filterId in background pattern', () => {
      const customOptions = {
        ...options,
        filterId: '-custom'
      }

      const grid = useFactorioGrid(customOptions)

      // Decode base64 to check SVG content
      const base64Data = grid.backgroundPattern.value
        .replace('url(data:image/svg+xml;base64,', '')
        .replace(')', '')
      const svgContent = atob(base64Data)

      expect(svgContent).toContain('blur-custom')
      expect(svgContent).toContain('shadow-custom')
    })
  })

  describe('edge cases', () => {
    it('should handle very small container', () => {
      containerWidth.value = 50
      itemCount.value = 1

      const grid = useFactorioGrid(options)

      // Should still have at least 1 column
      expect(grid.columns.value).toBe(1)
      expect(grid.buttonSize.value).toBeGreaterThan(0)
    })

    it('should handle zero item count', () => {
      containerWidth.value = 500
      itemCount.value = 0

      const grid = useFactorioGrid(options)

      // Should still calculate based on container width
      expect(grid.columns.value).toBeGreaterThan(0)
    })

    it('should handle negative container width', () => {
      containerWidth.value = -100
      itemCount.value = 5

      const grid = useFactorioGrid(options)

      // Should fall back to defaults for negative width
      expect(grid.columns.value).toBe(10)
      expect(grid.buttonSize.value).toBe(44)
    })
  })

  describe('generateGridPattern utility', () => {
    it('should generate valid SVG pattern', () => {
      const grid = useFactorioGrid(options)
      const pattern = grid.generateGridPattern(50, '-test')

      expect(pattern).toContain('data:image/svg+xml;base64,')

      // Decode base64 to check SVG content
      const base64Data = pattern.replace('url(data:image/svg+xml;base64,', '').replace(')', '')
      const svgContent = atob(base64Data)

      expect(svgContent).toContain('blur-test')
      expect(svgContent).toContain('shadow-test')
    })

    it('should handle different cell sizes', () => {
      const grid = useFactorioGrid(options)
      const pattern1 = grid.generateGridPattern(30, '')
      const pattern2 = grid.generateGridPattern(60, '')

      expect(pattern1).not.toBe(pattern2)

      // Decode base64 to check SVG content
      const base64Data1 = pattern1.replace('url(data:image/svg+xml;base64,', '').replace(')', '')
      const base64Data2 = pattern2.replace('url(data:image/svg+xml;base64,', '').replace(')', '')
      const svgContent1 = atob(base64Data1)
      const svgContent2 = atob(base64Data2)

      expect(svgContent1).toContain('width="30"')
      expect(svgContent2).toContain('width="60"')
    })
  })

  describe('reactivity', () => {
    it('should update when container width changes', () => {
      const grid = useFactorioGrid(options)

      const initialColumns = grid.columns.value
      const initialButtonSize = grid.buttonSize.value

      containerWidth.value = 300

      expect(grid.columns.value).not.toBe(initialColumns)
      expect(grid.buttonSize.value).not.toBe(initialButtonSize)
    })

    it('should update when item count changes', () => {
      containerWidth.value = 1000

      const grid = useFactorioGrid(options)

      itemCount.value = 5
      const columnsWith5Items = grid.columns.value

      itemCount.value = 15
      const columnsWith15Items = grid.columns.value

      expect(columnsWith5Items).toBe(5)
      expect(columnsWith15Items).toBe(10) // Capped at maxColumns
    })
  })
})
