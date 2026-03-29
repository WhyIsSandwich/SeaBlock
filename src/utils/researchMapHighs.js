/**
 * Lazy HiGHS (WASM) loader for research-map Sugiyama coordSimplex LP solves.
 * In the browser, pass `wasmUrl` from `import wasmUrl from 'highs/runtime?url'` so Vite emits the asset.
 * In Node (tests, benchmarks), the `highs` package loads its wasm from disk without `wasmUrl`.
 *
 * MIT — HiGHS bindings: https://github.com/lovasoa/highs-js
 */

import highsLoader from 'highs'

/** @type {Promise<unknown>|null} */
let loadPromise = null
/** @type {unknown|null} */
let cachedHighs = null

function isNodeRuntime() {
  return typeof process !== 'undefined' && typeof process.versions?.node === 'string'
}

/**
 * @param {object} [options]
 * @param {string} [options.wasmUrl] Resolved URL for highs.wasm (e.g. Vite `import … from 'highs/runtime?url'`)
 */
export function preloadResearchMapHighs(options = {}) {
  if (!loadPromise) {
    const { wasmUrl } = options
    const loaderOpts =
      !isNodeRuntime() && typeof window !== 'undefined'
        ? {
            locateFile: (file) => {
              if (file.endsWith('.wasm')) {
                if (wasmUrl) return wasmUrl
                throw new Error(
                  'researchMapHighs: pass wasmUrl from import … from "highs/runtime?url" in browser bundles'
                )
              }
              return file
            }
          }
        : undefined
    loadPromise = highsLoader(loaderOpts).then((h) => {
      cachedHighs = h
      return h
    })
  }
  return loadPromise
}

/**
 * @returns {Promise<unknown>}
 */
export async function getResearchMapHighs() {
  return preloadResearchMapHighs()
}

/**
 * Use only after {@link preloadResearchMapHighs} has resolved (sync Sugiyama coord step).
 * @returns {unknown}
 */
export function getResearchMapHighsSync() {
  if (!cachedHighs) {
    throw new Error(
      'HiGHS is not ready: await preloadResearchMapHighs() before computeResearchMapLayout (or the first coord pass).'
    )
  }
  return cachedHighs
}
