/**
 * Matches useFactorioData / factorioDataPostProcessing: prototypes the wiki should not surface.
 */
export function isHiddenFactorioPrototype(prototype) {
  return Boolean(
    prototype?.hidden || prototype?.hidden_in_factoriopedia || prototype?.hidden_from_factorio
  )
}
