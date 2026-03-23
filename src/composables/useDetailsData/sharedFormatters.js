export function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export function formatNumber(value, decimals = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return String(value)
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(decimals).replace(/\.?0+$/, '')
}

export function formatPercent(value) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value * 100)}%`
}

export function titleFromEffectType(type) {
  return String(type)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}
