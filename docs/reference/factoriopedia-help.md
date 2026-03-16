# Factoriopedia Help

The Factoriopedia is an in-game encyclopedia that provides detailed information about items, recipes, and technologies in SeaBlock. The web version mirrors the same core browsing workflow, but some controls or data presentation may differ from the in-game UI depending on export/version state.

## Scope and version note

- This page describes the current web Factoriopedia behavior in this repository.
- Treat in-game behavior as canonical when differences appear.

## Features

- **Item Browser**: Browse all items in a grid layout with category filters
- **Detailed Information**: View comprehensive details about each item including:
  - Basic properties (stack size, fuel value, etc.)
  - Sources (where the item can be obtained)
  - Usage (what recipes use this item)
  - Alternative recipes
- **Recipe Information**: Detailed recipe breakdowns with ingredients, crafting time, and required buildings
- **Navigation**: Use URL hash parameters to link directly to specific items

## Usage

- Click on any item in the left panel to view its details
- Use the category filters at the top to narrow down items
- The URL will update automatically, allowing you to bookmark or share specific items
- Use the search functionality to quickly find items by name

## URL Parameters

- `#item=<item-name>` - Direct link to a specific item
- `#category=<category-name>` - Filter by item category
