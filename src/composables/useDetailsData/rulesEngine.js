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

function toRichTextValue(value) {
  if (value === null || value === undefined) {
    return value
  }
  return typeof value === 'string' ? value : String(value)
}

function normalizeStatistic(statistic, defaultLabel = '') {
  if (statistic === null || statistic === undefined) {
    return null
  }

  if (typeof statistic !== 'object' || Array.isArray(statistic)) {
    return {
      label: defaultLabel,
      value: toRichTextValue(statistic)
    }
  }

  const normalized = {
    ...statistic,
    label: statistic.label ?? defaultLabel
  }

  if (normalized.value !== undefined) {
    normalized.value = toRichTextValue(normalized.value)
  }

  if (normalized.children) {
    normalized.children = normalized.children
      .map(child => normalizeStatistic(child))
      .filter(child => child !== null)
  }

  return normalized
}

function normalizeStatisticsList(statistics) {
  if (!Array.isArray(statistics)) {
    return []
  }
  return statistics.map(stat => normalizeStatistic(stat)).filter(stat => stat !== null)
}

function normalizeRuleResult(rule, result) {
  if (rule.type === 'statistics') {
    return normalizeStatistic(result, rule.name)
  }

  if (!result || typeof result !== 'object') {
    return result
  }

  const normalized = { ...result }
  if (!normalized.label) {
    normalized.label = rule.name
  }
  if (Array.isArray(normalized.statistics)) {
    normalized.statistics = normalizeStatisticsList(normalized.statistics)
  }
  return normalized
}

function applyRuleTransform(rule, result, data, context) {
  if (!rule.transform || result === null || result === undefined) {
    return result
  }

  if (rule.type !== 'statistics') {
    return result
  }

  if (typeof result === 'object' && !Array.isArray(result)) {
    if (result.value === undefined) {
      return result
    }

    const transformedValue = rule.transform(result.value, data, context)
    return {
      ...result,
      rawValue: result.rawValue ?? result.value,
      value: transformedValue
    }
  }

  return {
    value: rule.transform(result, data, context),
    rawValue: result
  }
}

/**
 * Apply rules to generate statistics or sections
 * @param {Array} rules - Array of rule objects
 * @param {Object} data - The unified data object (contains entity, item, etc.)
 * @param {Object} context - Additional context (isTooltip, factorioData, etc.)
 * @returns {Array} Array of statistics or section objects
 */
export function applyRules(rules, data, context = {}) {
  const typeOrder = Array.isArray(context.types) ? [...context.types].reverse() : []
  const getTypeRank = rule => {
    if (typeOrder.length === 0) {
      return Number.MAX_SAFE_INTEGER
    }
    const ruleType = rule.forType || rule._sourceType
    const rank = typeOrder.indexOf(ruleType)
    return rank === -1 ? Number.MAX_SAFE_INTEGER : rank
  }

  return rules
    .map((rule, index) => ({ rule, index }))
    .sort((a, b) => {
      const aTypeRank = getTypeRank(a.rule)
      const bTypeRank = getTypeRank(b.rule)
      if (aTypeRank !== bTypeRank) {
        return aTypeRank - bTypeRank
      }

      const aOrder = a.rule.order ?? Number.MAX_SAFE_INTEGER
      const bOrder = b.rule.order ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      if (a.rule._sourceType !== b.rule._sourceType) {
        const aSource = a.rule._sourceType || ''
        const bSource = b.rule._sourceType || ''
        return aSource.localeCompare(bSource)
      }

      if (a.rule.name !== b.rule.name) {
        return String(a.rule.name || '').localeCompare(String(b.rule.name || ''))
      }

      if (a.index !== b.index) {
        return a.index - b.index
      }
      return 0
    })
    .map(({ rule }) => rule)
    .filter(rule => {
      // Check if rule is for the correct type
      if (rule.forType && !context.types?.includes(rule.forType)) {
        return false
      }

      // Check tooltip visibility
      if (context.isTooltip && !rule.shownInTooltip) {
        return false
      }

      // Check if rule should run based on conditions
      if (rule.condition && !rule.condition(data, context)) {
        return false
      }

      return true
    })
    .map(rule => {
      let result = rule.getValue(data, context)
      if (!result && !rule.condition) return null

      result = applyRuleTransform(rule, result, data, context)

      if (rule.postCondition && !rule.postCondition(result, context)) {
        return null
      }

      const normalizedResult = normalizeRuleResult(rule, result)
      if (!normalizedResult) {
        return null
      }

      return { ...normalizedResult, _ruleType: rule.type }
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
  return applyRules(rules, data, context)
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
