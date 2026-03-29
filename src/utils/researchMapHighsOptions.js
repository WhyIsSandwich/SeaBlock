/**
 * HiGHS `solve(problem, options)` presets for research-map coord LPs.
 * Do not set `log_to_console: false` or `output_flag: false` — highs-js parses textual solution output.
 *
 * @see https://ergo-code.github.io/HiGHS/dev/options/definitions/
 */

/** @typedef {Record<string, string | number | boolean>} HighsSolveOptionsRecord */

/** @type {Record<string, HighsSolveOptionsRecord>} */
export const RESEARCH_MAP_HIGHS_PRESETS = Object.freeze({
  /** HiGHS defaults (empty — let solver choose). */
  default: Object.freeze({}),
  /** Fewer variables/rows: skip presolve overhead, force simplex. */
  fastSmall: Object.freeze({
    presolve: 'off',
    solver: 'simplex'
  }),
  /**
   * Large closures: presolve + parallel (Node often benefits; browser WASM may ignore threads).
   * Good default for the wiki research map (`ResearchMapHost`).
   */
  large: Object.freeze({
    presolve: 'on',
    solver: 'choose',
    parallel: 'on'
  })
})

const FORBIDDEN_KEYS = new Set(['log_to_console', 'output_flag'])

/**
 * @param {string} name
 * @returns {string}
 */
export function normalizeResearchMapHighsPresetName(name) {
  const n = String(name || 'default').trim()
  if (n in RESEARCH_MAP_HIGHS_PRESETS) return n
  return 'default'
}

/**
 * Merge preset + user options; strip options known to break highs-js solution parsing.
 *
 * @param {object} [params]
 * @param {string} [params.preset] key of {@link RESEARCH_MAP_HIGHS_PRESETS}
 * @param {HighsSolveOptionsRecord} [params.userOptions]
 * @returns {HighsSolveOptionsRecord}
 */
export function resolveResearchMapHighsSolveOptions({ preset = 'default', userOptions = {} } = {}) {
  const key = normalizeResearchMapHighsPresetName(preset)
  const base = { ...RESEARCH_MAP_HIGHS_PRESETS[key] }
  /** @type {HighsSolveOptionsRecord} */
  const merged = { ...base, ...userOptions }
  for (const k of FORBIDDEN_KEYS) {
    if (k in merged && merged[k] === false) {
      delete merged[k]
    }
  }
  return merged
}

/**
 * @returns {string | null}
 */
export function researchMapHighsPresetFromEnv() {
  if (typeof process === 'undefined' || !process.env) return null
  const v = process.env.RESEARCH_MAP_HIGHS_PRESET?.trim()
  return v || null
}

