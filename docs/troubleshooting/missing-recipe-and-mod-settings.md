# Missing Recipe and Mod Settings

Use this checklist when a recipe expected from a guide does not appear, or when progression appears blocked by hidden setting assumptions.

## Read this if...

- A guide recipe does not exist in your current run.
- Tech is researched but expected recipe/building is still missing.
- Two players have different recipe results with "same" setup.

## Readiness checks

Before changing your base:

1. Confirm your game + pack are official 2.0 target.
2. Confirm exact recipe/tech names (tier naming matters).
3. Confirm startup settings and whether they require new-save application.
4. Confirm optional mods are not altering the chain.

## Decision table

| Situation | Recommended action | Why |
| --- | --- | --- |
| Recipe missing in one save only | Test in clean sandbox with same settings | Isolates save-specific drift |
| Recipe missing for all saves in profile | Check version and startup settings first | Most common root cause |
| Guide and game disagree on ingredient | Treat guide as version-specific and verify in-game recipe | Prevents chasing stale documentation |
| Recipe appears after new save only | Startup setting changed but not retroactive | Expected behavior in many mod setups |

## Fast diagnosis pattern

- Reproduce in a minimal sandbox save.
- Check one recipe chain end-to-end from raw input to final unlock.
- Compare behavior before and after setting changes.

## Failure signatures

| Symptom | Likely cause | First fix |
| --- | --- | --- |
| Tech researched but recipe still absent | Hidden prerequisite or wrong branch assumption | Validate prereq chain in current 2.0 tech tree |
| Recipe names differ from guide | Guide targets older version | Use 2.0 references and migration notes |
| Recipe appears after profile reset | Optional mod or stale setting conflict | Reintroduce mods/settings one at a time |

## 2.0 notes

- Several chains differ from 1.1 assumptions; use [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0) as first context.
- Stone normalization and other chain updates can make old recipe expectations look "missing."

## Common mistakes

- Following old screenshots without version context.
- Forgetting that some options apply only on new game creation.
- Expecting hidden byproducts or loops to self-balance automatically.

## Related pages

- [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0)
- [Reference: FAQ and Short Notes](/reference/faq-short-notes)
- [Reference: Compatible Mods](/reference/compatible-mods)
- [Troubleshooting index](/troubleshooting/)

## Sources and attribution

Last verified: 2026-03-14

- [Sea Block FAQ (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/faq)
- [Sea Block discussion index (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/discussion/g)
- [FAQ and Short Notes (Fandom)](https://seablock.fandom.com/wiki/FAQ_and_Short_Notes)
