# Install and Version Mismatch

This page covers startup failures and "it loads, but Seablock behavior is wrong" reports caused by version or pack mismatch.

## Read this if...

- SeaBlock does not appear in expected new-game flow.
- Settings or startup options do not match guide screenshots.
- Recipe sets look partially vanilla or internally inconsistent.

## 5-minute diagnosis flow

1. Confirm game version and SeaBlock pack version target official 2.0.
2. Confirm dependency set from Mod Portal/pack source is complete.
3. Create a clean test profile with only pack-required mods.
4. Launch and check whether expected startup flow is now consistent.

## Readiness checks

- You have backups of saves and mod folders.
- You can isolate to a clean profile (no old overrides).
- You have a known-good source for official pack dependencies.

## Decision table

| Situation | Recommended action | Why |
| --- | --- | --- |
| New save behavior is clearly wrong | Rebuild mod set from known-good source | Fastest way to remove hidden drift |
| Existing save fails after upgrade | Validate with clean profile first | Distinguishes save issue from install issue |
| Optional mods are already enabled | Disable all optional mods during diagnosis | Reduces variables |
| You are migrating from 1.1 expectations | Review 2.0 delta page before debugging recipes | Avoids chasing non-bugs |

## Failure signatures

| Symptom | Likely cause | First fix |
| --- | --- | --- |
| Missing expected startup settings | Wrong branch/version mix | Reinstall pack for official 2.0 target |
| Recipe behavior inconsistent across machines | Profile drift or conflicting optional mod | Use clean profile and reintroduce mods one at a time |
| Save loads but progression logic feels broken | Legacy assumptions from older versions | Re-validate against 2.0 guides and migration notes |

## Recovery path

- Back up saves.
- Rebuild the mod set from a known-good list.
- Launch once to validate startup logs and menu behavior.
- Only then reintroduce optional quality-of-life mods.

## 2.0 notes

- Base game 2.0 inheritance can change behavior compared to old guide content even when install is correct.
- Do not treat old 1.1 screenshots as authoritative for current startup flow.

## Common mistakes

- Mixing instructions across different major versions.
- Assuming older save compatibility without migration steps.
- Testing with many optional mods before baseline is stable.

## Related pages

- [Significant Changes in SeaBlock 2.0](/reference/significant-changes-2-0)
- [Reference: Migration 1.1 to 2.0](/reference/migration-1.1-to-2.0)
- [Troubleshooting index](/troubleshooting/)
- [Getting Started: Installation](/getting-started/installation)

## Sources and attribution

Last verified: 2026-03-14

- [Sea Block FAQ (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/faq)
- [Sea Block changelog (Mod Portal)](https://mods.factorio.com/mod/SeaBlock/changelog)
- [Sea Block Pack forum thread](https://forums.factorio.com/viewtopic.php?t=93136)
