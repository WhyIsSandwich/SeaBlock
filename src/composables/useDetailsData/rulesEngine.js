/**
 * Rules engine for processing statistics and sections based on configuration
 */

/**
 * Common value transformation functions
 */
export const transforms = {
  // Format numbers with 2 decimal places
  formatNumber: value => (typeof value === 'number' ? value.toFixed(2) : value),

  // Format percentages
  formatPercent: value => (typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value),

  // Format boolean as Yes/No
  formatBoolean: value => (value ? 'Yes' : 'No'),

  // Format boolean as Yes/No with custom labels
  formatBooleanWithLabels:
    (yesLabel = 'Yes', noLabel = 'No') =>
    value =>
      value ? yesLabel : noLabel,

  // Format array length
  formatArrayLength: value => (Array.isArray(value) ? value.length : value),

  // Format object keys count
  formatObjectKeys: value =>
    typeof value === 'object' && value !== null ? Object.keys(value).length : value,

  // Format with units
  formatWithUnit: unit => value => (typeof value === 'number' ? `${value} ${unit}` : value),

  // Format with prefix
  formatWithPrefix: prefix => value => (typeof value === 'number' ? `${prefix}${value}` : value)
}

/**
 * Create a simple statistics rule with value transformation
 * @param {string} key - The data key to check
 * @param {string} label - The display label
 * @param {Function} transform - Function to transform the value
 * @returns {Object} Rule object
 */
export function createSimpleStatisticsRule(key, label, transform = null) {
  return {
    key,
    label,
    condition: (data, context) => {
      const hasValue = data[key] !== undefined && data[key] !== null
      return hasValue
    },
    getValue: data => ({ label, value: transform ? transform(data[key]) : data[key] })
  }
}

/**
 * Create a statistics rule with custom value extraction
 * @param {string} key - The data key to check (for reference)
 * @param {string} label - The display label
 * @param {Function} getValue - Function to extract the value
 * @param {Function} condition - Optional custom condition function
 * @returns {Object} Rule object
 */
export function createCustomStatisticsRule(key, label, getValue, condition = null) {
  return {
    key,
    label,
    condition: (data, context) => {
      if (condition) return condition(data, context)
      const value = getValue(data, context)
      return value !== undefined && value !== null
    },
    getValue: (data, context) => ({ label, value: getValue(data, context) })
  }
}

/**
 * Create a statistics rule with options
 * @param {string} key - The data key to check
 * @param {string} label - The display label
 * @param {Object} options - Additional options
 * @returns {Object} Rule object
 */
export function createStatisticsRule(key, label, options = {}) {
  const { required = false, tooltip = true, customCondition = null, customValue = null } = options

  return {
    key,
    label,
    condition: (data, context) => {
      if (customCondition) return customCondition(data, context)

      // Default: just check if value exists
      const hasValue = data[key] !== undefined && data[key] !== null
      const isTooltipAllowed = tooltip || !context.isTooltip

      return hasValue && isTooltipAllowed
    },
    getValue: (data, context) =>
      customValue ? { label, value: customValue(data, context) } : { label, value: data[key] }
  }
}

export function createResistancesStatisticsRule(key, label, options = {}) {
  const { required = false, tooltip = true, customCondition = null, customValue = null } = options
  return {
    key,
    label,
    getValue: (data, context) => {
      return {
        label,
        children: data[key].map(resistance => ({
          label: resistance.type,
          value: resistance.percent
        }))
      }
    },
    condition: (data, context) => {
      const hasValue = data[key] !== undefined && data[key] !== null
      const isTooltipAllowed = tooltip || !context.isTooltip

      return hasValue && isTooltipAllowed
    }
  }
}

/**
 * Create a section rule
 * @param {string} type - The section type
 * @param {Function} getItems - Function to get items for the section
 * @param {Object} options - Additional options
 * @returns {Object} Rule object
 */
export function createSectionRule(type, getValue, options = {}) {
  const { required = false, tooltip = true, customCondition = null } = options
  return {
    type,
    getValue,
    condition: (data, context) => {
      if (customCondition) return customCondition(data, context)

      // Default: just check if items exist
      const hasData = getValue(data, context)
      const isTooltipAllowed = tooltip || !context.isTooltip

      return hasData && isTooltipAllowed
    }
  }
}

/**
 * Apply statistics rules to generate statistics array
 * @param {Array} rules - Array of rule objects
 * @param {Object} data - The data object (entity, item, etc.)
 * @param {Object} context - Additional context (isTooltip, etc.)
 * @returns {Array} Array of statistics objects
 */
export function applyStatisticsRules(rules, data, context = {}) {
  return rules
    .filter(rule => rule.condition(data, context))
    .map(rule => rule.getValue(data, context))
}

/**
 * Apply section rules to generate sections array
 * @param {Array} rules - Array of rule objects
 * @param {Object} data - The data object (entity, item, etc.)
 * @param {Object} context - Additional context (isTooltip, etc.)
 * @returns {Array} Array of section objects
 */
export function applySectionRules(rules, data, context = {}) {
  return rules
    .filter(rule => rule.condition(data, context))
    .map(rule => ({
      ...rule.getValue(data, context),
      type: rule.type
    }))
}
