# Science Bottleneck Playbook

Use this page when science progression stalls and you need to identify the next true blocker quickly.

## Read this if...

- Red or green science starts but never reaches sustained throughput.
- You are rebuilding random chains without clear improvement.
- You need stage-by-stage "fix first" priorities.

## Red science bottlenecks

| Symptom                      | Likely bottleneck        | Fix first                                               |
| ---------------------------- | ------------------------ | ------------------------------------------------------- |
| Lab idle bursts              | Fuel instability         | Stabilize algae/charcoal chain before adding assemblers |
| Plate starvation             | Underbuilt ore loop      | Expand electrolysis -> slag -> mineralized water chain  |
| Frequent manual intervention | No basic automation path | Prioritize inserters/assemblers over expansion          |

## Green science bottlenecks

| Symptom                               | Likely bottleneck         | Fix first                                      |
| ------------------------------------- | ------------------------- | ---------------------------------------------- |
| Electronics chain keeps stopping      | Secondary metal gaps      | Stabilize tin/lead and solder support chains   |
| Throughput collapses during expansion | Landfill/power contention | Split expansion supplies from science supplies |
| Constant recipe mismatch confusion    | Version/settings drift    | Validate 2.0 assumptions before redesign       |

## Blue+ transition bottlenecks

| Symptom                                   | Likely bottleneck     | Fix first                                                                                      |
| ----------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| Many partial chains, low output           | Overparallelization   | Pick one science ingredient chain at a time                                                    |
| Systems back up                           | No overflow strategy  | Add controlled sinks/priority handling                                                         |
| Understand recipes, can't route materials | Logistics constraints | Tackle high throughput items/fluids first, moving items by hand is always an option for a time |

## Diagnostic loop (15 minutes)

1. Pick one stalled science pack.
2. Trace ingredients backward to the first sustained starvation point.
3. Fix only that chain until stable for 5-10 minutes.
4. Repeat for the next blocker.

## Related pages

- [Progression Milestones](/guides/progression/progression-milestones)
- [Early Game Guide](/guides/early-game)
- [Mid Game Guide](/guides/mid-game)
- [Troubleshooting: Missing Recipe and Mod Settings](/troubleshooting/missing-recipe-and-mod-settings)

## Sources and attribution

Last verified: 2026-03-16

- SeaBlock in-repo documentation and linked project pages.
