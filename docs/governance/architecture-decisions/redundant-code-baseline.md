# Redundant Code Baseline

## Document Control

- **Owner area**: Runtime and DocsUI maintainers
- **Audience**: Platform maintainers and developers (Track B)
- **Target location**: `docs/governance/architecture-decisions` (under `docs/`)
- **Review cadence**: On each duplication baseline refresh

## Scope

Baseline generated for duplicate code detection in:
- `src`
- `docs/.vitepress/components`
- `scripts`

Command:

`npm run dup:report`

Configuration:

- Config file: `.jscpd.json`
- Tool: `jscpd`
- Threshold: `6%`
- Minimum clone size: `10` lines and `80` tokens

## Baseline Snapshot

Run date: 2026-03-23

- Files analyzed: `85`
- Total lines: `17784`
- Clones found: `7`
- Duplicated lines: `119` (`0.67%`)
- Duplicated tokens: `1165` (`0.75%`)

## Duplicate Clusters Identified

- `scripts/dump-tech-closure.js` and `scripts/extract-research-map-fixture.js` share closure traversal/reporting logic.
- `scripts/convert-to-webp.js` and `scripts/upload-to-cloudflare.js` share repeated progress/reporting path.
- `src/composables/__tests__/useUnifiedObjects.test.js` has repeated test setup/assertion blocks.
- `src/utils/researchMapLayout.test.js` contains repeated fixture/assertion segments.

## Status

- Shared hidden-prototype filtering is centralized via `src/utils/factorioPrototypeVisibility.js`.
- Shared rules formatting helpers are extracted into `src/composables/useDetailsData/sharedFormatters.js`.
- Tooltip positioning math is extracted to `docs/.vitepress/components/tooltipPosition.js`.
- Shared docs button style primitive is extracted to `docs/.vitepress/components/factoriopediaSharedPrimitives.css`.
