/**
 * Composable for creating unified objects from different Factorio data types
 * This provides a consistent interface for recipes, technologies, items, buildings, etc.
 */

export function useUnifiedObjects() {
  /**
   * Create a unified object from recipe data
   */

  /**
   * Create a unified object by fetching all data by key
   * This is the new unified approach that fetches all related data
   */
  function createUnifiedObjectByKey(key, factorioData) {
    if (!key || !factorioData) return []

    const allTypes = {}
    for (const prototype of Object.keys(factorioData)) {
      allTypes[prototype] = factorioData[prototype][key]
    }
    // Start with the base data for this key
    const { item, fluid, entity, recipe, tile } = allTypes
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
          recipe.main_product === key ||
          (recipe.results?.length === 1 && recipe.results?.[0]?.name === key)
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
          recipe.main_product === key ||
          (recipe.results?.length === 1 && recipe.results?.[0]?.name === key)
        ) {
          unifiedObject.recipe = recipe
          unifiedObject.types.push('recipe')
          recipeUsed = true
        }
      }
      if (entity) {
        //Check if the entity is compatible with the item
        const results = entity?.minable?.results
        if (
          item.place_result === key ||
          results == key ||
          results?.every(item => item.name === key)
        ) {
          unifiedObject.entity = entity
          unifiedObject.types.push('entity')
          entityUsed = true
        }
      }
      //Check if the tile is compatible with the item
      if (item.place_as_tile) {
        const tileName = item.place_as_tile.result
        unifiedObject.tile = factorioData.tile[tileName]
        unifiedObject.types.push('tile')
        if (tileName === key) {
          tileUsed = true
        }
      }
      //Check if the equipment is compatible with the item
      if (item.place_as_equipment_result) {
        const equipmentName = item.place_as_equipment_result
        const equipment = factorioData.equipment?.[equipmentName]
        if (equipment) {
          unifiedObject.equipment = equipment
          unifiedObject.types.push('equipment')
        }
      }
    }

    // Handle tiles - they can combine with items
    if (tile && !tileUsed) {
      // check if it would've been part of an item
      const placeAsTileItem = Object.values(factorioData.item).filter(
        item => item.place_as_tile && item.place_as_tile.result === key
      )
      if (placeAsTileItem.length === 0 && tile.next_direction) {
        // walk the tile data until and end or we cycle back to the original tile
        let currentTile = tile
        while (currentTile.next_direction && currentTile.next_direction !== tile.name) {
          currentTile = factorioData.tile[currentTile.next_direction]
          const otherTilePlaceAsTileItem = Object.values(factorioData.item).filter(
            item => item.place_as_tile && item.place_as_tile.result === currentTile.name
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
      object.id =
        object.recipe?.name ||
        object.item?.name ||
        object.entity?.name ||
        object.fluid?.name ||
        object.tile?.name ||
        key
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
        key

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
