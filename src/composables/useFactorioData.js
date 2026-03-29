/**
 * Composable for loading and managing Factorio data from JSON files
 * This handles all the data loading logic that was previously in Factoriopedia.vue
 * Uses singleton pattern to ensure data is shared across all components
 * Now works with simplified data structure: data.json + locale files
 *
 * Load coordination uses module scope (`loadAllDataGeneration`); do not attach mutable
 * exports to `window`.
 */

import { ref } from 'vue'
import { withBase } from 'vitepress'

import { resolveDataUrl } from '../components/assetResolver.js'
import { isHiddenFactorioPrototype } from '../utils/factorioPrototypeVisibility.js'

import { postProcessFactorioData } from './factorioDataPostProcessing.js'
import { useUnifiedObjects } from './useUnifiedObjects.js'
import { useFactorioPrototypeMapping } from './useFactorioPrototypeMapping.js'

// Singleton instance - shared across all components
let factorioDataInstance = null

/** Monotonic id so only the latest `loadAllData` run commits fetched data (avoids stale overwrites). */
let loadAllDataGeneration = 0

function createFactorioDataInstance() {
  const { createUnifiedObjectByKey, getPrimaryType } = useUnifiedObjects()
  let availabilityIndexesCache = null
  const availabilityStateCache = new Map()

  // Reactive data refs
  const rawData = ref(null)
  const localeData = ref(null)
  const organizedData = ref({
    items: {},
    recipes: {},
    technologies: {},
    fluids: {},
    buildings: {},
    tiles: {},
    groups: {},
    equipment: {}
  })

  // Loading state
  const isLoading = ref(false)
  const loadingError = ref(null)
  const currentLanguage = ref('en')

  /**
   * Fetch raw data from data.json (does not mutate refs — caller commits after generation check).
   */
  async function fetchRawDataJson() {
    const response = await fetch(resolveDataUrl('data.json', withBase))
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  /**
   * Fetch locale JSON for the specified language (does not mutate refs).
   */
  async function fetchLocaleDataJson(language = 'en') {
    const response = await fetch(resolveDataUrl(`locale-${language}.json`, withBase))
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  /**
   * Load raw data only (assigns `rawData`). Prefer `loadAllData` for coordinated loads.
   */
  async function loadRawData() {
    try {
      rawData.value = await fetchRawDataJson()
      console.log('✓ Loaded raw data')
    } catch (error) {
      console.error('Failed to load raw data:', error)
      throw error
    }
  }

  /**
   * Load locale data only (assigns `localeData`). Prefer `loadAllData` for coordinated loads.
   */
  async function loadLocaleData(language = 'en') {
    try {
      localeData.value = await fetchLocaleDataJson(language)
      currentLanguage.value = language
      console.log(`✓ Loaded locale data for language: ${language}`)
    } catch (error) {
      console.error(`Failed to load locale data for ${language}:`, error)
      throw error
    }
  }

  /**
   * Process and organize data by type using prototype mapping
   */
  function processDataByType() {
    if (!rawData.value || !localeData.value) return

    const { subtypeToBaseType } = useFactorioPrototypeMapping(currentLanguage.value)

    // Initialize organized data below added for intellisense
    // Process each prototype type (skip metadata keys like _factoriopedia)
    for (const [prototypeType, prototypes] of Object.entries(rawData.value)) {
      if (prototypeType.startsWith('_')) continue

      const baseType = subtypeToBaseType[prototypeType]

      if (!baseType) {
        console.error(`No base type found for ${prototypeType}`)
        continue
      }

      // Get locale data for this type
      const typeLocale = localeData.value[baseType] || {}

      // Process each prototype
      for (const [prototypeName, prototypeData] of Object.entries(prototypes)) {
        // Get localized name and description
        const locale = typeLocale[prototypeName] || {}
        const localizedData = {
          ...prototypeData,
          displayName: locale.n,
          description: locale.d,
          localized: true
        }

        if (!organizedData.value[baseType]) {
          organizedData.value[baseType] = {}
        }
        organizedData.value[baseType][prototypeName] = localizedData
      }
    }
    console.log('✓ Processed data by type')
    availabilityIndexesCache = null
    availabilityStateCache.clear()
  }

  /**
   * Load all data files and process them.
   * Concurrent or overlapping calls only let the newest run commit to refs (stale responses are dropped).
   */
  async function loadAllData(language = 'en') {
    const generation = ++loadAllDataGeneration
    isLoading.value = true
    loadingError.value = null

    try {
      const [rawJson, localeJson] = await Promise.all([
        fetchRawDataJson(),
        fetchLocaleDataJson(language)
      ])

      if (generation !== loadAllDataGeneration) {
        return
      }

      rawData.value = rawJson
      localeData.value = localeJson
      currentLanguage.value = language
      console.log('✓ Loaded raw data')
      console.log(`✓ Loaded locale data for language: ${language}`)

      processDataByType()
      ensureAvailabilityIndexes()

      console.log('✓ All Factorio data loaded and processed successfully')
    } catch (error) {
      if (generation === loadAllDataGeneration) {
        loadingError.value = error
        console.error('Failed to load Factorio data:', error)
      }
      throw error
    } finally {
      if (generation === loadAllDataGeneration) {
        isLoading.value = false
      }
    }
  }

  /**
   * Check if all data is loaded
   */
  function isDataLoaded() {
    return rawData.value && localeData.value && organizedData.value
  }

  /**
   * Find all recipes that produce a specific item
   */
  function findRecipesByResult(itemName) {
    if (!organizedData.value?.recipes || !itemName) return []

    const recipes = []
    for (const [_recipeName, recipeData] of Object.entries(organizedData.value?.recipes)) {
      if (recipeData.results) {
        for (const result of recipeData.results) {
          if (result.name === itemName) {
            recipes.push(recipeData)
            break
          }
        }
      }
    }
    return recipes
  }

  function getTypeCollection(baseType) {
    if (!baseType) return {}
    return (
      organizedData.value?.[baseType] ||
      organizedData.value?.[`${baseType}s`] ||
      organizedData.value?.[baseType === 'technology' ? 'technologies' : baseType] ||
      {}
    )
  }

  function getTechnologyCollection() {
    return getTypeCollection('technology')
  }

  function getRecipeCollection() {
    return getTypeCollection('recipe')
  }

  function isEnabledFlag(value) {
    if (value === false || value === 'false' || value === 0) {
      return false
    }
    return true
  }

  function toArray(value) {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }

  function addToSetMap(map, key, value) {
    if (!key || !value) return
    if (!map.has(key)) {
      map.set(key, new Set())
    }
    map.get(key).add(value)
  }

  function normalizeMinableResults(minable) {
    if (!minable) return []
    if (Array.isArray(minable.results) && minable.results.length > 0) {
      return minable.results
    }
    if (minable.result) {
      return [{ type: 'item', name: minable.result, amount: minable.count ?? 1 }]
    }
    return []
  }

  function normalizeLootResults(loot) {
    if (!Array.isArray(loot) || loot.length === 0) return []
    return loot
      .map(entry => {
        if (!entry) return null
        const name =
          (typeof entry.item === 'string' && entry.item) ||
          (typeof entry.name === 'string' && entry.name) ||
          null
        if (!name) return null
        return {
          type: entry.type === 'fluid' ? 'fluid' : 'item',
          name,
          amount: entry.count_min ?? entry.amount ?? 1
        }
      })
      .filter(Boolean)
  }

  function getPrototypeSurfaceRequirements(prototype) {
    const requirements = new Set()
    if (!prototype) return requirements
    if (typeof prototype.surface === 'string') {
      requirements.add(prototype.surface)
    }
    if (typeof prototype.space_location === 'string') {
      requirements.add(prototype.space_location)
    }
    if (Array.isArray(prototype.surface_conditions)) {
      prototype.surface_conditions.forEach(condition => {
        if (typeof condition === 'string') {
          requirements.add(condition)
        } else if (condition?.name) {
          requirements.add(condition.name)
        } else if (condition?.surface) {
          requirements.add(condition.surface)
        } else if (condition?.space_location) {
          requirements.add(condition.space_location)
        }
      })
    }
    return requirements
  }

  function ensureAvailabilityIndexes() {
    if (availabilityIndexesCache) return availabilityIndexesCache

    const technologies = getTechnologyCollection()
    const recipes = getRecipeCollection()
    const entities = getTypeCollection('entity')
    const items = getTypeCollection('item')
    const fluids = getTypeCollection('fluid')
    const tiles = getTypeCollection('tile')
    const equipment = getTypeCollection('equipment')
    const spaceLocations = getTypeCollection('space-location')

    const visibleTechnologies = Object.fromEntries(
      Object.entries(technologies || {}).filter(
        ([_name, technology]) => !isHiddenFactorioPrototype(technology)
      )
    )

    const techEffectsByName = new Map()
    const techPrereqsByName = new Map()
    const recipeUnlockTechs = new Map()
    const surfaceUnlockTechs = new Map()
    const allSciencePackNames = new Set()

    for (const [techName, techData] of Object.entries(visibleTechnologies)) {
      const effects = toArray(techData?.effects)
      techEffectsByName.set(techName, effects)
      techPrereqsByName.set(techName, toArray(techData?.prerequisites).filter(Boolean))

      effects.forEach(effect => {
        if (effect?.type === 'unlock-recipe' && effect.recipe) {
          addToSetMap(recipeUnlockTechs, effect.recipe, techName)
        }

        const unlockSurfaceTypes = new Set(['unlock-space-location', 'unlock-surface', 'unlock-planet'])
        if (unlockSurfaceTypes.has(effect?.type)) {
          const unlockedSurfaceName =
            effect.space_location || effect.surface || effect.planet || effect.name || effect.location
          if (typeof unlockedSurfaceName === 'string' && unlockedSurfaceName.length > 0) {
            addToSetMap(surfaceUnlockTechs, unlockedSurfaceName, techName)
          }
        }
      })

      normalizeTechIngredients(techData?.unit?.ingredients).forEach(ingredient => {
        if (ingredient?.name) {
          allSciencePackNames.add(ingredient.name)
        }
      })
    }

    const techClosureMemo = new Map()
    const computeTechClosure = (techName, stack = new Set()) => {
      if (!techName || !visibleTechnologies[techName]) return new Set()
      if (techClosureMemo.has(techName)) return new Set(techClosureMemo.get(techName))
      if (stack.has(techName)) return new Set()

      stack.add(techName)
      const closure = new Set([techName])
      const prereqs = techPrereqsByName.get(techName) || []
      prereqs.forEach(prereq => {
        const prereqClosure = computeTechClosure(prereq, stack)
        prereqClosure.forEach(name => closure.add(name))
      })
      stack.delete(techName)

      techClosureMemo.set(techName, new Set(closure))
      return closure
    }

    const techRequiredSciencePacks = new Map()
    Object.keys(visibleTechnologies).forEach(techName => {
      const closure = computeTechClosure(techName)
      const packs = new Set()
      closure.forEach(name => {
        const tech = visibleTechnologies[name]
        normalizeTechIngredients(tech?.unit?.ingredients).forEach(ingredient => {
          if (ingredient?.name) packs.add(ingredient.name)
        })
      })
      techRequiredSciencePacks.set(techName, packs)
    })

    const baseVisibleRecipes = new Set()
    const recipeOutputsByRecipe = new Map()
    const recipeIngredientsByRecipe = new Map()
    const pathwaysByOutput = new Map()
    const naturalSeedByType = new Map()

    const getDataCollectionByType = type => {
      if (type === 'entity') return entities
      if (type === 'item') return items
      if (type === 'fluid') return fluids
      if (type === 'tile') return tiles
      if (type === 'equipment') return equipment
      return getTypeCollection(type)
    }

    const addPathway = (outputType, outputName, pathway) => {
      if (!outputType || !outputName || !pathway) return
      const key = `${outputType}:${outputName}`
      if (!pathwaysByOutput.has(key)) {
        pathwaysByOutput.set(key, [])
      }
      pathwaysByOutput.get(key).push(pathway)
    }

    const addNaturalSeed = (type, name) => {
      if (!type || !name) return
      if (!naturalSeedByType.has(type)) {
        naturalSeedByType.set(type, new Set())
      }
      naturalSeedByType.get(type).add(name)
    }

    for (const [recipeName, recipe] of Object.entries(recipes || {})) {
      if (isHiddenFactorioPrototype(recipe)) continue

      if (isEnabledFlag(recipe?.enabled)) {
        baseVisibleRecipes.add(recipeName)
      }

      const outputs = Array.isArray(recipe?.results) ? recipe.results : []
      const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : []
      recipeOutputsByRecipe.set(recipeName, outputs)
      recipeIngredientsByRecipe.set(recipeName, ingredients)

      outputs.forEach(result => {
        if (!result?.name) return
        const outputType = result.type === 'fluid' ? 'fluid' : 'item'
        addPathway(outputType, result.name, {
          kind: 'recipe_output',
          recipeName,
          requires: state => state.visibleRecipes.has(recipeName)
        })
      })
    }

    for (const [itemName, item] of Object.entries(items || {})) {
      if (isHiddenFactorioPrototype(item)) continue

      if (item.place_result) {
        addPathway('entity', item.place_result, {
          kind: 'item_place_result',
          sourceType: 'item',
          sourceName: itemName,
          requires: state => state.isObjectVisible('item', itemName)
        })
      }
      if (item.place_as_tile?.result) {
        addPathway('tile', item.place_as_tile.result, {
          kind: 'item_place_as_tile',
          sourceType: 'item',
          sourceName: itemName,
          requires: state => state.isObjectVisible('item', itemName)
        })
      }
      if (item.place_as_equipment_result) {
        addPathway('equipment', item.place_as_equipment_result, {
          kind: 'item_place_as_equipment',
          sourceType: 'item',
          sourceName: itemName,
          requires: state => state.isObjectVisible('item', itemName)
        })
      }

      if (Array.isArray(item.rocket_launch_products)) {
        item.rocket_launch_products.forEach(product => {
          if (!product?.name) return
          const outputType = product.type === 'fluid' ? 'fluid' : 'item'
          addPathway(outputType, product.name, {
            kind: 'rocket_launch_product',
            sourceType: 'item',
            sourceName: itemName,
            requires: state =>
              state.isObjectVisible('item', itemName) && state.capabilities.hasRocketLaunch
          })
        })
      }

      if (item.burnt_result) {
        addPathway('item', item.burnt_result, {
          kind: 'burnt_result',
          sourceType: 'item',
          sourceName: itemName,
          requires: state => state.isObjectVisible('item', itemName) && state.capabilities.hasBurner
        })
      }
    }

    for (const [tileName, tile] of Object.entries(tiles || {})) {
      if (isHiddenFactorioPrototype(tile)) continue
      const hasNaturalPresence = tile.fluid || tile.autoplace
      if (hasNaturalPresence) {
        addNaturalSeed('tile', tileName)
      }

      if (tile.fluid) {
        addPathway('fluid', tile.fluid, {
          kind: 'offshore_pump_extraction',
          sourceType: 'tile',
          sourceName: tileName,
          requires: state => state.isObjectVisible('tile', tileName) && state.capabilities.hasOffshorePump
        })
      }
    }

    for (const [entityName, entity] of Object.entries(entities || {})) {
      if (isHiddenFactorioPrototype(entity)) continue
      const entityType = entity.type || ''

      const naturalEntityTypes = new Set(['resource', 'fish', 'tree', 'plant'])
      const lootResults = normalizeLootResults(entity.loot)
      if (entity.autoplace || naturalEntityTypes.has(entityType) || lootResults.length > 0) {
        addNaturalSeed('entity', entityName)
      }

      if (entity.type === 'boiler' && entity.output_fluid_box?.filter) {
        const outputFluid = entity.output_fluid_box.filter
        const inputFluid = entity.fluid_box?.filter || null
        addPathway('fluid', outputFluid, {
          kind: 'boiler_output_fluid',
          sourceType: 'entity',
          sourceName: entityName,
          requires: state =>
            state.isObjectVisible('entity', entityName) &&
            (!inputFluid || state.isObjectVisible('fluid', inputFluid))
        })
      }

      const minableResults = normalizeMinableResults(entity.minable)
      minableResults.forEach(result => {
        if (!result?.name) return
        const outputType = result.type === 'fluid' ? 'fluid' : 'item'
        const resourceCategory = entity.category || 'basic-solid'
        const requiresFluid = Boolean(entity?.minable?.required_fluid)

        addPathway(outputType, result.name, {
          kind: entityType === 'resource' ? 'resource_mining' : 'entity_minable',
          sourceType: 'entity',
          sourceName: entityName,
          requirements: {
            resourceCategory,
            requiresFluid
          },
          requires: state => {
            if (!state.isObjectVisible('entity', entityName)) return false
            if (entityType !== 'resource') return true
            return state.canMineResource(resourceCategory, requiresFluid)
          }
        })
      })

      lootResults.forEach(result => {
        if (!result?.name) return
        const outputType = result.type === 'fluid' ? 'fluid' : 'item'
        addPathway(outputType, result.name, {
          kind: 'enemy_loot',
          sourceType: 'entity',
          sourceName: entityName,
          requires: state => state.isObjectVisible('entity', entityName)
        })
      })
    }

    const knownSurfaces = new Set()
    const visibleSpaceLocations = Object.entries(spaceLocations || {}).filter(
      ([_name, surface]) => !isHiddenFactorioPrototype(surface)
    )
    visibleSpaceLocations.forEach(([surfaceName]) => {
      knownSurfaces.add(surfaceName)
    })

    const startSurfaces = new Set()
    visibleSpaceLocations.forEach(([surfaceName, surface]) => {
      if (surfaceName === 'nauvis' || surface?.distance === 0 || surface?.starting_location === true) {
        startSurfaces.add(surfaceName)
      }
    })
    if (startSurfaces.size === 0 && visibleSpaceLocations.length > 0) {
      startSurfaces.add(visibleSpaceLocations[0][0])
    }

    availabilityIndexesCache = {
      techIndex: {
        technologies: visibleTechnologies,
        techEffectsByName,
        techPrereqsByName,
        techRequiredSciencePacks,
        recipeUnlockTechs,
        surfaceUnlockTechs
      },
      recipeIndex: {
        recipes,
        baseVisibleRecipes,
        recipeOutputsByRecipe,
        recipeIngredientsByRecipe
      },
      acquisitionIndex: {
        pathwaysByOutput,
        naturalSeedByType
      },
      surfaceIndex: {
        knownSurfaces,
        startSurfaces
      },
      metadata: {
        allSciencePackNames: Array.from(allSciencePackNames),
        allTechnologyNames: Object.keys(visibleTechnologies),
        allRecipeNames: Object.keys(recipes || {})
      },
      dataCollections: {
        entities,
        items,
        fluids,
        tiles,
        equipment
      },
      helpers: {
        getDataCollectionByType
      }
    }

    return availabilityIndexesCache
  }

  function normalizeTechIngredients(ingredients) {
    if (!ingredients) return []
    const normalized = Array.isArray(ingredients) ? ingredients : [ingredients]
    return normalized
      .map(entry => {
        if (!entry) return null
        if (Array.isArray(entry)) {
          const [name, amount] = entry
          return name ? { name, amount } : null
        }
        if (entry.name) {
          return { name: entry.name, amount: entry.amount ?? entry[1] }
        }
        if (entry[0]) {
          return { name: entry[0], amount: entry[1] }
        }
        return null
      })
      .filter(Boolean)
  }

  function getTechnologyPrerequisiteClosure(technologyName, visited = new Set()) {
    if (!technologyName || visited.has(technologyName)) return new Set()
    const technologies = ensureAvailabilityIndexes().techIndex.technologies
    const technology = technologies?.[technologyName]
    if (!technology) return new Set()

    visited.add(technologyName)
    const closure = new Set([technologyName])
    const prerequisites = Array.isArray(technology.prerequisites) ? technology.prerequisites : []
    prerequisites.forEach(prerequisiteName => {
      const prerequisiteClosure = getTechnologyPrerequisiteClosure(prerequisiteName, visited)
      prerequisiteClosure.forEach(name => closure.add(name))
    })

    return closure
  }

  function getRequiredSciencePackNamesForTechnology(
    technologyName,
    { includePrerequisites = true } = {}
  ) {
    const indexes = ensureAvailabilityIndexes()
    const technology = indexes.techIndex.technologies?.[technologyName]
    if (!technology) return new Set()

    if (includePrerequisites) {
      return new Set(indexes.techIndex.techRequiredSciencePacks.get(technologyName) || [])
    }

    const directPacks = new Set()
    normalizeTechIngredients(technology.unit?.ingredients).forEach(ingredient => {
      if (ingredient?.name) directPacks.add(ingredient.name)
    })
    return directPacks
  }

  function asSciencePackSet(selectedSciencePacks = []) {
    if (selectedSciencePacks instanceof Set) {
      return new Set(Array.from(selectedSciencePacks).filter(Boolean))
    }
    return new Set((selectedSciencePacks || []).filter(Boolean))
  }

  function isSubsetOfRequiredPacks(requiredPacks, selectedSciencePackSet) {
    if (!(requiredPacks instanceof Set)) return false
    for (const packName of requiredPacks) {
      if (!selectedSciencePackSet.has(packName)) return false
    }
    return true
  }

  function isTechnologyVisibleBySciencePacks(technologyName, selectedSciencePacks = []) {
    return createSciencePackVisibility(selectedSciencePacks).isTechnologyVisible(technologyName)
  }

  function isRecipeEnabledWithoutScience(recipeName) {
    if (!recipeName) return false
    const indexes = ensureAvailabilityIndexes()
    return indexes.recipeIndex.baseVisibleRecipes.has(recipeName)
  }

  function isRecipeVisibleBySciencePacks(recipeName, selectedSciencePacks = []) {
    return createSciencePackVisibility(selectedSciencePacks).isRecipeVisible(recipeName)
  }

  function isPrototypeEnabled(type, name, providedData = null) {
    if (providedData && Object.prototype.hasOwnProperty.call(providedData, 'enabled')) {
      return isEnabledFlag(providedData.enabled)
    }
    if (!type || !name) return false
    const prototypes = getTypeCollection(type)
    const prototype = prototypes?.[name]
    if (!prototype) return false
    return isEnabledFlag(prototype.enabled)
  }

  function isObjectVisibleBySciencePacks(type, name, data = null, selectedSciencePacks = []) {
    const visibility = createSciencePackVisibility(selectedSciencePacks)
    return visibility.isObjectVisible(type, name, data)
  }

  function isUnifiedObjectVisibleBySciencePacks(unifiedObject, selectedSciencePacks = []) {
    if (!unifiedObject) return false
    const primaryType = getPrimaryType(unifiedObject)
    if (!primaryType || !unifiedObject.name) return false
    return isObjectVisibleBySciencePacks(primaryType, unifiedObject.name, unifiedObject, selectedSciencePacks)
  }

  function getSciencePackNamesFromTechnologies() {
    const indexes = ensureAvailabilityIndexes()
    return [...indexes.metadata.allSciencePackNames]
  }

  function getSciencePackDependencyMap() {
    const indexes = ensureAvailabilityIndexes()
    const allPackNames = indexes.metadata.allSciencePackNames || []
    const dependencyMap = {}

    allPackNames.forEach(packName => {
      const requiredSets = []

      indexes.metadata.allTechnologyNames.forEach(technologyName => {
        const requiredPacks = indexes.techIndex.techRequiredSciencePacks.get(technologyName)
        if (requiredPacks instanceof Set && requiredPacks.has(packName)) {
          requiredSets.push(requiredPacks)
        }
      })

      if (requiredSets.length === 0) {
        dependencyMap[packName] = []
        return
      }

      const intersection = new Set(requiredSets[0])
      for (let i = 1; i < requiredSets.length; i += 1) {
        const currentSet = requiredSets[i]
        for (const candidate of Array.from(intersection)) {
          if (!currentSet.has(candidate)) {
            intersection.delete(candidate)
          }
        }
      }

      intersection.delete(packName)
      dependencyMap[packName] = Array.from(intersection).sort()
    })

    return dependencyMap
  }

  function createSciencePackVisibility(selectedSciencePacks = []) {
    const indexes = ensureAvailabilityIndexes()
    const selectedSciencePackSet = asSciencePackSet(selectedSciencePacks)
    const selected = Array.from(selectedSciencePackSet).sort()
    const cacheKey = selected.join('|') || '__all__'

    if (availabilityStateCache.has(cacheKey)) {
      return availabilityStateCache.get(cacheKey)
    }

    if (selectedSciencePackSet.size === 0) {
      const passthroughVisibility = {
        selectedSciencePacks: selected,
        selectedSciencePackSet,
        hasFilter: false,
        getAllSciencePackNames: () => getSciencePackNamesFromTechnologies(),
        getRequiredSciencePackNamesForTechnology: technologyName =>
          getRequiredSciencePackNamesForTechnology(technologyName, { includePrerequisites: true }),
        isTechnologyVisible: () => true,
        isRecipeVisible: () => true,
        isObjectVisible: () => true,
        isUnifiedObjectVisible: () => true,
        unlockedTechnologyNames: new Set(indexes.metadata.allTechnologyNames),
        unlockedRecipeNames: new Set(indexes.metadata.allRecipeNames),
        unlockedSurfaceNames: new Set(indexes.surfaceIndex.knownSurfaces)
      }
      availabilityStateCache.set(cacheKey, passthroughVisibility)
      return passthroughVisibility
    }

    const unlockedTechnologyNames = new Set()
    indexes.metadata.allTechnologyNames.forEach(technologyName => {
      const requiredPacks = indexes.techIndex.techRequiredSciencePacks.get(technologyName) || new Set()
      if (isSubsetOfRequiredPacks(requiredPacks, selectedSciencePackSet)) {
        unlockedTechnologyNames.add(technologyName)
      }
    })

    const unlockedSurfaceNames = new Set(indexes.surfaceIndex.startSurfaces)
    indexes.surfaceIndex.knownSurfaces.forEach(surfaceName => {
      const unlockTechs = indexes.techIndex.surfaceUnlockTechs.get(surfaceName)
      if (!unlockTechs || unlockTechs.size === 0) {
        if (indexes.surfaceIndex.startSurfaces.size === 0) {
          unlockedSurfaceNames.add(surfaceName)
        }
        return
      }
      for (const techName of unlockTechs) {
        if (unlockedTechnologyNames.has(techName)) {
          unlockedSurfaceNames.add(surfaceName)
          break
        }
      }
    })

    const visibleRecipes = new Set(indexes.recipeIndex.baseVisibleRecipes)
    indexes.metadata.allRecipeNames.forEach(recipeName => {
      const unlockTechs = indexes.techIndex.recipeUnlockTechs.get(recipeName)
      if (!unlockTechs || unlockTechs.size === 0) return
      for (const techName of unlockTechs) {
        if (unlockedTechnologyNames.has(techName)) {
          visibleRecipes.add(recipeName)
          break
        }
      }
    })

    const visibleByType = new Map()
    const getTypeSet = type => {
      if (!visibleByType.has(type)) {
        visibleByType.set(type, new Set())
      }
      return visibleByType.get(type)
    }
    const isObjectVisible = (type, name) => {
      if (!type || !name) return false
      return getTypeSet(type).has(name)
    }
    const markVisible = (type, name) => {
      if (!type || !name) return false
      const typeSet = getTypeSet(type)
      if (typeSet.has(name)) return false
      typeSet.add(name)
      return true
    }

    const hasSurfaceAccess = requirements => {
      if (!requirements || requirements.size === 0) return true
      for (const requiredSurface of requirements) {
        if (unlockedSurfaceNames.has(requiredSurface)) return true
      }
      return false
    }

    indexes.acquisitionIndex.naturalSeedByType.forEach((names, type) => {
      names.forEach(name => {
        const collection = indexes.helpers.getDataCollectionByType(type)
        if (hasSurfaceAccess(getPrototypeSurfaceRequirements(collection?.[name]))) {
          markVisible(type, name)
        }
      })
    })

    const computeCapabilities = () => {
      const capabilities = {
        hasOffshorePump: isObjectVisible('entity', 'offshore-pump'),
        hasRocketLaunch: isObjectVisible('entity', 'rocket-silo'),
        hasBurner: false,
        miningByCategory: new Map()
      }

      getTypeSet('entity').forEach(entityName => {
        const entity = indexes.dataCollections.entities?.[entityName]
        if (!entity) return

        if (entity.energy_source?.type === 'burner') {
          capabilities.hasBurner = true
        }

        if (entity.type === 'mining-drill') {
          const categories = Array.isArray(entity.resource_categories)
            ? entity.resource_categories
            : ['basic-solid']
          categories.forEach(category => {
            const record = capabilities.miningByCategory.get(category) || {
              canMine: false,
              supportsFluidRequiredResources: false
            }
            record.canMine = true
            if (entity.input_fluid_box) {
              record.supportsFluidRequiredResources = true
            }
            capabilities.miningByCategory.set(category, record)
          })
        }
      })

      return capabilities
    }

    const state = {
      visibleRecipes,
      isObjectVisible,
      capabilities: computeCapabilities(),
      canMineResource: (category, requiresFluid) => {
        const miningCapability = state.capabilities.miningByCategory.get(category || 'basic-solid')
        if (!miningCapability?.canMine) return false
        if (!requiresFluid) return true
        return Boolean(miningCapability.supportsFluidRequiredResources)
      }
    }

    let changed = true
    let iterationCount = 0
    const maxIterations = 20
    while (changed && iterationCount < maxIterations) {
      iterationCount += 1
      changed = false
      state.capabilities = computeCapabilities()

      indexes.acquisitionIndex.pathwaysByOutput.forEach((pathways, outputKey) => {
        const [outputType, outputName] = outputKey.split(':')
        if (isObjectVisible(outputType, outputName)) return

        for (const pathway of pathways) {
          const sourceCollection = indexes.helpers.getDataCollectionByType(pathway.sourceType)
          const sourcePrototype = sourceCollection?.[pathway.sourceName]
          const sourceSurfaces = getPrototypeSurfaceRequirements(sourcePrototype)
          if (!hasSurfaceAccess(sourceSurfaces)) continue
          if (!pathway.requires(state)) continue
          if (markVisible(outputType, outputName)) {
            changed = true
          }
          break
        }
      })
    }

    const visibility = {
      selectedSciencePacks: selected,
      selectedSciencePackSet,
      hasFilter: selectedSciencePackSet.size > 0,
      getAllSciencePackNames: () => getSciencePackNamesFromTechnologies(),
      getRequiredSciencePackNamesForTechnology: technologyName =>
        getRequiredSciencePackNamesForTechnology(technologyName, { includePrerequisites: true }),
      isTechnologyVisible: technologyName => unlockedTechnologyNames.has(technologyName),
      isRecipeVisible: recipeName => visibleRecipes.has(recipeName),
      isObjectVisible: (type, name) => {
        if (type === 'technology') return unlockedTechnologyNames.has(name)
        if (type === 'recipe') return visibleRecipes.has(name)
        return isObjectVisible(type, name)
      },
      isUnifiedObjectVisible: unifiedObject => {
        if (!unifiedObject) return false
        const primaryType = getPrimaryType(unifiedObject)
        if (!primaryType || !unifiedObject.name) return false
        if (primaryType === 'technology') return unlockedTechnologyNames.has(unifiedObject.name)
        if (primaryType === 'recipe') return visibleRecipes.has(unifiedObject.name)
        return isObjectVisible(primaryType, unifiedObject.name)
      },
      unlockedTechnologyNames,
      unlockedRecipeNames: visibleRecipes,
      unlockedSurfaceNames
    }

    availabilityStateCache.set(cacheKey, visibility)
    return visibility
  }

  /**
   * Find all recipes that use a specific item as ingredient
   */
  function findRecipesByIngredient(itemName) {
    if (!organizedData.value?.recipes || !itemName) return []

    const recipes = []
    for (const [_recipeName, recipeData] of Object.entries(organizedData.value?.recipes)) {
      if (recipeData.ingredients) {
        for (const ingredient of recipeData.ingredients) {
          if (ingredient.name === itemName) {
            recipes.push(recipeData)
            break
          }
        }
      }
    }
    return recipes
  }

  /**
   * Get all technologies that unlock a specific recipe
   */
  function getUnlockTechnologies(recipeName) {
    if (!recipeName) return []
    const indexes = ensureAvailabilityIndexes()
    return [...(indexes.techIndex.recipeUnlockTechs.get(recipeName) || [])]
  }

  /**
   * Get all recipes unlocked by a specific technology
   */
  function getUnlockedRecipes(technologyName) {
    if (!technologyName) return []
    const indexes = ensureAvailabilityIndexes()
    const effects = indexes.techIndex.techEffectsByName.get(technologyName) || []
    return effects.filter(effect => effect.type === 'unlock-recipe').map(effect => effect.recipe)
  }

  /**
   * Get all effects for a specific technology
   */
  function getTechnologyEffects(technologyName) {
    if (!technologyName) return []
    const technologies =
      organizedData.value?.technology ||
      organizedData.value?.technologies ||
      organizedData.value?.['technology']
    if (!technologies) return []
    const techData = technologies[technologyName]
    if (!techData?.effects) return []
    return Array.isArray(techData.effects) ? techData.effects : [techData.effects]
  }

  /**
   * Get all technologies that include a given effect type
   */
  function getTechnologiesByEffectType(effectType) {
    if (!effectType) return []
    const technologies =
      organizedData.value?.technology ||
      organizedData.value?.technologies ||
      organizedData.value?.['technology']
    if (!technologies) return []

    return Object.entries(technologies)
      .filter(([_name, techData]) => {
        const effects = Array.isArray(techData?.effects)
          ? techData.effects
          : techData?.effects
            ? [techData.effects]
            : []
        return effects.some(effect => effect.type === effectType)
      })
      .map(([name]) => name)
  }

  // These methods have been removed - use unified objects instead
  // All display names, icons, and data are now available through unified objects

  // getUsedInRecipes and getRecipeDisplayName removed - use unified objects instead

  // getObjectIcon removed - use unified objects for icon data

  /**
   * Pre-compute the entire category structure for all data types using unified objects
   */
  function precomputeCategoryStructure() {
    if (!organizedData.value) return {}

    const structure = {}
    const processedFactorioData = postProcessFactorioData(organizedData.value, {
      excludeHiddenFromFactorioData: true
    })

    // Data sources for unified object creation
    let allItems = []

    const usedKeys = new Set()
    // Get all distinct keys from all data sources

    for (const prototypes of Object.values(processedFactorioData)) {
      for (const prototypeName of Object.keys(prototypes)) {
        if (usedKeys.has(prototypeName)) continue
        const unifiedObjects = createUnifiedObjectByKey(prototypeName, processedFactorioData)
        if (unifiedObjects && unifiedObjects.length > 0) {
          allItems.push(...unifiedObjects)
        }
        usedKeys.add(prototypeName)
      }
    }

    // Process each key to get all possible unified objects

    // Keep recipe-category prototypes out of the browse grid.
    allItems = allItems.filter(
      item => item.source !== 'recipe-category' && !item.types?.includes('recipe-category')
    )

    // Alias resolution can map different prototype keys to the same canonical unified object.
    // Deduplicate here so category grids don't render duplicate entries.
    const seenUnifiedItems = new Set()
    allItems = allItems.filter(item => {
      const dedupeKey = `${item.name}|${item.source}|${item.types?.join(',')}`
      if (seenUnifiedItems.has(dedupeKey)) return false
      seenUnifiedItems.add(dedupeKey)
      return true
    })

    // Group items by subgroup
    const itemGroups = {}
    allItems.forEach(item => {
      const subgroup = item.subgroup || 'uncategorized'

      if (!itemGroups[subgroup]) {
        itemGroups[subgroup] = []
      }

      itemGroups[subgroup].push(item)
    })

    // Sort items within each subgroup
    Object.keys(itemGroups).forEach(subgroup => {
      itemGroups[subgroup].sort((a, b) => {
        if (a.order && b.order) {
          return a.order.localeCompare(b.order)
        } else if (a.order) {
          return -1
        } else if (b.order) {
          return 1
        } else {
          return a.displayName?.localeCompare(b.displayName)
        }
      })
    })

    // Get subgroups data from the new structure
    const subgroupsData = organizedData.value?.['item-subgroup'] || {}

    // Create structure for each category
    const categories = Object.values(organizedData.value?.['item-group'])
      .map(group => ({
        key: group.name,
        name: group.displayName,
        icon: `item-group-${group.name}`,
        order: group.order
      }))
      .sort((a, b) => {
        // Sort by order first, then by name
        const orderCompare = a.order.localeCompare(b.order)
        return orderCompare !== 0 ? orderCompare : a.name.localeCompare(b.name)
      })

    // Build category structure
    categories.forEach(category => {
      // Find all subgroups that belong to this group
      const groupSubgroups = Object.values(subgroupsData)
        .filter(subgroup => subgroup.group === category.key)
        .map(subgroup => ({
          name: subgroup.name,
          displayName: subgroup.displayName || subgroup.name,
          order: subgroup.order,
          recipes: itemGroups[subgroup.name] || []
        }))
        .filter(sub => sub.recipes.length > 0)
        .sort((a, b) => {
          // Sort by order first, then by name
          const orderCompare = a.order.localeCompare(b.order)
          return orderCompare !== 0 ? orderCompare : a.name.localeCompare(b.name)
        })

      // Only add category if it has items
      if (groupSubgroups.length > 0) {
        structure[category.key] = {
          key: category.key,
          name: category.name,
          icon: category.icon,
          order: category.order,
          subgroups: groupSubgroups
        }
      }
    })

    // Create "all" category - include all items
    /*
    const allSubgroups = Object.keys(itemGroups)
      .map(subgroupName => ({
        name: subgroupName,
        displayName: subgroupName,
        order: 'zzz', // Put at end
        recipes: itemGroups[subgroupName]
      }))
      .filter(sub => sub.recipes.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name))

    structure['all'] = {
      key: 'all',
      name: 'All Items',
      icon: 'item-iron-plate', // Use a common item icon to represent "all"
      order: 'a',
      subgroups: allSubgroups
    }*/

    // Create special categories for synthetic groups
    const syntheticGroups = ['technologies']

    syntheticGroups.forEach(groupName => {
      const groupItems = allItems.filter(item => item.group === groupName)
      if (groupItems.length > 0) {
        structure[groupName] = {
          key: groupName,
          name: groupName.charAt(0).toUpperCase() + groupName.slice(1),
          icon:
            groupName === 'technologies'
              ? 'technology-automation-science-pack'
              : 'entity-assembling-machine-1',
          order: 'zzz', // Put synthetic groups last
          subgroups: [
            {
              name: groupName,
              displayName: groupName.charAt(0).toUpperCase() + groupName.slice(1),
              order: 'a',
              recipes: groupItems
            }
          ]
        }
      }
    })
    return structure
  }

  /**
   * Get alternative recipes that produce a specific item
   */
  function getAlternativeRecipes(itemName) {
    if (!itemName || !organizedData.value?.recipes) return []

    const recipes = []
    Object.values(organizedData.value?.recipes).forEach(recipe => {
      if (recipe.results?.some(result => result.name === itemName)) {
        recipes.push(recipe)
      }
    })
    return recipes
  }

  /**
   * Create a unified object for selection based on type and name
   * This now uses the new unified approach that fetches all data by key
   */
  function createUnifiedSelectionObject(type, name, _data = null) {
    const objects = createUnifiedObjectByKey(name, organizedData.value)
    if (!objects || objects.length === 0) return null

    return (
      objects.find(object => object.types.includes(type)) ||
      objects.find(object => object.source === type) ||
      objects[0]
    )
  }

  /**
   * Optional metadata written by process-factorio-data (see data.json `_factoriopedia`).
   */
  function getFactoriopediaExportMeta() {
    const meta = rawData.value?._factoriopedia
    if (!meta || typeof meta !== 'object') return null
    return meta
  }

  return {
    // Data refs
    organizedData,
    rawData,
    currentLanguage,
    // Loading state
    isLoading,
    loadingError,

    getFactoriopediaExportMeta,

    // Loading functions
    loadAllData,
    loadRawData,
    loadLocaleData,
    processDataByType,

    // Utility functions
    isDataLoaded,
    findRecipesByResult,
    findRecipesByIngredient,
    getUnlockTechnologies,
    getUnlockedRecipes,
    getTechnologyEffects,
    getTechnologiesByEffectType,
    getSciencePackNamesFromTechnologies,
    getSciencePackDependencyMap,
    getRequiredSciencePackNamesForTechnology,
    isTechnologyVisibleBySciencePacks,
    isRecipeVisibleBySciencePacks,
    isObjectVisibleBySciencePacks,
    isUnifiedObjectVisibleBySciencePacks,
    createSciencePackVisibility,
    precomputeCategoryStructure,
    getAlternativeRecipes,
    createUnifiedSelectionObject
  }
}

export function useFactorioData() {
  // Return singleton instance
  if (!factorioDataInstance) {
    factorioDataInstance = createFactorioDataInstance()
  }
  return factorioDataInstance
}
