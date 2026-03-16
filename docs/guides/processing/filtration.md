# Filtration

Filtration is where SeaBlock shifts from "any plates are good plates" to deliberate ore targeting.

## Read this if...

- You can produce plates, but not the right plates for your current science goal.
- Byproducts or fluids keep backing up and stopping ore chains.
- You are unsure when to stay simple vs move to more complex sorting tiers.

## Problem

Early direct ore generation is enough to survive, but not enough to scale complex science. Filtration introduces control over ore mix and enables cleaner growth toward sorting tiers.

## Readiness checks

Before adding another filtration/sorting tier:

1. Power has stable headroom during ore spikes.
2. Base metals are already reliable at current demand.
3. You have a clear byproduct policy (consume, store, or void path where valid).
4. Your science blocker is confirmed to be ore selection, not smelting or logistics.

## Milestones

1. **Pre-filtration:** Stabilize slag to basic plate flow.
2. **Filtration unlock:** Add filtration units into mineralized water and sludge routes.
3. **Targeted output:** Prioritize the ore streams blocking your current science target.
4. **Tier expansion:** Move to higher sorting/processing tiers only when demand justifies complexity.

## Decision table

| Situation | Recommended action | Why |
| --- | --- | --- |
| Early progression blocked by one metal | Add targeted filtration for that metal first | Fastest unlock path with minimal complexity |
| Many metals are fluctuating at once | Stabilize one ore family at a time | Easier diagnosis and fewer deadlocks |
| Fluids/byproducts are constantly backing up | Add explicit overflow policy before new tier | New tiers amplify existing deadlocks |
| Demand outgrows current tier repeatedly | Upgrade tier only after bottleneck confirmation | Prevents premature complexity |

## Failure signatures

| Symptom | Likely cause | First fix |
| --- | --- | --- |
| Ore line stalls despite raw input | Byproduct/overflow path blocked | Clear byproduct sink and re-check fluid routing |
| One metal always starves while others overflow | No targeted filtration priority | Split by intended output and prioritize blocker metal |
| Throughput drops after tier upgrade | New tier added without stable support chains | Roll back, validate prerequisites, then reintroduce in slices |

## 2.0 notes

- Recipe and chain assumptions from 1.1 filtration guides are not automatically valid in 2.0.
- If a guide expects crushed stone-specific behavior, verify current stone requirements first.

## Build patterns

- Keep filtration lines **segmented by ore intent** rather than merged too early.
- Put overflow and byproduct handling beside each filtration block.
- Build for observability: each stage should make it easy to inspect starvation or blockage.

## Common Mistakes

- Jumping to high-tier sorting before stable base-metal flow.
- Mixing all fluids without a control policy for priority consumers.
- Ignoring byproduct paths until they deadlock the line.

## Related pages

- [Smelting](/guides/processing/smelting)
- [Power Progression](/guides/power/power-progression)
- [Progression Milestones](/guides/progression/progression-milestones)
- [Reference: Notable Recipes](/reference/recipes)
- [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0)

## Sources and attribution

Last verified: 2026-03-14

- [Guides:Filtration (Fandom)](https://seablock.fandom.com/wiki/Guides:Filtration)
- [Guides:Smelting (Fandom)](https://seablock.fandom.com/wiki/Guides:Smelting)
- [Sea Block changelog (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/changelog)
