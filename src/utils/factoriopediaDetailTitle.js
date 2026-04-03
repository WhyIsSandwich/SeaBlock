/**
 * Shared title string for Factoriopedia details header and production-map cards (recipe amount rules).
 * @module factoriopediaDetailTitle
 */

/**
 * @param {object} p
 * @param {string} p.displayName
 * @param {boolean} p.isRecipe
 * @param {object|null|undefined} p.recipe raw Factorio recipe (when isRecipe)
 * @returns {string}
 */
export function formatFactoriopediaDetailTitle({ displayName, isRecipe, recipe }) {
  if (displayName == null || displayName === '') return ''

  if (!isRecipe || recipe?.show_amount_in_title === false || !recipe?.results?.length) {
    return String(displayName)
  }

  if (recipe.results.length > 1) {
    return String(displayName)
  }

  const firstResult = recipe.results[0]
  const amount = firstResult?.amount || 1
  if (amount === 1) {
    return String(displayName)
  }

  return `${amount}x ${displayName}`
}
