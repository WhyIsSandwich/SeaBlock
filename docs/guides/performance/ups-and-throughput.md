# UPS and Throughput

Late-game success is not only "can it run", but "can it run fast enough to remain playable."

## Read this if...

- Your save is playable but gets slower each expansion.
- You are unsure whether bottleneck is throughput, UPS, or both.
- You need a practical triage order instead of broad optimization advice.

## Problem

Throughput strategies that work at low scale can become UPS-heavy at megabase scale, especially when many fluid and train systems are added without performance boundaries.

## UPS triage workflow

1. Record baseline UPS during steady-state operation.
2. Isolate one suspected subsystem (power, fluids, rail, combinators, etc.).
3. Measure change after one targeted fix.
4. Keep only fixes with measurable benefit.
5. Repeat before scaling further.

## Practical metrics

- Stable UPS under normal operation.
- Headroom under burst demand (science spikes, expansion, combat).
- Pipe and rail congestion visibility.

## Decision table

| Situation | Recommended action | Why |
| --- | --- | --- |
| UPS drops after adding one large subsystem | Profile that subsystem before global changes | Fastest route to root cause |
| Throughput is fine but UPS is poor | Favor simpler/logically cheaper designs over denser complexity | Better runtime characteristics |
| UPS is stable but throughput lags | Optimize throughput path first | No need for UPS sacrifices yet |
| Late game has both throughput and UPS pain | Set explicit performance budget per expansion | Prevents runaway regressions |

## Failure signatures

| Symptom | Likely cause | First fix |
| --- | --- | --- |
| UPS drops with each new train district | Station/network complexity growth | Simplify station policies and route logic |
| UPS drops after fluid megascale | Long high-volume fluid paths | Localize processing and shorten critical fluid routes |
| Frequent stutter during expansions | No pre-expansion performance budget | Add checkpoints before major build waves |

## 2.0 notes

- Beacon/module behavior inheritance from 2.0 can shift optimal late-game design choices.
- Re-test old "best practices" from 1.1-era megabases before adopting them at scale.

## Performance-first patterns

- Prefer modular designs that are easy to profile and duplicate.
- Keep high-volume fluid paths short and intentional.
- Avoid uncontrolled combinator or logistics sprawl.
- Replace legacy low-efficiency sections instead of endlessly patching them.

## Common Mistakes

- Scaling every system simultaneously.
- Optimizing for elegance over measurable bottlenecks.
- Ignoring profiling until UPS is already low.

## Related pages

- [Power Progression](/guides/power/power-progression)
- [Rails and City Blocks](/guides/logistics/rails-and-city-blocks)
- [Factory Tours](/community/factory-tours)
- [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0)

## Sources and attribution

Last verified: 2026-03-14

- [UPS and Computer Speed Considerations (Fandom)](https://seablock.fandom.com/wiki/UPS_and_Computer_Speed_Considerations)
- [Warehouse vs chests UPS testing (r/Seablock)](https://www.reddit.com/r/Seablock/comments/14kllvp/warehouse_vs_chests_ups_testing/)
- [Warehouses vs chests megabase case study (r/Seablock)](https://www.reddit.com/r/Seablock/comments/14y66m2/warehouses_vs_chests_megabase_case_study/)
