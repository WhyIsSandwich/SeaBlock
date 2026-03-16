# Wiki TODO and Wanted Pages

This page tracks high-value documentation gaps and the implementation order for contributors.

> Contributor page: this is a maintenance roadmap, not a gameplay troubleshooting page.
> If you are looking for player guidance, start at [Reference](/reference/) or [Troubleshooting](/troubleshooting/).

## Gap matrix (legacy + community + current docs)

| Topic class | Legacy Fandom coverage | Current docs coverage | Community demand signal | Status |
| --- | --- | --- | --- | --- |
| Early power | Yes | Partial | High | Planned |
| Filtration flow | Yes | Partial | High | Planned |
| Smelting transitions | Yes | Partial | High | Planned |
| FAQ short answers | Yes | Minimal | High | Planned |
| Mod compatibility | Yes | Minimal | Medium/High | Planned |
| Migration guidance | Partial | Minimal | High | Planned |
| Troubleshooting hub | Minimal | Missing | High | Planned |
| Progression map | Minimal | Missing | Medium/High | Planned |
| Performance/UPS notes | Yes | Missing | Medium/High | Planned |
| Factory tours | Yes | Missing | Medium | Planned |

## Candidate page backlog

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

## Source quality notes

- Prioritize official 2.0 sources first (Mod Portal changelog/FAQ/discussions, release notes).
- Use Fandom for legacy structure and topic discovery.
- Use Reddit for practical pain points and examples, not as sole canonical source.
