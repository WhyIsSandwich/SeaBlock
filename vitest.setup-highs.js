/**
 * Preload HiGHS for tests that run {@link computeResearchMapLayout} (Sugiyama coord uses WASM in workers).
 */
import { preloadResearchMapHighs } from './src/utils/researchMapHighs.js'

await preloadResearchMapHighs()
