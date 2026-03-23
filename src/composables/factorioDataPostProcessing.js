import { isHiddenFactorioPrototype } from '../utils/factorioPrototypeVisibility.js'

const processedDataCache = new WeakMap()

/**
 * Post-process factorio data with optional filtering rules.
 * Returns the original reference when no filtering is enabled.
 *
 * @param {Object} factorioData
 * @param {Object} options
 * @param {boolean} options.excludeHiddenFromFactorioData
 * @returns {Object}
 */
export function postProcessFactorioData(factorioData, options = {}) {
  if (!factorioData || !options.excludeHiddenFromFactorioData) {
    return factorioData
  }

  const cacheKey = 'excludeHiddenFromFactorioData:true'
  let cachedByOption = processedDataCache.get(factorioData)
  if (!cachedByOption) {
    cachedByOption = new Map()
    processedDataCache.set(factorioData, cachedByOption)
  }

  if (cachedByOption.has(cacheKey)) {
    return cachedByOption.get(cacheKey)
  }

  const processedData = {}
  for (const [prototypeType, prototypes] of Object.entries(factorioData)) {
    if (!prototypes || typeof prototypes !== 'object' || Array.isArray(prototypes)) {
      processedData[prototypeType] = prototypes
      continue
    }

    processedData[prototypeType] = Object.fromEntries(
      Object.entries(prototypes).filter(([_prototypeName, prototype]) => {
        return !isHiddenFactorioPrototype(prototype)
      })
    )
  }

  cachedByOption.set(cacheKey, processedData)
  return processedData
}
