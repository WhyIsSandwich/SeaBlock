import { describe, expect, it } from 'vitest'

import { zoomTransformToLayerStyle } from './useD3GraphZoom.js'

describe('zoomTransformToLayerStyle', () => {
  it('maps d3-like transform to CSS for the zoom layer', () => {
    expect(zoomTransformToLayerStyle({ x: 12, y: -4, k: 1.5 })).toEqual({
      transform: 'translate(12px, -4px) scale(1.5)',
      transformOrigin: '0 0',
      willChange: 'transform'
    })
  })
})
