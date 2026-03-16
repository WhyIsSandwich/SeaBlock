# Effects Processing Audit

This audit records current effect processing entry points, supported shapes, and planned completion areas.

## Entry Points

- Pipeline pass-through: `/scripts/process-factorio-data.js`
  - Preserves raw effect fields (`attack_parameters`, `capsule_action`, nested action/effect trees).
- Runtime parser: `/src/composables/useAttackParametersParser.js`
  - Parses attack and trigger trees into details `statistics` structures.
- Item effect rules: `/src/composables/useDetailsData/itemRules.js`
  - Supports `item.attack_parameters`, `item.capsule_action`, and normalized `item.effect`.
- Entity effect rules: `/src/composables/useDetailsData/entityRules.js`
  - Supports `entity.attack_parameters` and gun-indirect `attack_parameters`.
- Technology effects: `/src/composables/useDetailsData/technologyRules.js`
  - Supports recipe unlock items and non-unlock effect statistics.

## Supported Shapes

- Attack roots:
  - `attack_parameters.ammo_type.action`
  - `attack_parameters.action`
  - `attack_parameters.action_delivery`
  - `capsule_action.attack_parameters`
- Delivery types:
  - `instant`, `projectile`, `stream`, `beam`, `artillery`
- Target/source effects:
  - `damage`, `create-fire`, `create-entity`, `create-sticker`, `nested-result`
- Entity recursion:
  - `action`, `initial_action`, `effects`, `on_damage_tick_effect`, `created_effect`

## Coverage Focus

- Ammo: supported through recursive action/delivery parsing.
- Grenades/capsules: supported through `capsule_action.attack_parameters` parser path.
- Enemy units: improved recursion across nested projectile/fire/sticker chains and broader delivery/effect variants.

## Remaining Follow-Up

- Validate output labels/format consistency across all tooltip and details paths.
- Expand test fixtures for additional modded prototypes with uncommon effect structures.

## Sources and attribution

Last verified: 2026-03-16

- SeaBlock in-repo documentation and linked project pages.
- Official Sea Block mod portal resources and community references, where applicable.
