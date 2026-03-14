/**
 * Composable for loading and managing Factorio data from JSON files
 * This handles all the data loading logic that was previously in Factoriopedia.vue
 * Uses singleton pattern to ensure data is shared across all components
 * Now works with simplified data structure: data.json + locale files
 */

import { ref } from 'vue'
import { withBase } from 'vitepress'

import { resolveDataUrl } from '../components/assetResolver.js'

import { postProcessFactorioData } from './factorioDataPostProcessing.js'
import { useUnifiedObjects } from './useUnifiedObjects.js'
import { useFactorioPrototypeMapping } from './useFactorioPrototypeMapping.js'

// Singleton instance - shared across all components
let factorioDataInstance = null

function createFactorioDataInstance() {
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
   * Load raw data from data.json
   */
  async function loadRawData() {
    try {
      const response = await fetch(resolveDataUrl('data.json', withBase))
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      rawData.value = await response.json()
      console.log('✓ Loaded raw data')
    } catch (error) {
      console.error('Failed to load raw data:', error)
      throw error
    }
  }

  /**
   * Load locale data for the specified language
   */
  async function loadLocaleData(language = 'en') {
    try {
      const response = await fetch(resolveDataUrl(`locale-${language}.json`, withBase))
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      localeData.value = await response.json()
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
    // Process each prototype type
    for (const [prototypeType, prototypes] of Object.entries(rawData.value)) {
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
  }

  /**
   * Load all data files and process them
   */
  async function loadAllData(language = 'en') {
    isLoading.value = true
    loadingError.value = null

    try {
      // Load raw data and locale data in parallel
      await Promise.all([loadRawData(), loadLocaleData(language)])

      // Process the data by type
      processDataByType()

      console.log('✓ All Factorio data loaded and processed successfully')
    } catch (error) {
      loadingError.value = error
      console.error('Failed to load Factorio data:', error)
      throw error
    } finally {
      isLoading.value = false
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
    const technologies =
      organizedData.value?.technology ||
      organizedData.value?.technologies ||
      organizedData.value?.['technology']
    if (!technologies) return []

    const unlockTechnologies = []
    for (const [techName, techData] of Object.entries(technologies)) {
      const effects = Array.isArray(techData.effects)
        ? techData.effects
        : techData.effects
          ? [techData.effects]
          : []
      if (effects.length > 0) {
        for (const effect of effects) {
          if (effect.type === 'unlock-recipe' && effect.recipe === recipeName) {
            unlockTechnologies.push(techName)
            break
          }
        }
      }
    }
    return unlockTechnologies
  }

  /**
   * Get all recipes unlocked by a specific technology
   */
  function getUnlockedRecipes(technologyName) {
    if (!technologyName) return []
    const technologies =
      organizedData.value?.technology ||
      organizedData.value?.technologies ||
      organizedData.value?.['technology']
    if (!technologies) return []

    const techData = technologies[technologyName]
    if (!techData || !techData.effects) return []

    const unlockedRecipes = []
    const effects = Array.isArray(techData.effects) ? techData.effects : [techData.effects]
    for (const effect of effects) {
      if (effect.type === 'unlock-recipe') {
        unlockedRecipes.push(effect.recipe)
      }
    }
    return unlockedRecipes
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
    const { createUnifiedObjectByKey } = useUnifiedObjects()
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
    window.structure = structure
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
    const { createUnifiedObjectByKey } = useUnifiedObjects()
    const objects = createUnifiedObjectByKey(name, organizedData.value)
    if (!objects || objects.length === 0) return null

    return (
      objects.find(object => object.types.includes(type)) ||
      objects.find(object => object.source === type) ||
      objects[0]
    )
  }

  return {
    // Data refs
    organizedData,
    // Loading state
    isLoading,
    loadingError,

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
