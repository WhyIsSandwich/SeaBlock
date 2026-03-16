# Key Issues Report

This report prioritizes repo-wide implementation issues by production impact and remediation order.

## Severity Legend

- **P0**: Can cause incorrect runtime behavior or production instability.
- **P1**: Significant quality/perf/maintainability risk.
- **P2**: Important but not immediately destabilizing.

## Status and Ownership

- **Status values**: `Open`, `Planned`, `Resolved`
- **Owner area values**: `Runtime`, `Pipeline`, `DocsUI`, `CI`, `Governance`

## Findings

1. **P0 - Runtime organized-data key mismatch in loader utilities**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: `src/composables/useFactorioData.js` organizes by singular base types (for example `recipe`, `technology`) while helper methods query plural buckets (`recipes`, `technologies`).
   - **Risk**: Empty or incorrect utility results and inconsistent downstream behavior.
   - **Recommended fix**: Normalize key usage to contract-aligned base types and add focused unit coverage for loader helpers.

2. **P0 - Race/deduping gaps in runtime data loading**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: `loadAllData()` in `src/composables/useFactorioData.js` lacks request deduplication/serialization for concurrent calls and language switches.
   - **Risk**: Shared singleton state can be overwritten by stale responses, causing mixed or stale localized data.
   - **Recommended fix**: Add in-flight load coordination (dedupe or sequence token) and deterministic reset/rebuild behavior.

3. **P0 - Runtime debugger and diagnostic logging in scene engine**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: `src/components/FactorioSceneEngine.js` contains `debugger` and runtime `console.log` calls in active render paths.
   - **Risk**: Unexpected execution pauses and performance degradation in client sessions.
   - **Recommended fix**: Remove `debugger`; gate diagnostics behind explicit development flag.

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
     - `scripts/orchestrate-factorio-processing.js`
   - **Risk**: High merge conflict rate, lower reviewability, hidden coupling.
   - **Recommended fix**: Modularize by concern (data loading, transforms, rendering, UI sections).

9. **P2 - Data contract assumptions are under-documented**
   - **Status**: `Planned`
   - **Owner area**: `Pipeline`
   - **Evidence**: Runtime composables/rules rely on generated artifacts in `generated/data/dev/` but formal schema expectations are spread across scripts/comments.
   - **Risk**: Silent regressions when generation behavior drifts from runtime expectations.
   - **Recommended fix**: Maintain a pipeline contract document and add lightweight contract validation checks.

10. **P2 - Guidance and quality gates are fragmented**
   - **Status**: `Resolved`
   - **Owner area**: `Governance`
   - **Evidence**: guidance split between `README.md`, markdown guides, and `test/` planning docs; no canonical contributor/developer policy file.
   - **Risk**: Inconsistent contributor behavior and uneven quality bar.
   - **Recommended fix**: Centralize in governance docs and link from README/docs nav (implemented in this review set).

## Recommended Remediation Order

1. Fix runtime organized-data key mismatches and add load dedupe/race protection.
2. Remove runtime `debugger` and eliminate global `window` side effects.
3. Harden details rules null-safety and add parity tests.
4. Improve pipeline throughput in `scripts/process-factorio-data.js` (bounded concurrency and reduced sync hotspots).
5. Add deploy trigger safeguards and required CI quality checks.
6. Modularize largest files in staged refactors and keep contract checks in place.
