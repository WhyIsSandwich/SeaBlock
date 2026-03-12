const processedDataCache = new WeakMap()

function shouldExcludeFromFactorioData(prototype) {
  return Boolean(
    prototype?.hidden || prototype?.hidden_in_factoriopedia || prototype?.hidden_from_factorio
  )
}

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

  const excludedPrototypeNames = new Set()
  for (const prototypes of Object.values(factorioData)) {
    if (!prototypes || typeof prototypes !== 'object' || Array.isArray(prototypes)) {
      continue
    }

    for (const [prototypeName, prototype] of Object.entries(prototypes)) {
      if (shouldExcludeFromFactorioData(prototype)) {
        excludedPrototypeNames.add(prototypeName)
      }
    }
  }

  const processedData = {}
  for (const [prototypeType, prototypes] of Object.entries(factorioData)) {
    if (!prototypes || typeof prototypes !== 'object' || Array.isArray(prototypes)) {
      processedData[prototypeType] = prototypes
      continue
    }

    processedData[prototypeType] = Object.fromEntries(
      Object.entries(prototypes).filter(
        ([prototypeName, prototype]) =>
          !excludedPrototypeNames.has(prototypeName) && !shouldExcludeFromFactorioData(prototype)
      )
    )
  }

  cachedByOption.set(cacheKey, processedData)
  return processedData
}
