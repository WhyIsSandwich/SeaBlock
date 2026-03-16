# Wiki Screenshot Shot List

This page is a working capture backlog for player-facing wiki screenshots.

Use it to track what still needs to be captured, what version it was captured on, and where each image is used.

## Capture standards

- Format: `webp`
- Resolution target: 1920x1080 (or higher, crop as needed)
- UI scale: consistent across a batch
- Factorio version: include in notes
- Mod pack version: include in notes
- Prefer daytime and clear overlays unless the overlay is the point
- Use alt mode for build/process screenshots unless the screenshot is for aesthetics

## Naming convention

- Path: `/public/images/<section>/<topic>/`
- Filename: `<topic>__<context>__v2-0__YYYY-MM__NN.webp`

Example:

- `/public/images/guides/power/power-transition__algae-to-solid-fuel__v2-0__2026-03__01.webp`

## Priority backlog

## P0 - New player unblockers

| Status     | Doc page                                           | Screenshot needed                         | Suggested path                                   | Notes                               |
| ---------- | -------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| STUB_ADDED | `/troubleshooting/map-generation-and-ocean-issues` | Correct vs incorrect map start comparison | `/public/images/troubleshooting/map-generation/` | Page includes planned filename slot |
| STUB_ADDED | `/troubleshooting/missing-recipe-and-mod-settings` | Mod setting mismatch example              | `/public/images/troubleshooting/mod-settings/`   | Page includes planned filename slot |

## P1 - Progression clarity

| Status | Doc page                                     | Screenshot needed                      | Suggested path                                  | Notes                             |
| ------ | -------------------------------------------- | -------------------------------------- | ----------------------------------------------- | --------------------------------- |
| TODO   | `/guides/processing/early-power`             | Stable early power block               | `/public/images/guides/processing/early-power/` | Label fuel input and steam output |
| TODO   | `/guides/processing/filtration`              | Filtration flow with byproduct routing | `/public/images/guides/processing/filtration/`  | Show overflow handling            |
| TODO   | `/guides/progression/progression-milestones` | Milestone base snapshot per stage      | `/public/images/guides/progression/milestones/` | One screenshot per milestone      |
| TODO   | `/guides/logistics/rails-and-city-blocks`    | First rail outpost / block interface   | `/public/images/guides/logistics/rails/`        | Mark train IO points              |

## P2 - Optimization and community

| Status | Doc page                                 | Screenshot needed              | Suggested path                            | Notes                            |
| ------ | ---------------------------------------- | ------------------------------ | ----------------------------------------- | -------------------------------- |
| TODO   | `/guides/performance/ups-and-throughput` | Before/after optimization area | `/public/images/guides/performance/ups/`  | Keep viewport and zoom identical |
| TODO   | `/community/factory-tours`               | Annotated factory overview     | `/public/images/community/factory-tours/` | Add callouts for key subsystems  |

## Reusable capture checklist

Copy this block when adding a new screenshot task:

```md
- [ ] Page:
  - Shot goal:
  - In-game location/save:
  - Version:
  - Target file:
  - Captured by:
  - Used in page:
```

## Maintenance notes

- Remove or archive shots when recipe chains or UI change significantly.
- Keep at most 1-2 "hero" screenshots per page; use diagrams/tables for dense logic.
- If a screenshot cannot clearly communicate a flow, prefer a small process diagram instead.

Last reviewed: 2026-03-16
