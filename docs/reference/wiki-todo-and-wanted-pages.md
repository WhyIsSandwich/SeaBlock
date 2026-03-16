# Wiki TODO and Wanted Pages

This page tracks high-value documentation gaps and the implementation order for contributors.

> Contributor page: this is a maintenance roadmap, not a gameplay troubleshooting page.
> If you are looking for player guidance, start at [Reference](/reference/) or [Troubleshooting](/troubleshooting/).

## Gap matrix (legacy + community + current docs)

| Topic class | Legacy Fandom coverage | Current docs coverage | Community demand signal | Status |
| --- | --- | --- | --- | --- |
| Early power | Yes | Available | High | Published |
| Filtration flow | Yes | Available | High | Published |
| Smelting transitions | Yes | Available | High | Published |
| FAQ short answers | Yes | Available | High | Published |
| Mod compatibility | Yes | Available | Medium/High | Published |
| Migration guidance | Partial | Available | High | Published |
| Troubleshooting hub | Minimal | Available | High | Published |
| Progression map | Minimal | Available | Medium/High | Published |
| Performance/UPS notes | Yes | Available | Medium/High | Published |
| Factory tours | Yes | Seeded | Medium | Published (seed content) |

## Candidate page backlog

Most original P0/P1 gaps in this backlog are now published. Treat this table as enhancement follow-up, not missing-page triage.

| Priority | Directory | Page | Source leverage | Rationale |
| --- | --- | --- | --- | --- |
| P0 | `docs/guides/processing` | `early-power.md` | Fandom + Reddit | Early blocker |
| P0 | `docs/guides/processing` | `filtration.md` | Fandom + existing guide context | Core progression |
| P0 | `docs/guides/processing` | `smelting.md` | Fandom + existing guide context | Throughput transition |
| P0 | `docs/guides/power` | `power-progression.md` | Fandom + Reddit | Tier roadmap |
| P0 | `docs/troubleshooting` | `index.md` | Reddit support patterns | Support landing page |
| P0 | `docs/troubleshooting` | `install-and-version-mismatch.md` | Reddit version threads | Onboarding failures |
| P0 | `docs/troubleshooting` | `missing-recipe-and-mod-settings.md` | Reddit recipe threads | Frequent blocker |
| P0 | `docs/troubleshooting` | `map-generation-and-ocean-issues.md` | Reddit map threads | Invalid starts |
| P0 | `docs/reference` | `faq-short-notes.md` | Legacy FAQ style | Fast answers |
| P1 | `docs/reference` | `compatible-mods.md` | Legacy mod pages + Reddit | Stability |
| P1 | `docs/reference` | `calculators-and-planners.md` | Fandom tool pages + in-repo Helmod page | Planner onboarding |
| P1 | `docs/guides/progression` | `progression-milestones.md` | Mature wiki progression models | Navigation clarity |
| P1 | `docs/guides/bio` | `bio-science-and-arboretum.md` | Reddit + guide lineage | Mid-game wall |
| P1 | `docs/guides/logistics` | `rails-and-city-blocks.md` | Reddit recurring questions | Scale-up hurdle |
| P1 | `docs/guides/performance` | `ups-and-throughput.md` | Legacy UPS notes + postmortems | Retention |
| P2 | `docs/community` | `factory-tours.md` | Legacy tours + curated showcases | Inspiration |
| P2 | `docs/reference` | `migration-1.1-to-2.0.md` | Reddit migration + breaking changes | Lifecycle support |
| P2 | `docs/reference` | `wiki-todo-and-wanted-pages.md` | Factorio-style wanted pages model | Sustain contributions |

## Content sourcing workflow

Use this workflow when creating or revising pages:

1. Gather canonical framing from legacy SeaBlock wiki pages.
2. Gather 2-5 practical examples from community discussions.
3. Reconcile with current in-repo docs to avoid duplication.
4. Write using the standard structure: `Problem -> Milestones -> Build patterns -> Common mistakes -> Links`.
5. Add a short attribution section naming source categories.

## Phased delivery

- **Phase 1 (P0):** processing trilogy, troubleshooting hub, FAQ.
- **Phase 2 (P1):** progression, bio, logistics, performance, planners/mods.
- **Phase 3 (P2):** factory tours, migration guidance, ongoing wanted-page maintenance.

## Contributor notes

- Prefer improving an existing page over creating duplicate topic pages.
- Keep version assumptions explicit when referencing old sources.
- When in doubt, optimize for newcomer clarity and troubleshooting speed.

## Cleanup candidates (reviewed pages)

| Page | Current role | Owner | Decision note |
| --- | --- | --- | --- |
| `docs/building-example.md` | Component/example showcase | Docs maintainers | Keep temporarily; remove or relocate if not referenced by contributor workflows. |
| `docs/tooltip-example.md` | Component/example showcase | Docs maintainers | Keep temporarily; remove if no active docs QA/testing use. |
| `docs/reference/factoriopedia-help.md` | Specialized help page with custom layout | Docs maintainers | Keep for now; reassess discoverability and scope during next reference pass. |

## Source quality notes

- Prioritize official 2.0 sources first (Mod Portal changelog/FAQ/discussions, release notes).
- Use Fandom for legacy structure and topic discovery.
- Use Reddit for practical pain points and examples, not as sole canonical source.

## Sources and attribution

Last verified: 2026-03-16

- SeaBlock in-repo documentation and linked project pages.
- Official Sea Block mod portal resources and community references, where applicable.
