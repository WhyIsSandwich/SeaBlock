# Power Progression

Power progression is one of the strongest predictors of whether a run feels stable or constantly on fire.

## Read this if...

- You keep firefighting brownouts after every new production block.
- Your base only works when manual fuel babysitting is active.
- You are not sure when to cut over from one fuel tier to the next in 2.0.

## Problem

Each power tier can look "enough" in isolation, but base growth quickly outpaces it. Delayed transitions usually trigger emergency expansions that increase complexity and UPS cost.

## Readiness checks

Before moving to the next tier, confirm all of these:

1. Your current grid has headroom under normal production and construction bursts.
2. Fuel input is automated end-to-end (not hand-fed at critical points).
3. You have a rollback path (old power block stays online during cutover).
4. New tier raw inputs are stable for at least one science cycle.

## Tier sequence (2.0 planning)

1. **Wind + manual fuel**: startup only.
2. **Algae + charcoal**: first stable automated loop.
3. **Solid-fuel-assisted chemistry path**: stronger mid-game bridge.
4. **Bean/high-output systems**: large mid-to-late scaling.
5. **Nuclear/thorium + beacon/module-aware balancing**: late-game stability and UPS control.

## Decision table

| Situation | Recommended action | Why |
| --- | --- | --- |
| Brownouts happen whenever new smelting/chem blocks turn on | Add modular algae/charcoal capacity first | Fastest low-risk stabilization |
| Fuel lines are stable but power still saturates | Move to stronger fuel tier | Input reliability is already solved |
| New tier depends on fragile fluid logistics | Delay full cutover and run hybrid grid | Avoids total-grid failure |
| Late-game scaling is UPS-limited | Evaluate nuclear/thorium + module/beacon tradeoffs | Better long-run performance planning |

## Failure signatures

| Symptom | Likely cause | First fix |
| --- | --- | --- |
| Power graph sawtooths repeatedly | Fuel buffer too small or fuel chain starvation | Add buffers at fuel conversion and generator inputs |
| Grid collapses after cutover | Old tier removed before new tier stabilized | Re-enable old tier and cut over in smaller slices |
| Fuel production scales but net power barely rises | Conversion bottleneck or wrong recipe tier in chain | Trace the chain step-by-step and fix the lowest-throughput stage |

## 2.0 notes

- Base game 2.0 beacon/module behavior affects late power economics and footprint decisions.
- Some module ecosystem options are broader in 2.0-era setups; validate assumptions before mass rollout.

## Build patterns

- Set explicit upgrade triggers (utilization/headroom checkpoints).
- Keep old power as fallback during cutovers.
- Monitor fuel chain inputs before adding generation capacity.
- Build independent expansion modules to reduce risk during upgrades.

## Common mistakes

- Removing previous generation before validating the replacement.
- Scaling power without scaling water/fuel/logistics supply.
- Ignoring UPS implications in very large late-game plants.

## Related pages

- [Early Power](/guides/processing/early-power)
- [Filtration](/guides/processing/filtration)
- [Performance: UPS and Throughput](/guides/performance/ups-and-throughput)
- [Troubleshooting](/troubleshooting/)
- [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0)

## Sources and attribution

Last verified: 2026-03-14

- [Guides:Early Power (Fandom)](https://seablock.fandom.com/wiki/Guides:Early_Power)
- [Sea Block changelog (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/changelog)
- [UPS and Computer Speed Considerations (Fandom)](https://seablock.fandom.com/wiki/UPS_and_Computer_Speed_Considerations)
