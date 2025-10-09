/**
 * Pure JavaScript function for Factorio-style grid calculations
 * Provides responsive grid layout with minimum button sizes and proper spacing
 */
export function useFactorioGrid(options = {}) {
  const {
    containerWidth = 0,
    minButtonSize = 44,
    maxColumns = 10,
    gap = 4,
    padding = 16,
    filterId = ''
  } = options

  // Calculate maximum columns that fit with minimum button size
  const getMaxColumnsWithMinSize = () => {
    if (containerWidth <= 0) return maxColumns
    const availableWidth = containerWidth - padding
    return Math.floor((availableWidth + gap) / (minButtonSize + gap))
  }

  // Calculate optimal number of columns
  const getColumns = () => {
    if (containerWidth <= 0) return maxColumns
    // Don't limit columns by item count - allow more columns than items
    // This prevents huge buttons when there are few items
    const optimalColumns = Math.min(getMaxColumnsWithMinSize(), maxColumns)
    return Math.max(optimalColumns, 1) // At least 1 column
  }

  // Calculate button size to fit exactly in available width
  const getButtonSize = () => {
    if (containerWidth <= 0) return minButtonSize
    const availableWidth = containerWidth - padding
    const totalGapWidth = (getColumns() - 1) * gap
    const buttonWidth = (availableWidth - totalGapWidth) / getColumns()
    return Math.floor(buttonWidth) // Round down to ensure buttons fit
  }

  // Calculate grid cell size (button + gap) for background alignment
  const getCellSize = () => {
    return getButtonSize() + gap
  }

  // Generate SVG pattern for grid background
  const generateGridPattern = (cellSize, filterId = '') => {
    return `url(data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="${cellSize}" height="${cellSize}">
  <defs>
    <filter id="blur${filterId}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.5"/>
    </filter>
    <filter id="shadow${filterId}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.3"/>
    </filter>
  </defs>
  
  <!-- Main grid cell background -->
  <rect x="0" y="0" width="${cellSize}" height="${cellSize}" fill="#1f1f1f"/>
  
  <!-- Inner debossed square (75% of cell size) -->
  <g transform="translate(${cellSize * 0.125}, ${cellSize * 0.125})">
    <!-- Drop shadow behind the square -->
    <rect x="1" y="1" width="${cellSize * 0.75}" height="${cellSize * 0.75}" fill="rgba(0,0,0,0.4)" filter="url(#shadow${filterId})"/>
    
    <!-- Main square background -->
    <rect x="0" y="0" width="${cellSize * 0.75}" height="${cellSize * 0.75}" fill="rgba(255,255,255,0.02)"/>
    
    <!-- Top highlight -->
    <rect x="0" y="0" width="${cellSize * 0.75}" height="2" fill="rgba(255,255,255,0.18)" filter="url(#blur${filterId})"/>
    <!-- Left highlight -->
    <rect x="0" y="0" width="2" height="${cellSize * 0.75}" fill="rgba(255,255,255,0.18)" filter="url(#blur${filterId})"/>
    
    <!-- Bottom shadow -->
    <rect x="0" y="${cellSize * 0.75 - 2}" width="${cellSize * 0.75}" height="2" fill="rgba(0,0,0,0.35)" filter="url(#shadow${filterId})"/>
    <!-- Right shadow -->
    <rect x="${cellSize * 0.75 - 2}" y="0" width="2" height="${cellSize * 0.75}" fill="rgba(0,0,0,0.35)" filter="url(#shadow${filterId})"/>
  </g>
</svg>`)})`
  }

  // Generate background pattern
  const getBackgroundPattern = () => {
    return generateGridPattern(getCellSize(), filterId)
  }

  // CSS grid template columns
  const getGridTemplateColumns = () => {
    return `repeat(${getColumns()}, ${getButtonSize()}px)`
  }

  // CSS background size
  const getBackgroundSize = () => {
    return `${getCellSize()}px ${getCellSize()}px`
  }

  // Return functions that calculate values on demand
  return {
    // Core calculations
    columns: getColumns(),
    buttonSize: getButtonSize(),
    cellSize: getCellSize(),
    maxColumnsWithMinSize: getMaxColumnsWithMinSize(),

    // CSS values
    gridTemplateColumns: getGridTemplateColumns(),
    backgroundSize: getBackgroundSize(),
    backgroundPattern: getBackgroundPattern(),

    // Complete grid container styles
    containerStyles: {
      display: 'grid',
      gridTemplateColumns: getGridTemplateColumns(),
      gap: `${gap}px`,
      justifyContent: 'start',
      alignContent: 'start'
    },

    // Complete subgroup styles
    subgroupStyles: {
      display: 'grid',
      gridTemplateColumns: 'subgrid',
      gridColumn: '1 / -1',
      columnGap: 'inherit',
      rowGap: 'inherit',
      backgroundImage: getBackgroundPattern(),
      backgroundSize: getBackgroundSize(),
      backgroundRepeat: 'repeat',
      backgroundAttachment: 'local'
    },

    // Complete grid item styles
    itemStyles: {
      width: `${getButtonSize()}px`,
      height: `${getButtonSize()}px`,
      minWidth: `${getButtonSize()}px`,
      minHeight: `${getButtonSize()}px`,
      maxWidth: `${getButtonSize()}px`,
      maxHeight: `${getButtonSize()}px`,
      flexShrink: '0'
    },

    // Utilities
    generateGridPattern
  }
}
