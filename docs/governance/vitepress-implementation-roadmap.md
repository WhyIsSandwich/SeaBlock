# VitePress Implementation Roadmap

This roadmap tracks parity and enhancement work for the wiki platform's VitePress/browser-renderer implementation.

## Document Control

- **Audience**: Platform maintainers and developers (Track B)
- **Owner area**: DocsUI and Runtime maintainers
- **Target location**: `docs/governance` (under `docs/`)
- **Review cadence**: Monthly or after renderer architecture changes

## Current Status

- Core feature parity target is largely met.
- Remaining work is concentrated in lower-priority parity and developer-convenience items.

## Active Backlog

### High Priority

- Keep alert, math, Vue integration, and link/image processing behavior stable as dependencies evolve.
- Add tests for regression-prone markdown rendering paths.

### Medium Priority

- Expand advanced directive support (`v-if`, `v-for`, `v-show`, `v-model`, event handlers, dynamic bindings).
- Improve CSS preprocessor and authoring ergonomics where needed.
- Continue optimization for large document rendering and hydration behavior.

### Low Priority

- Evaluate advanced YAML/frontmatter support replacement.
- Expand theme/language support where it improves SeaBlock docs quality.
- Consider async markdown pipeline adoption only when measurable value is demonstrated.

## Validation

- `npm run lint`
- `npm run build`
- Manual verification against representative docs pages with custom markdown/Vue blocks

