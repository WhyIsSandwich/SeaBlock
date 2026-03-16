# Smelting

Smelting in SeaBlock is an upgrade ladder. The goal is not one perfect build, but repeated transitions that preserve throughput while improving efficiency.

## Read this if...

- You are still using starter smelting and cannot keep up with science demand.
- Upgrading one metal keeps breaking another production chain.
- You need a low-risk migration path from temporary smelting to long-term blocks.

## Problem

Many runs stall because early smelting layouts remain in place too long. As ore processing changes, old smelting assumptions become hidden bottlenecks.

## Readiness checks

Before smelting refits:

1. Ore supply is stable enough to test new lines.
2. Power headroom can absorb new furnaces/casters without brownouts.
3. Fuel strategy is explicit (no mixed-fuel guesswork).
4. You can run old and new lines in parallel during cutover.

## Milestones

1. **Starter smelting:** Direct, simple, and temporary.
2. **Metallurgy entry:** Introduce molten or improved chains where they return immediate value.
3. **Secondary metals:** Expand tin/lead and related intermediates for circuit growth.
4. **Refit cycle:** Replace temporary smelting with scalable blocks once logistics and power support it.

## Decision table

| Situation | Recommended action | Why |
| --- | --- | --- |
| Iron/copper are unstable and everything depends on them | Upgrade core base-metal chain first | Largest impact per rebuild hour |
| Circuits block progression | Prioritize tin/lead-supporting smelting path | Unlocks higher circuit tiers faster |
| Frequent redesign fatigue | Keep starter and long-term footprints separate | Enables safe incremental replacement |
| Fuel bottlenecks appear during smelting upgrade | Pause metallurgy expansion and stabilize fuel chain | Smelting throughput is fuel-constrained |

## Failure signatures

| Symptom | Likely cause | First fix |
| --- | --- | --- |
| New smelting block underperforms despite enough ore | Fuel/heat support is undersized | Validate fuel path and inserter/throughput flow first |
| One upgraded metal starves downstream chain | Upgraded in isolation without intermediates support | Add missing intermediate chain before scaling |
| Massive rebuild causes long outage | All-at-once migration | Run parallel old/new blocks and switch in slices |

## 2.0 notes

- Recipe normalization around stone inputs changes old crushed-stone-era assumptions.
- Beacon/module inheritance in 2.0 can change the economics of late smelting upgrades.

## Build patterns

- Separate **starter** and **long-term** smelting footprints.
- Upgrade one metal family at a time to keep troubleshooting manageable.
- Normalize input and output interfaces so block replacement is low-risk.

## Common Mistakes

- Rebuilding every line simultaneously.
- Optimizing for ratios without verifying real demand.
- Treating fuel and heat systems as an afterthought.

## Related pages

- [Filtration](/guides/processing/filtration)
- [Power Progression](/guides/power/power-progression)
- [Progression Milestones](/guides/progression/progression-milestones)
- [Reference: Notable Items](/reference/items)
- [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0)

## Sources and attribution

Last verified: 2026-03-14

- [Guides:Smelting (Fandom)](https://seablock.fandom.com/wiki/Guides:Smelting)
- [Sea Block changelog (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/changelog)
- [Seablock Starter Guide (Reddit)](https://www.reddit.com/r/Seablock/comments/qkxcs3/seablock_starterguide/)
