export function getFlatGridItems(groupedRecipes) {
  const allItems = []
  for (const subgroup of groupedRecipes || []) {
    allItems.push(...(subgroup?.recipes || []))
  }
  return allItems
}

export function findSelectedGridIndex(allItems, selectedItem, getPrimaryType) {
  if (!selectedItem || !Array.isArray(allItems) || allItems.length === 0) return -1
  return allItems.findIndex(item => {
    return (
      item?.name === selectedItem.name &&
      getPrimaryType(item) === getPrimaryType(selectedItem)
    )
  })
}

export function resolveVerticalNavigationTarget({
  currentIndex,
  deltaRow,
  rows,
  preferredColumn = null
}) {
  if (currentIndex < 0 || deltaRow === 0 || !Array.isArray(rows) || rows.length === 0) return null

  let currentRow = -1
  let currentCol = -1
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const colIndex = rows[rowIndex].indexOf(currentIndex)
    if (colIndex !== -1) {
      currentRow = rowIndex
      currentCol = colIndex
      break
    }
  }
  if (currentRow === -1) return null

  const anchorCol = Number.isInteger(preferredColumn) && preferredColumn >= 0
    ? preferredColumn
    : currentCol

  const targetRow = currentRow + deltaRow
  if (targetRow < 0 || targetRow >= rows.length) return null

  const targetRowCells = rows[targetRow]
  const targetRowLength = targetRowCells.length
  if (targetRowLength <= 0) return null

  const targetCol = Math.min(anchorCol, targetRowLength - 1)

  return {
    targetIndex: targetRowCells[targetCol],
    preferredColumn: anchorCol
  }
}

export function buildVisualRows(groupedRecipes, columns) {
  const cols = Math.max(1, columns || 1)
  const rows = []
  let flatOffset = 0

  for (const subgroup of groupedRecipes || []) {
    const recipes = subgroup?.recipes || []
    for (let i = 0; i < recipes.length; i += cols) {
      const row = []
      const rowEnd = Math.min(i + cols, recipes.length)
      for (let j = i; j < rowEnd; j++) {
        row.push(flatOffset + j)
      }
      rows.push(row)
    }
    flatOffset += recipes.length
  }

  return rows
}
