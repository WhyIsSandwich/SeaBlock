# Liquids and Gases Progression

Liquids and gases are a common mid-game wall in Sea Block. This page focuses on practical progression, not exhaustive chemistry references.

## Read this if...

- Your base has frequent fluid starvation or deadlocks.
- You unlocked many fluid recipes but cannot keep chains stable.
- You need a simple order for scaling liquid and gas infrastructure.

## Practical progression order

1. Build a baseline fluid bus for the most-used intermediates.
2. Stabilize sulfur/acid-adjacent chains needed by your immediate science goals.
3. Add hydrogen/oxygen handling with explicit overflow behavior.
4. Expand into higher-tier fluid products only after core demand is stable.

## Core design rules

- Keep dedicated production for high-demand utility fluids.
- Add overflow paths or sinks for any fluid that can saturate and stall upstream.
- Avoid mixing prototype and production fluid blocks in the same network.
- Label fluid interfaces clearly if multiple areas share supply.

## Typical failure signatures

| Symptom                               | Likely cause                 | First fix                                         |
| ------------------------------------- | ---------------------------- | ------------------------------------------------- |
| Entire chain stalls at random         | Byproduct has no exit path   | Add overflow handling for blocked fluid           |
| One science ingredient always missing | Shared utility fluid starved | Prioritise critical consumers from bulk consumers |
| Too many new fluid recipes recipes    | Struggling to route fluids   | Try and contain processes in a block if needed    |

## Where to go next

- [Filtration](/guides/processing/filtration)
- [Smelting](/guides/processing/smelting)
- [Mid Game Guide](/guides/mid-game)

## Sources and attribution

Last verified: 2026-03-16

- SeaBlock in-repo documentation and linked project pages.
