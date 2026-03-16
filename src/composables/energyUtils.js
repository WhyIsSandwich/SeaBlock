/**
 * Energy utilities for parsing and formatting energy values
 * Handles Factorio energy units: kW, MW, GW, kJ, MJ, GJ
 */

/**
 * Parse energy string and extract value and unit
 * @param {string} energyString - String like "1.5MW", "0.5kJ", "2.3GW"
 * @returns {{value: number, unit: string, normalizedValue: number} | null} Parsed energy data or null if invalid
 * @example
 * parseEnergyString("1.5MW") // {value: 1.5, unit: "MW", normalizedValue: 1.5}
 * parseEnergyString("500kJ") // {value: 500, unit: "kJ", normalizedValue: 0.5}
 */
export function parseEnergyString(energyString) {
  if (!energyString || typeof energyString !== 'string') return null

  // Match number and unit (e.g., "1.5MW" -> ["1.5", "MW"])
  const match = energyString.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/)
  if (!match) return null

  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()

  // Unit multipliers to convert to MW (base unit)
  const unitMultipliers = {
    K: 1000, // Kilowatts to MW
    M: 1000000, // Megawatts (base unit)
    G: 1000000000 // Gigawatts to MW
  }

  const multiplier = unitMultipliers[unit[0]] || 1
  if (multiplier === undefined) return null

  return {
    value,
    unit,
    normalizedValue: value * multiplier
  }
}

/**
 * Format energy value to the most appropriate unit
 * @param {number} valueInMW - Value in base units
 * @param {string} unit - Unit to format to eg W, J etc
 * @param {Object} options - Formatting options
 * @param {number} options.decimals - Number of decimal places (default: 2)
 * @param {boolean} options.forceUnit - Force a specific unit ('kW', 'MW', 'GW')
 * @returns {string} Formatted energy string
 * @example
 * formatEnergyValue(0.5) // "500kW"
 * formatEnergyValue(1.5) // "1.5MW"
 * formatEnergyValue(1500) // "1.5GW"
 */
export function formatEnergyValue(normalisedValue, unit, options = {}) {
  const { decimals = 1, forceUnit, hideTrailingZeroes = false } = options

  if (typeof normalisedValue !== 'number' || isNaN(normalisedValue)) {
    return null
  }
  const unitMultipliers = {
    W: 1,
    K: 0.001,
    M: 0.000001,
    G: 0.000000001
  }
  let ret = ''
  // If a specific unit is forced, use it
  if (forceUnit) {
    const multiplier = unitMultipliers[forceUnit.toUpperCase()] || 1
    if (multiplier !== undefined) {
      const formattedValue = (normalisedValue * multiplier).toFixed(decimals)
      ret = `${formattedValue}${forceUnit}`
    }
  } else if (normalisedValue >= 1000000000) {
    // Use GW for values >= 1000000 W
    const gwValue = (normalisedValue * unitMultipliers.G).toFixed(decimals)
    ret = `${gwValue}G`
  } else if (normalisedValue >= 1000000) {
    // Use MW for values >= 1 MW
    const mwValue = (normalisedValue * unitMultipliers.M).toFixed(decimals)
    ret = `${mwValue}M`
  } else if (normalisedValue >= 1000) {
    // Use kW for values < 1 MW
    const kwValue = (normalisedValue * unitMultipliers.K).toFixed(decimals)
    ret = `${kwValue}k`
  } else {
    // Use W for values < 1 kW
    const wValue = (normalisedValue * unitMultipliers.W).toFixed(0)
    ret = `${wValue}`
  }
  if (hideTrailingZeroes) {
    ret = ret.replace(/\.?0+([kMG])?$/, '$1')
  }
  return `${ret}${unit}`
}
