# Editing Guidelines

This document is the canonical writing and markdown standard for SeaBlock documentation content.

## Document Control

- **Owner area**: Documentation maintainers
- **Review cadence**: Monthly, or before major content migrations
- **Compliance rule**: New/updated docs under `docs/` must satisfy the quality checklist in this file.

## Scope

- Applies to all content under `docs/`.
- Supersedes prior fragmented baseline guidance when conflicts exist.

## Content Standards

- Write for players first: practical, testable, and progression-aware guidance.
- Prefer concise, imperative steps in guides ("Build X", "Verify Y").
- Keep terminology consistent with in-game names and prototype names where relevant.
- Use one primary objective per page; move deep references into dedicated reference pages.

## Page Structure

- Include one `#` title per page.
- Use predictable section ordering where applicable:
  1. Goal/Outcome
  2. Requirements or prerequisites
  3. Step-by-step instructions
  4. Validation/checks
  5. Related links
- Keep heading depth shallow (`##`/`###`) unless complexity requires more.

## Markdown Conventions

- Use fenced code blocks with language identifiers.
- Prefer relative wiki links (`/path/`) for internal navigation.
- Add meaningful alt text for images.
- Use tables only when they improve scanability over lists.
- Avoid raw HTML unless no markdown equivalent exists.
- Avoid novelty formatting that reduces readability (marquee, excessive inline styles, etc.).

## Attribution Policy

- Reviewed non-index pages must include a `## Sources and attribution` section.
- Keep attribution concise and maintain a `Last verified:` date when source links are present.
- Use specific source links where available (Mod Portal, release notes, wiki lineage, community references).
- Exception: Factoriopedia helper pages that use a custom layout may use a different source-note format.

## Naming and Assets

- Use kebab-case file names for markdown pages.
- Place images in stable, topic-specific folders under `docs/public/` when shared.
- Reference images with predictable paths and descriptive names (e.g., `ore-processing-layout.png`).

## Frontmatter

- Use frontmatter for metadata when available:
  - `title`
  - `description`
  - `tags` (optional)
- Keep frontmatter minimal and accurate; remove stale tags/descriptions.

## Quality Checklist (Before PR)

- Page renders correctly in VitePress local preview.
- Heading hierarchy is valid and navigable.
- Internal links resolve.
- Images render with useful alt text.
- Instructions are reproducible with current SeaBlock/Factorio context.
- No placeholder text remains.
- Attribution policy requirements are satisfied for reviewed non-index pages.

## Minimum Acceptance Criteria

- A docs PR is not ready for merge if any quality checklist item is unmet.
- Deprecated pages must be replaced with canonical links before removal.
- New style conventions should be added here first, then referenced from contributor-facing pages.

## Editorial Review Policy

- Prefer updates to existing canonical pages over creating duplicates.
- For major rewrites, keep scope in one PR and include a short rationale in the PR body.
- If behavior or data assumptions depend on scripts/runtime, link relevant source files.

## Source Notes

These guidelines consolidate prior guidance into a single canonical standard.

## Sources and attribution

Last verified: 2026-03-16

- SeaBlock in-repo documentation and linked project pages.
- Official Sea Block mod portal resources and community references, where applicable.
