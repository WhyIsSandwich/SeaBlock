/**
 * Composable for creating unified objects from different Factorio data types
 * This provides a consistent interface for recipes, technologies, items, buildings, etc.
 */

export function useUnifiedObjects() {
  const aliasResolutionPriority = ['recipe', 'item', 'entity', 'fluid', 'tile']

  function hasMatchingPrototypeName(prototype, expectedName) {
    if (!prototype || !expectedName) return false
    if (typeof prototype.name !== 'string' || prototype.name.length === 0) return false
    return prototype.name === expectedName
  }

  function getMatchingPrototype(factorioData, type, expectedName) {
    const prototype = factorioData?.[type]?.[expectedName]
    if (!prototype) return null
    if (shouldExcludeFromUnified(prototype)) return null
    if (!hasMatchingPrototypeName(prototype, expectedName)) return null
    return prototype
  }

  function shouldExcludeFromUnified(prototype) {
    return Boolean(
      prototype?.hidden || prototype?.hidden_in_factoriopedia || prototype?.hidden_from_factorio
    )
  }

  function getFactoriopediaAlternativeForKey(key, factorioData) {
    const allTypes = Object.keys(factorioData || {})
    const prioritizedTypes = [
      ...aliasResolutionPriority.filter(type => allTypes.includes(type)),
      ...allTypes.filter(type => !aliasResolutionPriority.includes(type))
    ]

    for (const type of prioritizedTypes) {
      const prototype = factorioData?.[type]?.[key]
      if (!prototype || shouldExcludeFromUnified(prototype)) continue
      if (
        typeof prototype.factoriopedia_alternative === 'string' &&
        prototype.factoriopedia_alternative.length > 0
      ) {
        return prototype.factoriopedia_alternative
      }
    }

    return null
  }

  function resolveFactoriopediaKey(key, factorioData, maxDepth = 10) {
    let resolvedKey = key
    const visited = new Set()
    let depth = 0

    while (resolvedKey && !visited.has(resolvedKey) && depth <= maxDepth) {
      visited.add(resolvedKey)
      const alternative = getFactoriopediaAlternativeForKey(resolvedKey, factorioData)
      if (!alternative || alternative === resolvedKey) {
        break
      }
      resolvedKey = alternative
      depth++
    }

    return resolvedKey
  }

  function getFirstPresentPropertyValue(prototypes, prop) {
    for (const prototype of prototypes) {
      if (!prototype) continue
      if (Object.prototype.hasOwnProperty.call(prototype, prop)) {
        return prototype[prop]
      }
    }
    return undefined
  }

  function getFirstNonNullishPropertyValue(prototypes, prop) {
    for (const prototype of prototypes) {
      if (!prototype) continue
      const value = prototype[prop]
      if (value !== undefined && value !== null) {
        return value
      }
    }
    return undefined
  }

  function getUnifiedDescription(prototypes) {
    const factoriopediaDescription = getFirstNonNullishPropertyValue(
      prototypes,
      'factoriopedia_description'
    )
    if (factoriopediaDescription !== undefined) {
      return factoriopediaDescription
    }

    return getFirstNonNullishPropertyValue(prototypes, 'description')
  }

  function getEntityMinableItemNames(entity) {
    if (!entity?.minable) return []
    const names = []

    if (typeof entity.minable.result === 'string' && entity.minable.result.length > 0) {
      names.push(entity.minable.result)
    }

    if (Array.isArray(entity.minable.results)) {
      for (const result of entity.minable.results) {
        if (typeof result === 'string' && result.length > 0) {
          names.push(result)
          continue
        }
        if (result && typeof result.name === 'string' && result.name.length > 0) {
          names.push(result.name)
        }
      }
    }

    return names
  }

  function getEntityLinkedItem(entity, factorioData) {
    if (!entity || !factorioData?.item) return null
    const candidateNames = getEntityMinableItemNames(entity)
    for (const itemName of candidateNames) {
      const item = getMatchingPrototype(factorioData, 'item', itemName)
      if (!item) continue
      if (item.place_result === entity.name) return item
    }
    return null
  }

  function getRecipePrimaryProduct(recipe, factorioData) {
    if (!recipe || !factorioData) return null

    let productRef = null
    if (recipe.main_product) {
      productRef = { name: recipe.main_product, type: null }
    } else if (Array.isArray(recipe.results) && recipe.results.length === 1) {
      productRef = recipe.results[0]
    }
    if (!productRef?.name) return null

    const productType = productRef.type === 'fluid' ? 'fluid' : 'item'
    const product = factorioData[productType]?.[productRef.name]
    if (!product || shouldExcludeFromUnified(product)) return null

    return product
  }

  /**
   * Create a unified object from recipe data
   */

  /**
   * Create a unified object by fetching all data by key
   * This is the new unified approach that fetches all related data
   */
  function createUnifiedObjectByKey(key, factorioData) {
    if (!key || !factorioData) return []
    const resolvedKey = resolveFactoriopediaKey(key, factorioData)

    const allTypes = {}
    for (const prototype of Object.keys(factorioData)) {
      allTypes[prototype] = getMatchingPrototype(factorioData, prototype, resolvedKey)
    }
    // Start with the base data for this key (ignore hidden entries when unifying)
    const item = allTypes.item
    const fluid = allTypes.fluid
    const entity = allTypes.entity
    const recipe = allTypes.recipe
    const tile = allTypes.tile
    /*
    const recipe = { ...recipesData?.[key] }

    if (true) {
      const mainProductName = recipe.main_product || recipe.results?.[0]?.name
      const recipeMainProduct = itemsData?.[mainProductName] || fluidsData?.[mainProductName]
      //Factoriopedia is using the subgroup of the main product for recipes
      if (recipeMainProduct && recipe.main_product === '') {
        //recipe.original_subgroup = recipe.subgroup
        //recipe.subgroup = recipeMainProduct?.subgroup
      }
      //recipe.order = recipeMainProduct?.order
    }
    */

    const objects = []

    const excludedTypes = [
      'autoplace-control',
      'damage-type',
      'noise-expression',
      'fuel-category',
      'shortcut',
      'surface-property',
      'item-group',
      'equipment'
    ]
    //process technology first as it doesn't join
    const handledTypes = new Set(['item', 'fluid', 'entity', 'recipe', 'tile'])
    for (const [type, value] of Object.entries(allTypes)) {
      if (handledTypes.has(type)) continue
      if (!value) continue
      if (excludedTypes.includes(type)) continue
      const unifiedObject = {
        types: [type],
        id: value.name,
        name: value.name,
        group: value.group || (type === 'technology' ? 'technologies' : 'other'),
        subgroup: value.subgroup || (type === 'technology' ? 'technologies' : 'other'),
        order: value.order,
        displayName: value.displayName,
        description: value.description,
        hidden: value.hidden,
        factoriopedia_alternative: value.factoriopedia_alternative,
        hidden_in_factoriopedia: value.hidden_in_factoriopedia,
        source: type,
        [type]: { ...value },
        lastUpdated: Date.now()
      }
      if (unifiedObject.displayName) {
        objects.push(unifiedObject)
      }
    }

    //now process other types as these don't join

    //There are valid shapes for unified objects: (recipe/)item/entity, recipe/fluid, and recipe/tile
    let fluidUsed = false
    let recipeUsed = false
    let entityUsed = false
    let tileUsed = false
    let itemUsed = false

    if (entity?.parameter) {
      fluidUsed = true
      entityUsed = true
      recipeUsed = true
      itemUsed = true

      const unifiedObject = {
        types: ['entity', 'fluid', 'recipe', 'item'],
        source: 'entity',
        name: entity.name,
        fluid,
        entity,
        recipe,
        item
      }
      objects.push(unifiedObject)
    }

    //Start by trying to make recipe/fluid (if incompatible return the fluid)
    if (fluid && !fluidUsed) {
      const unifiedObject = {
        types: ['fluid'],
        source: 'fluid',
        fluid
      }
      objects.push(unifiedObject)
      if (recipe) {
        //Check if the recipe is compatible with the fluid
        if (
          recipe.main_product === resolvedKey ||
          (recipe.results?.length === 1 && recipe.results?.[0]?.name === resolvedKey)
        ) {
          unifiedObject.recipe = recipe
          unifiedObject.types.push('recipe')
          recipeUsed = true
        }
      }
    }

    //Then try to make recipe/item/entity
    if (item && !itemUsed) {
      const unifiedObject = {
        types: ['item'],
        source: 'item',
        item
      }
      objects.push(unifiedObject)
      if (!recipeUsed && recipe) {
        //Check if the recipe is compatible with the item
        if (
          recipe.main_product === resolvedKey ||
          (recipe.results?.length === 1 && recipe.results?.[0]?.name === resolvedKey)
        ) {
          unifiedObject.recipe = recipe
          unifiedObject.types.push('recipe')
          recipeUsed = true
        }
      }
      {
        // Check if the entity is compatible with the item.
        // Intentional cross-name relationship: place_result and minable can link different prototype names.
        const entityFromPlacement = item.place_result
          ? getMatchingPrototype(factorioData, 'entity', item.place_result)
          : null
        const candidateEntity = entityFromPlacement || entity
        const minesCurrentItem = getEntityMinableItemNames(candidateEntity).includes(item.name)
        const placeResultMatches = Boolean(
          item.place_result && item.place_result === candidateEntity?.name
        )

        if (candidateEntity && (placeResultMatches || minesCurrentItem)) {
          unifiedObject.entity = candidateEntity
          unifiedObject.types.push('entity')
          if (candidateEntity === entity) {
            entityUsed = true
          }
        }
      }
      //Check if the tile is compatible with the item
      if (item.place_as_tile) {
        const tileName = item.place_as_tile.result
        const tileByPlacement = getMatchingPrototype(factorioData, 'tile', tileName)
        if (tileByPlacement) {
          // Intentional cross-name relationship: item can place a tile with a different prototype name.
          unifiedObject.tile = tileByPlacement
          unifiedObject.types.push('tile')
          if (tileName === resolvedKey) {
            tileUsed = true
          }
        }
      }
      //Check if the equipment is compatible with the item
      if (item.place_as_equipment_result) {
        const equipmentName = item.place_as_equipment_result
        const equipment = getMatchingPrototype(factorioData, 'equipment', equipmentName)
        if (equipment) {
          // Intentional cross-name relationship: an item can place a different equipment prototype.
          unifiedObject.equipment = equipment
          unifiedObject.types.push('equipment')
        }
      }
    }

    // Handle tiles - they can combine with items
    if (tile && !tileUsed) {
      // check if it would've been part of an item
      const placeAsTileItem = Object.values(factorioData.item).filter(
        item =>
          !shouldExcludeFromUnified(item) &&
          item.place_as_tile &&
          item.place_as_tile.result === resolvedKey
      )
      if (placeAsTileItem.length === 0 && tile.next_direction) {
        // walk the tile data until and end or we cycle back to the original tile
        let currentTile = tile
        while (currentTile.next_direction && currentTile.next_direction !== tile.name) {
          currentTile = factorioData.tile[currentTile.next_direction]
          const otherTilePlaceAsTileItem = Object.values(factorioData.item).filter(
            item =>
              !shouldExcludeFromUnified(item) &&
              item.place_as_tile &&
              item.place_as_tile.result === currentTile.name
          )
          if (otherTilePlaceAsTileItem.length > 0) {
            return createUnifiedObjectByKey(currentTile.name, factorioData)
          }
        }
      }

      if (placeAsTileItem.length === 0) {
        const unifiedObject = {
          types: ['tile'],
          source: 'tile',
          tile
        }
        objects.push(unifiedObject)
      }
    }

    if (entity && !entityUsed) {
      const unifiedObject = {
        types: ['entity'],
        source: 'entity',
        entity
      }
      const linkedItem = getEntityLinkedItem(entity, factorioData)
      if (linkedItem) {
        // Intentional cross-name relationship in reverse direction for entity-key lookups.
        unifiedObject.item = linkedItem
        unifiedObject.types.push('item')
      }
      objects.push(unifiedObject)
    }

    if (recipe && !recipeUsed) {
      const unifiedObject = {
        types: ['recipe'],
        source: 'recipe',
        recipe
      }
      objects.push(unifiedObject)
    }
    const propsToUnify = [
      'name',
      'displayName',
      'description',
      'subgroup',
      'order',
      'icon',
      'hidden',
      'factoriopedia_alternative',
      'hidden_in_factoriopedia'
    ]
    // Update all objects with the necessary properties using the correct hierarchy
    objects.forEach(object => {
      if (!handledTypes.has(object.types[0])) return
      // Core properties with hierarchy: recipe > item > entity > fluid > tile
      propsToUnify.forEach(prop => {
        object[prop] =
          object.recipe?.[prop] ||
          object.item?.[prop] ||
          object.entity?.[prop] ||
          object.fluid?.[prop] ||
          object.tile?.[prop]
      })
      // Treat explicit null as a valid top-priority value for factoriopedia_alternative.
      object.factoriopedia_alternative = getFirstPresentPropertyValue(
        [object.recipe, object.item, object.entity, object.fluid, object.tile],
        'factoriopedia_alternative'
      )
      object.description = getUnifiedDescription([
        object.recipe,
        object.item,
        object.entity,
        object.fluid,
        object.tile
      ])
      object.id =
        object.recipe?.name ||
        object.item?.name ||
        object.entity?.name ||
        object.fluid?.name ||
        object.tile?.name ||
        resolvedKey
      // Organization properties with hierarchy
      object.subgroup =
        object.item?.subgroup ||
        object.fluid?.subgroup ||
        object.recipe?.subgroup ||
        object.entity?.subgroup ||
        object.tile?.subgroup ||
        (object.entity && !object.recipe && !object.item && !object.fluid && !object.tile
          ? 'entities'
          : null)
      object.order =
        object.item?.order ||
        object.fluid?.order ||
        object.recipe?.order ||
        object.entity?.order ||
        object.tile?.order ||
        resolvedKey

      // Factoriopedia categorizes recipes by primary product when recipe subgroup is missing.
      if (object.recipe) {
        const primaryProduct = getRecipePrimaryProduct(object.recipe, factorioData)
        if (!object.recipe?.subgroup && primaryProduct?.subgroup) {
          object.subgroup = primaryProduct.subgroup
        }
      }

      // Metadata
      object.lastUpdated = Date.now()
    })

    return objects
  }

  /**
   * Get the primary type (first type in the array)
   */
  function getPrimaryType(unifiedObject) {
    if (!unifiedObject || !unifiedObject.types || unifiedObject.types.length === 0) return null
    //order entity / item / fluid / other
    const orderedTypes = ['entity', 'item', 'fluid', 'other']
    for (const type of orderedTypes) {
      if (unifiedObject.types.includes(type)) {
        return type
      }
    }
    return unifiedObject.types[0]
  }

  return {
    createUnifiedObjectByKey,
    getPrimaryType
  }
}
