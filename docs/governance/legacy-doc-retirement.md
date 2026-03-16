# Legacy Document Retirement

This register tracks migration and safe removal of obsolete guidance/planning docs.

## Document Control

- **Owner area**: Governance maintainers
- **Review cadence**: Per cleanup milestone
- **Purpose**: Ensure legacy docs are removed only after content migration and reference cleanup.

## Retirement Scope

- `basic-markdown-guide.md`
- `advanced-markdown-guide.md`
- `test/editor-implementation-plan.md`
- `test/IMPLEMENTATION_PLAN.md`
- `test/maintenance-checklist.md`

## Migration Map

- `basic-markdown-guide.md` -> `docs/governance/editing-guidelines.md`
- `advanced-markdown-guide.md` -> `docs/governance/editing-guidelines.md`
- `test/editor-implementation-plan.md` -> `docs/governance/roadmap.md`
- `test/IMPLEMENTATION_PLAN.md` -> `docs/governance/architecture-brief.md` and `docs/governance/roadmap.md`
- `test/maintenance-checklist.md` -> `docs/governance/developer-guidelines.md`

## Removal Gates (Must All Pass)

1. Canonical destination documented for each retiring file.
2. Needed content migrated into governance docs.
3. Inbound links and references updated to canonical docs.
4. Repo validation confirms no live links point to retired files.

## Current Status

- Scope inventory: complete
- Migration mapping: complete
- Removal gates: complete for all files in retirement scope
