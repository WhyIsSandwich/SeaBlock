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

1. **P0 - Runtime debugger and diagnostic logging in scene engine**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: `src/components/FactorioSceneEngine.js` contains `debugger` and runtime `console.log` calls in active render paths.
   - **Risk**: Unexpected execution pauses and performance degradation in client sessions.
   - **Recommended fix**: Remove `debugger`; gate diagnostics behind explicit development flag.

2. **P0 - Global state side effects in runtime composables/components**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: `src/composables/useFactorioData.js` writes `window.structure`; `docs/.vitepress/components/Factoriopedia.vue` stores observer state on `window`.
   - **Risk**: Hard-to-trace mutations, lifecycle leaks, and cross-component interference.
   - **Recommended fix**: Keep state local to composables/components; expose through reactive stores only.

3. **P1 - Incomplete rendering mapping and TODO-heavy coverage**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: `src/composables/useFactorioRenderingMapping.js` has open TODOs and partially implemented prototype handlers.
   - **Risk**: Missing or incorrect visuals for specific prototype families.
   - **Recommended fix**: Define minimum supported prototype matrix and close TODOs by priority.

4. **P1 - Rules gaps in details data for recipes/entities/technologies**
   - **Status**: `Open`
   - **Owner area**: `Runtime`
   - **Evidence**: TODOs and disabled sections in:
     - `src/composables/useDetailsData/recipeRules.js`
     - `src/composables/useDetailsData/entityRules.js`
     - `src/composables/useDetailsData/technologyRules.js`
   - **Risk**: Tooltip/statistics inconsistency and reduced parity with expected Factoriopedia behavior.
   - **Recommended fix**: Add explicit parity tests for unlock effects, technology effects, and research-derived values.

5. **P1 - Deployment workflow triggers broadly on push**
   - **Status**: `Open`
   - **Owner area**: `CI`
   - **Evidence**: `.github/workflows/deploy.yml` uses `push.branches: ['**']`.
   - **Risk**: Unnecessary builds/deploy pipeline activity and elevated accidental deploy risk.
   - **Recommended fix**: Restrict deploy trigger to release branch(es) and use PR checks for validation.

6. **P2 - Oversized files increase regression surface**
   - **Status**: `Planned`
   - **Owner area**: `Runtime`
   - **Evidence**: high-size concentration in:
     - `docs/.vitepress/components/DetailsPane.vue`
     - `scripts/process-factorio-data.js`
     - `scripts/orchestrate-factorio-processing.js`
   - **Risk**: High merge conflict rate, lower reviewability, hidden coupling.
   - **Recommended fix**: Modularize by concern (data loading, transforms, rendering, UI sections).

7. **P2 - Guidance and quality gates are fragmented**
   - **Status**: `Resolved`
   - **Owner area**: `Governance`
   - **Evidence**: guidance split between `README.md`, markdown guides, and `test/` planning docs; no canonical contributor/developer policy file.
   - **Risk**: Inconsistent contributor behavior and uneven quality bar.
   - **Recommended fix**: Centralize in governance docs and link from README/docs nav (implemented in this review set).

## Recommended Remediation Order

1. Remove runtime `debugger` and constrain debug logs.
2. Eliminate global `window` side effects.
3. Add deploy trigger safeguards and required CI quality checks.
4. Close highest-impact details/rendering TODO gaps with tests.
5. Modularize largest files in staged refactors.
