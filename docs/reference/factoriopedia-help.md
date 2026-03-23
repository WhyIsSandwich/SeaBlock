# Factoriopedia Help

The Factoriopedia is an in-game encyclopedia that provides detailed information about items, recipes, and technologies in SeaBlock. The web version mirrors the same core browsing workflow, but some controls or data presentation may differ from the in-game UI depending on export/version state.

## Scope and version note

- This page describes the current web Factoriopedia behavior in this repository.
- Treat in-game behavior as canonical when differences appear.

## Features

- **Item Browser**: Browse entries in a grid layout with category filters
- **Science pack filter**: Narrow visible recipes by required science (dependencies apply automatically)
- **Search**: Filter the grid by display name, internal id, and light fuzzy matching for typos
- **Show toggles**: Quickly hide or show entries by primary type (recipes, technologies, fluids, tiles, items, entities)
- **Detailed Information**: View details for each selection including statistics and rule-driven sections
- **Recipe Information**: Recipe breakdowns with ingredients, crafting time, and compatible machines where data exists
- **Research map**: When a technology is selected, open **Research map** in the details pane to see the full prerequisite graph (sink-based ranks, hidden technologies omitted)
- **Navigation**: Back/forward and history; URL updates for sharing

## Usage

- Click an icon in the grid to open details
- Use category buttons at the top to switch groups
- Use **Link** in the header to copy the full URL (including browse state) to the clipboard
- Press **?** (outside text fields) for keyboard shortcuts
- When a dataset build timestamp is present in `data.json`, it appears as a small badge in the header

## URL layout

The page uses **two layers**:

1. **Query string** — browse state (filters and search)
2. **Fragment (hash)** — which entry is opened in the details pane

### Query parameters

| Parameter   | Meaning |
| ----------- | ------- |
| `category`  | Active primary category key (e.g. logistics) |
| `science`   | Comma-separated science pack item names (same dependency rules as the UI) |
| `q`         | Search text for the recipe grid |
| `locale`    | Locale code for `locale-<code>.json` when additional locale files are published (currently only English may be available) |

Example (structure only):

`?category=logistics&science=automation-science-pack&q=iron#recipe=iron-plate`

### Fragment (hash)

| Pattern | Selection |
| ------- | --------- |
| `#item=<name>` | Item |
| `#recipe=<name>` | Recipe |
| `#technology=<name>` | Technology |
| `#fluid=<name>` | Fluid |
| `#tile=<name>` | Tile |

Note: `#category=...` is **not** used; use the `category` **query** parameter instead.

## Keyboard shortcuts

| Key | Action |
| --- | ------ |
| ← / → | Previous / next entry in the current filtered grid |
| ↑ / ↓ | Move up / down one row in the grid, keep column intent, and clamp to row end when needed |
| Esc | Close details; if the **research map** modal is open, closes the map first |
| ? | Toggle shortcuts help |

## Wiki deep links

From normal wiki pages you can link to Factoriopedia using a full path plus query and hash, for example:

`/reference/factoriopedia?category=logistics#recipe=iron-plate`

(Adjust the base path if your site uses a different VitePress `base`.)
