# Compatible Mods

This page lists practical compatibility guidance for SeaBlock 2.0.

## Read this if...

- You want to add quality-of-life mods safely.
- You are not sure whether a mod is compatible, risky, or likely to break progression.
- You need a repeatable test process before committing a long run.

## Compatibility policy (2.0 practical)

- Prefer mods that are visual, UI, or workflow-only.
- Be cautious with mods that alter recipes, technologies, or map generation.
- Test optional mods on a fresh sandbox before adding them to a long run.

## Decision table

| Mod category | 2.0 compatibility expectation | Recommendation |
| --- | --- | --- |
| UI and planner helpers | Usually safe | Safe with quick smoke test |
| Build QoL (movement, placement helpers) | Often safe | Add one at a time |
| Performance diagnostics | Usually safe | Recommended for large runs |
| Recipe/progression overhauls | High conflict risk | Avoid unless explicitly documented compatible |
| Map generation/world behavior changes | High conflict risk | Avoid for standard SeaBlock experience |

## Commonly used categories

- **UI and planning:** calculators, recipe browsers, production planners.
- **Quality of life:** movement, inventory management, blueprint helpers.
- **Performance visibility:** tools for diagnosing UPS bottlenecks.

## High-risk categories

- Recipe or progression overhauls.
- World generation changes that conflict with SeaBlock assumptions.
- Balance-altering mods that invalidate guide expectations.

## Before adding any mod

1. Snapshot your save.
2. Add one mod at a time.
3. Verify critical chains (power, ore, circuits, science).
4. Keep notes so rollback is easy.

## Failure signatures

| Symptom | Likely cause | First fix |
| --- | --- | --- |
| Missing/changed recipes after adding mod | Progression/recipe conflict | Remove mod and retest in clean profile |
| Map start feels non-SeaBlock | World generation conflict | Disable map-affecting mod and create new test map |
| Different behavior between saves | Startup setting or mod load-order drift | Rebuild profile from known-good set |

## 2.0 notes

- Base 2.0 inheritance changed several systems, so old “safe mod” lists are not always current.
- Treat any pre-2.0 compatibility advice as provisional unless recently verified.

## Related pages

- [Calculators and Planners](/reference/calculators-and-planners)
- [Troubleshooting: Missing recipe and mod settings](/troubleshooting/missing-recipe-and-mod-settings)
- [Reference: Migration 1.1 to 2.0](/reference/migration-1.1-to-2.0)
- [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0)

## Sources and attribution

Last verified: 2026-03-14

- [Sea Block dependencies (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/dependencies)
- [Sea Block FAQ (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/faq)
- [Compatible Mods (Fandom)](https://seablock.fandom.com/wiki/Compatible_Mods)
