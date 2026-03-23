const DEFAULT_OFFSETS = {
  horizontal: 36,
  vertical: 24,
  boundary: 8
}

export function computeTooltipPosition(cursor, tooltipRect, viewport, offsets = DEFAULT_OFFSETS) {
  const horizontalOffset = offsets.horizontal ?? DEFAULT_OFFSETS.horizontal
  const verticalOffset = offsets.vertical ?? DEFAULT_OFFSETS.vertical
  const boundary = offsets.boundary ?? DEFAULT_OFFSETS.boundary

  let top = cursor.y + verticalOffset
  let left = cursor.x + horizontalOffset

  if (left + tooltipRect.width > viewport.width - boundary) {
    left = cursor.x - tooltipRect.width - horizontalOffset
  }

  if (top + tooltipRect.height > viewport.height - boundary) {
    top = cursor.y - tooltipRect.height - verticalOffset
  }

  if (left < boundary) left = boundary
  if (left + tooltipRect.width > viewport.width - boundary) {
    left = viewport.width - tooltipRect.width - boundary
  }
  if (top < boundary) top = boundary
  if (top + tooltipRect.height > viewport.height - boundary) {
    top = viewport.height - tooltipRect.height - boundary
  }

  return { top, left }
}
