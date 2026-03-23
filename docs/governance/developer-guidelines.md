# Developer Guidelines

This document is the canonical engineering contribution guide for SeaBlock runtime, docs UI, and pipeline code.

## Document Control

- **Owner area**: Runtime and tooling maintainers
- **Review cadence**: Monthly, and after CI/workflow changes
- **Compliance rule**: Engineering PRs affecting `src/`, `scripts/`, or `docs/.vitepress/` must satisfy required validation in this file.

## Scope

- Applies to `src/`, `scripts/`, and `docs/.vitepress/`.
- Complements (and supersedes where needed) high-level contribution notes in `README.md`.

## Branching and Pull Requests

- Use short-lived feature/fix branches from the primary integration branch.
- Keep PRs focused on one concern (pipeline, runtime composables, rendering, or docs UI).
- Include impact notes for:
  - data contracts in `generated/data/dev/`
  - rendering behavior changes
  - details rules output changes

## Required Local Validation

Run the following before opening/merging a PR:

```bash
npm run lint
npm run build
```

If touching data pipeline scripts, also run the relevant script(s) and validate generated outputs used by runtime:

- `scripts/process-factorio-data.js`
- `scripts/generate-tooltips.js`

## Merge Acceptance Criteria

- PR description includes impact notes for data contracts, runtime behavior, and rendering where applicable.
- Required local validation commands have been executed successfully.
- No new `debugger` statements or unconditional runtime debug logging are introduced.

## Logging and Debug Policy

- Do not commit `debugger` statements.
- Avoid unconditional `console.log` in runtime paths (`src/`, `docs/.vitepress/components/`) unless behind explicit debug flags.
- CLI scripts may log operational progress, but should keep output actionable and concise.

## Data Contract Policy

- Treat generated files under `generated/data/dev/` as runtime contracts.
- Any schema-affecting change must include:
  - update notes in PR description
  - downstream verification in composables/rules affected by the change
- Keep naming aligned with Factorio source fields unless explicitly transformed and documented.

## Rules and Rendering Quality Bar

- For `src/composables/useDetailsData/*` changes:
  - validate both tooltip and non-tooltip contexts where relevant
  - ensure rule ordering and conditional visibility remain deterministic
- For `src/composables/useFactorioRenderingMapping.js` and rendering engine changes:
  - verify no regressions for representative prototype families
  - avoid widening partially implemented handlers without a clear fallback path

## Complexity and File Size Guardrails

- Prefer extracting modules when files exceed practical reviewability (roughly 500+ lines with mixed concerns).
- Keep composables focused: loading, normalization, and presentation mapping should be separate where possible.
- Separate pure transforms from side-effectful IO/rendering code.

## CI and Workflow Expectations

- Deployment workflow should be branch-scoped; broad push triggers should be avoided.
- PR checks should include lint/build validation before deploy-capable jobs.

### GitHub Actions Deploy Configuration

`/.github/workflows/deploy.yml` is parameterized with repository variables so forks and target repos can use different deploy policies without editing workflow logic.

Required repository variables (Settings -> Secrets and variables -> Actions -> Variables):

- `DEPLOY_ON_ANY_PUSH`
  - `true`: deploy on every push branch (recommended for this fork).
  - `false`: deploy only from `DEPLOY_BRANCH` (recommended for target repo).
- `DEPLOY_BRANCH`
  - Branch name used when `DEPLOY_ON_ANY_PUSH` is not `true` (for example `wiki`).
  - If unset, workflow falls back to `wiki`.

Required GitHub Pages setup:

- In repository Settings -> Pages:
  - Source: **GitHub Actions**.
- In Actions permissions (repository settings):
  - Allow `pages: write` and `id-token: write` via workflow permissions (already configured in workflow file).

Recommended profiles:

- Fork profile:
  - `DEPLOY_ON_ANY_PUSH=true`
  - `DEPLOY_BRANCH=wiki` (ignored while any-push is true, but keep explicit).
- Target repo profile:
  - `DEPLOY_ON_ANY_PUSH=false`
  - `DEPLOY_BRANCH=wiki`

## Release and Maintenance Cadence

- Before release: run lint/build checks and verify critical rendering/details paths.
- After release: monitor build/deploy outcomes and investigate regressions quickly.
- Monthly: review dependency and workflow updates with a brief compatibility check.

## TODO/FIXME Policy

- TODOs must include a concrete intent and, when possible, the target condition for completion.
- Avoid open-ended TODOs in production-critical paths without tracking issue links.
- When resolving TODOs, remove stale comments and add/update tests or validation notes.

## Security and Reliability Basics

- Avoid global mutable state on `window` for runtime feature behavior.
- Use defensive checks on external/generated data reads.
- Keep browser-facing code resilient to absent/malformed fields in generated JSON.

## Sources and attribution

Last verified: 2026-03-16

- SeaBlock in-repo documentation and linked project pages.
- Official Sea Block mod portal resources and community references, where applicable.
