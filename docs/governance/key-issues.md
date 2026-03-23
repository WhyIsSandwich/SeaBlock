# Wiki Platform Key Issues Report

This report prioritizes engineering issues for the wiki platform by production impact and remediation order.

## Severity Legend

- **P0**: Can cause incorrect runtime behavior or production instability.
- **P1**: Significant quality/perf/maintainability risk.
- **P2**: Important but not immediately destabilizing.

## Status and Ownership

- **Status values**: `Open`, `Planned`, `Resolved`
- **Owner area values**: `Runtime`, `Pipeline`, `DocsUI`, `CI`, `Governance`
- **Audience**: Platform maintainers and developers (Track B)
- **Target location**: `docs/governance` (under `docs/`)

## Findings

1. **P1 - Runtime loader key consistency hardening**
   - **Status**: `Planned`
   - **Owner area**: `Runtime`
   - **Evidence**: `src/composables/useFactorioData.js` now includes singular/plural fallback lookup, but contract usage remains spread across helpers and would benefit from explicit test coverage.
   - **Risk**: Future regressions in helper behavior when data-shape assumptions change.
   - **Recommended fix**: Keep one canonical loader key contract and add focused unit coverage for collection helpers.

2. **P0 - Race/deduping gaps in runtime data loading**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: `loadAllData()` in `src/composables/useFactorioData.js` lacks request deduplication/serialization for concurrent calls and language switches.
   - **Risk**: Shared singleton state can be overwritten by stale responses, causing mixed or stale localized data.
   - **Recommended fix**: Add in-flight load coordination (dedupe or sequence token) and deterministic reset/rebuild behavior.

3. **P1 - Runtime diagnostic logging remains in hot render paths**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: `src/components/FactorioSceneEngine.js` no longer contains `debugger`, but still includes runtime `console.*` calls in active render/error paths.
   - **Risk**: Excessive logging noise and potential performance overhead in client sessions.
   - **Recommended fix**: Keep diagnostics behind explicit development flags and reduce non-actionable runtime logs.

4. **P0 - Global state side effects in runtime composables/components**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: `src/composables/useFactorioData.js` writes `window.structure`; `docs/.vitepress/components/Factoriopedia.vue` stores observer state on `window`.
   - **Risk**: Hard-to-trace mutations, lifecycle leaks, and cross-component interference.
   - **Recommended fix**: Keep state local to composables/components; expose through reactive stores only.

5. **P1 - Rules gaps and null-safety issues in details data**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: TODOs and fragile checks in:
     - `src/composables/useDetailsData/recipeRules.js`
     - `src/composables/useDetailsData/entityRules.js`
     - `src/composables/useDetailsData/technologyRules.js`
   - **Risk**: Tooltip/statistics inconsistency and reduced parity with expected Factoriopedia behavior.
   - **Recommended fix**: Harden null checks and add parity tests for unlock effects, technology effects, and research-derived values.

6. **P1 - Pipeline processing throughput and sync-IO hotspots**
   - **Status**: `Open`
   - **Owner area**: `Pipeline`
   - **Evidence**: `scripts/process-factorio-data.js` performs frequent synchronous IO and sequential icon metadata/resize processing for large icon sets.
   - **Risk**: Slower end-to-end processing, higher runtime, and harder scalability for larger dumps/mod sets.
   - **Recommended fix**: Introduce bounded concurrency for image work and reduce hot-path synchronous filesystem operations where safe.

7. **P1 - Deployment workflow triggers broadly on push**
   - **Status**: `Open`
   - **Owner area**: `CI`
   - **Evidence**: `.github/workflows/deploy.yml` uses `push.branches: ['**']`.
   - **Risk**: Unnecessary builds/deploy pipeline activity and elevated accidental deploy risk.
   - **Recommended fix**: Restrict deploy trigger to release branch(es) and use PR checks for validation.

8. **P2 - Oversized files increase regression surface**
   - **Status**: `Planned`
   - **Owner area**: `Runtime`
   - **Evidence**: high-size concentration in:
     - `docs/.vitepress/components/DetailsPane.vue`
     - `scripts/process-factorio-data.js`
    - extraction scripts + `scripts/process-factorio-data.js`
   - **Risk**: High merge conflict rate, lower reviewability, hidden coupling.
   - **Recommended fix**: Modularize by concern (data loading, transforms, rendering, UI sections).

9. **P2 - Data contract assumptions are under-documented**
   - **Status**: `Planned`
   - **Owner area**: `Pipeline`
   - **Evidence**: Runtime composables/rules rely on generated artifacts in `generated/data/dev/` but formal schema expectations are spread across scripts/comments.
   - **Risk**: Silent regressions when generation behavior drifts from runtime expectations.
   - **Recommended fix**: Maintain a pipeline contract document and add lightweight contract validation checks.

10. **P2 - Cross-track planning drift**
   - **Status**: `Planned`
   - **Owner area**: `Governance`
   - **Evidence**: planning concerns span both platform and wiki-maintenance audiences and can drift without explicit track ownership.
   - **Risk**: duplicated work and unclear ownership boundaries.
   - **Recommended fix**: keep platform issues here (Track B) and maintain consumer/maintainer issue register in `docs/reference`.

## Recommended Remediation Order

1. Add load dedupe/race protection and finalize loader contract helper coverage.
2. Reduce runtime diagnostics noise and eliminate global `window` side effects.
3. Harden details rules null-safety and add parity tests.
4. Improve pipeline throughput in `scripts/process-factorio-data.js` (bounded concurrency and reduced sync hotspots).
5. Add deploy trigger safeguards and required CI quality checks.
6. Modularize largest files in staged refactors and keep contract checks in place.

## Cross-Track Links

- Consumer and maintainer issues: [Wiki Issues (Consumers and Maintainers)](/reference/wiki-issues-consumers-maintainers)
- Consumer and maintainer roadmap: [Wiki Roadmap (Consumers and Maintainers)](/reference/wiki-roadmap-consumers-maintainers)

## Sources and attribution

Last verified: 2026-03-16

- SeaBlock in-repo documentation and linked project pages.
- Official Sea Block mod portal resources and community references, where applicable.
