# Migration 1.1 to 2.0

This page is the action checklist for migrating 1.1 expectations and saves to SeaBlock 2.0.

For the canonical change summary, start with [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0).

## Read this if...

- You have 1.1-era blueprints/layouts and want to reuse them.
- A migrated save loads but key chains stop or underperform.
- You need to decide whether to migrate a save or start fresh.

## Migration paths

| Path | Best for | Risk level | Recommendation |
| --- | --- | --- | --- |
| Fresh 2.0 run | Most players | Low | Preferred for clean progression and fewer hidden breakpoints. |
| Partial migration (design ideas only) | Experienced players | Medium | Rebuild systems using old designs as references, not direct copies. |
| Direct save migration | Advanced troubleshooting users | High | Only if you accept substantial diagnosis and selective rebuild work. |

## Readiness checks

Before opening old saves or porting old designs:

1. Back up saves and mod directories.
2. Record current mod list and startup settings.
3. Confirm game and pack versions are the intended 2.0 combination.
4. Identify which systems are safe to rebuild first (power, ore, circuits, science).
5. Review [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0) and mark impacted chains.

## Migration matrix

| Old setup class | 2.0 break risk | Verify first | Rebuild priority |
| --- | --- | --- | --- |
| Crushed-stone-centric chains | High | Stone inputs now required where crushed stone was used before. | High |
| 1.1 beacon/module assumptions | Medium/High | Throughput and optimization behavior under 2.0 inheritance. | High |
| Old petrochem/blue algae assumptions | Medium | Check updated flow complexity and intermediates. | Medium |
| Legacy power transition thresholds | Medium | Recheck scaling triggers for current power paths. | Medium |
| Rail/city block topology | Low/Medium | Station conventions may still work, recipes may not. | Low |

## Failure signatures

| Symptom | Likely cause | First fix |
| --- | --- | --- |
| Core chain starves after migration | Old recipe assumptions no longer valid | Re-derive the chain from in-game recipe browser for 2.0. |
| Save loads but science progression stalls | Tech unlock/order or ingredient assumptions changed | Rebuild that science slice in an isolated test block. |
| Throughput expectations are wrong | Beacon/module inheritance differences | Re-benchmark one production block before scaling base-wide. |

## 2.0 notes

- Include base Factorio 2.0 inheritance effects in all optimization decisions.
- Some community-reported changes (for example catalyst/tungsten details) remain marked `Verify before release` until final release notes confirm.

## Related pages

- [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0)
- [Breaking Changes](/reference/breaking_changes)
- [Troubleshooting: Install and version mismatch](/troubleshooting/install-and-version-mismatch)
- [Troubleshooting: Missing recipe and mod settings](/troubleshooting/missing-recipe-and-mod-settings)

## Sources and attribution

Last verified: 2026-03-14

- [Sea Block changelog (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/changelog)
- [Sea Block FAQ (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/faq)
- [SeaBlock Wiki (Fandom)](https://seablock.fandom.com/wiki/Breaking_Changes)
