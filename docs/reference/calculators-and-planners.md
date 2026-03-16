# Calculators and Planners

Planning tools are optional, but they dramatically reduce trial-and-error in SeaBlock's multi-output chains.

## Read this if...

- You are stuck choosing between Helmod, YAFC/Foreman-style tools, or recipe browser helpers.
- You keep reworking chain ratios after each tech unlock.
- Circular/byproduct chains are confusing your plan.

## Which tool should I use?

- **Helmod:** in-game planning, popular for iterative build design.
- **YAFC / Foreman-style tools:** external, strong for larger dependency trees.
- **Recipe browser helpers (for example FNEI-like workflows):** best for quick lookup and unlock tracing.

## Tool selection table

| Tool style | Strength | Weakness | Best use case |
| --- | --- | --- | --- |
| Helmod (in-game) | Fast iteration while building | Can be confusing with loops/byproducts | Active layout tuning |
| External planners | Broad dependency visibility | Context switch out of game | High-level production planning |
| Recipe browsers | Quick unlock tracing | Limited throughput planning | "Why is this recipe missing?" checks |

## Recommended workflow

1. Pick one primary planner for your run.
2. Model one chain at a time (power, ores, circuits, science).
3. Keep assumptions explicit: target throughput, byproduct policy, and fuel policy.
4. Recompute after each major tech milestone.

## Worked planning pattern (low spoiler)

1. Start with one blocker output (for example a current science input).
2. Walk backward to raw inputs using one planning tool only.
3. Mark byproducts as consumed, buffered, or overflow-handled.
4. Build a pilot block in-game and compare reality vs plan.
5. Update the plan with observed bottlenecks before scaling.

## Circular and byproduct-heavy chains

- Solve loops with explicit recycle priorities.
- Track sink policies for overflow products.
- Validate model assumptions against actual in-game bottlenecks.

## Failure signatures

| Symptom | Likely cause | First fix |
| --- | --- | --- |
| Planner says stable, base still stalls | Unmodeled byproduct or fuel dependency | Add explicit byproduct/fuel policy to the model |
| Constantly changing machine counts | Planning against moving targets | Lock one milestone scope before recomputing |
| Different numbers across tools | Different defaults/assumptions | Choose one source of truth and align settings |

## 2.0 notes

- Rebuild saved templates from older versions if they relied on changed recipes/chains.
- Validate old planner assumptions against current in-game recipe definitions.

## Common mistakes

- Chasing perfect ratios before confirming practical logistics.
- Mixing multiple tools without a single source of truth.
- Forgetting to update models after major recipe unlocks.

## Related pages

- [Helmod Guide](/guides/calculators/helmod)
- [Filtration](/guides/processing/filtration)
- [Power Progression](/guides/power/power-progression)
- [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0)

## Sources and attribution

Last verified: 2026-03-14

- [Helmod Calculator (Fandom)](https://seablock.fandom.com/wiki/Helmod_Calculator)
- [YAFC Calculator (Fandom)](https://seablock.fandom.com/wiki/YAFC_Calculator)
- [Pencil and Paper Calculator (Fandom)](https://seablock.fandom.com/wiki/Pencil_and_Paper_Calculator)
