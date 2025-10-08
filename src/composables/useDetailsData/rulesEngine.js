/**
 * Unified Rules Engine
 *
 * This simplified rules engine handles both statistics and sections using a single
 * rule format. Rules are defined as plain objects with the following structure:
 *
 * {
 *   name: 'string',           // Rule name
 *   order: 'number',          // Order of the rule in the tooltip
 *   type: 'statistics|section', // Type of rule
 *   forType: 'entity|item|etc', // Only run rules for a given entity type
 *   shownInTooltip: 'boolean', // Whether this rule should be shown in the tooltip
 *   getValue: function(data, context) {}, // How to get a value from the unified data object
 *   condition: function(data, context) {}, // Extra conditions for when this rule should be run
 *   transform: function(value) {} // Transforms the obtained value (optional)
 * }
 */

/**
 * Apply rules to generate statistics or sections
 * @param {Array} rules - Array of rule objects
 * @param {Object} data - The unified data object (contains entity, item, etc.)
 * @param {Object} context - Additional context (isTooltip, factorioData, etc.)
 * @returns {Array} Array of statistics or section objects
 */
export function applyRules(rules, data, context = {}) {
  return rules
    .filter(rule => {
      // Check if rule should run based on conditions
      if (!rule.condition(data, context)) {
        return false
      }

      // Check if rule is for the correct type
      if (rule.forType && !context.types?.includes(rule.forType)) {
        return false
      }

      // Check tooltip visibility
      if (context.isTooltip && !rule.shownInTooltip) {
        return false
      }

      return true
    })
    .map(rule => {
      const result = rule.getValue(data, context)
      if (!result) return null

      // Transform the result based on rule type
      if (rule.type === 'statistics') {
        // For statistics rules, ensure they return { label, value }
        return {
          label: rule.name,
          value: result,
          _ruleType: rule.type
        }
      } else if (rule.type === 'section') {
        // For section rules, ensure they return { type, ...sectionData }
        return {
          ...result,
          type: rule.name,
          _ruleType: rule.type
        }
      }

      return result
    })
    .filter(result => result !== null && result !== undefined)
}

/**
 * Apply rules and sort by order
 * @param {Array} rules - Array of rule objects
 * @param {Object} data - The unified data object
 * @param {Object} context - Additional context
 * @returns {Array} Sorted array of results
 */
export function applyRulesSorted(rules, data, context = {}) {
  const results = applyRules(rules, data, context)

  // Sort by order if specified
  return results.sort((a, b) => {
    const aOrder = a.order || 0
    const bOrder = b.order || 0
    return aOrder - bOrder
  })
}

/**
 * Common transform functions
 */
export const transforms = {
  formatNumber: value => (typeof value === 'number' ? value.toFixed(2) : value),
  formatPercent: value => (typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value),
  formatBoolean: value => (value ? 'Yes' : 'No'),
  formatArray: value => (Array.isArray(value) ? value.join(', ') : value),
  formatObject: value => (typeof value === 'object' ? JSON.stringify(value) : value)
}
