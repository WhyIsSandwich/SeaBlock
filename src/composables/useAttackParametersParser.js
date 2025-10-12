/**
 * Composable for parsing attack parameters from entities and items
 * Handles the complex attack_parameters object structure with nested effects
 */

/**
 * Parse effects from an entity (stream, projectile, etc.)
 * @param {Object} entity - The entity object (stream, projectile, etc.)
 * @param {Object} context - The factorio data context
 * @returns {Array} Array of nested effect statistics
 */
function parseEntityEffects(entity, context, damageModifier = 1, effects = []) {
  if (!entity) return effects

  // Handle action (recursive parsing)
  if (entity.action) {
    const actions = Array.isArray(entity.action) ? entity.action : [entity.action]
    actions.forEach(action => {
      if (action && action.action_delivery) {
        parseActionDeliveryEffects(
          action.action_delivery,
          context,
          action.type,
          action,
          damageModifier,
          effects
        )
      }
    })
  }

  // Handle initial_action (recursive parsing)
  if (entity.initial_action) {
    const initialActions = Array.isArray(entity.initial_action)
      ? entity.initial_action
      : [entity.initial_action]
    console.log('DEBUG: Processing initial_action:', initialActions.length, 'actions')
    initialActions.forEach(action => {
      if (action && action.action_delivery) {
        console.log('DEBUG: Processing action type:', action.type, 'with radius:', action.radius)
        parseActionDeliveryEffects(
          action.action_delivery,
          context,
          action.type,
          action,
          damageModifier,
          effects
        )
      }
    })
  }

  // Area of effect
  if (entity.area_of_effect) {
    effects.push({
      label: 'Area of effect size',
      value: entity.area_of_effect
    })
  }

  // Lifetime
  if (entity.lifetime) {
    effects.push({
      label: 'Lifetime',
      value: `${entity.lifetime / 60} seconds`
    })
  }

  // Handle effects array - but don't process if we already have nested actions
  if (entity.effects && Array.isArray(entity.effects) && !entity.action) {
    entity.effects.forEach((effect, _index) => {
      const effectStats = []

      if (effect.type === 'damage') {
        const damagePerSecond = effect.damage_amount * 60 * damageModifier
        effectStats.push({
          label: 'Damage',
          value: `${damagePerSecond}/${effect.damage_type}`
        })
      }

      if (effect.type === 'speed') {
        effectStats.push({
          label: 'Movement speed',
          value: `${(effect.speed_modifier * 100).toFixed(1)}%`
        })
      }

      if (effect.duration) {
        effectStats.push({
          label: 'Duration',
          value: `${effect.duration} seconds`
        })
      }

      if (effectStats.length > 0) {
        effects.push({
          label: `Applies effect`,
          children: effectStats
        })
      }
    })
  }

  // Handle created entities (like fire)
  if (entity.created_effect) {
    const createdEntity = context.factorioData.entity?.[entity.created_effect]
    if (createdEntity) {
      const createdStats = []

      if (createdEntity.lifetime) {
        createdStats.push({
          label: 'Lifetime',
          value: `${createdEntity.lifetime / 60} seconds`
        })
      }

      if (createdEntity.effects && Array.isArray(createdEntity.effects)) {
        createdEntity.effects.forEach(effect => {
          if (effect.type === 'damage') {
            const damagePerSecond = effect.damage_amount * 60 * damageModifier
            createdStats.push({
              label: 'Damage',
              value: `${damagePerSecond}/${effect.damage_type}`
            })
          }
        })
      }

      if (createdStats.length > 0) {
        effects.push({
          label: `Creates: 1 x ${createdEntity.displayName || entity.created_effect}`,
          children: createdStats
        })
      }
    }
  }

  return effects
}

/**
 * Parse action delivery effects - simply loop through all actions and let recursive parsing handle hierarchy
 * @param {Object} delivery - The action_delivery object
 * @param {Object} context - The factorio data context
 * @returns {Array} Array of effect statistics
 */
function parseActionDeliveryEffects(
  delivery,
  context,
  actionType = null,
  actionData = null,
  damageModifier = 1,
  effects = []
) {
  if (!delivery) return effects

  // Handle stream delivery - recursively parse stream entity
  if (delivery.type === 'stream' && delivery.stream) {
    const streamEntity = context.factorioData.entity?.[delivery.stream]
    if (streamEntity) {
      console.log('DEBUG: Processing stream entity:', delivery.stream)
      console.log('DEBUG: Stream entity initial_action:', streamEntity.initial_action)
      parseEntityEffects(streamEntity, context, damageModifier, effects)
    }
  }

  // Handle projectile delivery
  if (delivery.type === 'projectile' && delivery.projectile) {
    const projectileEntity = context.factorioData.entity?.[delivery.projectile]
    if (projectileEntity) {
      parseEntityEffects(projectileEntity, context, damageModifier, effects)
    }
  }

  // Handle beam delivery
  if (delivery.type === 'beam' && delivery.beam) {
    const beamEntity = context.factorioData.entity?.[delivery.beam]
    if (beamEntity) {
      parseEntityEffects(beamEntity, context, damageModifier, effects)
    }
  }

  // Handle target_effects for ALL delivery types
  if (delivery.target_effects) {
    delivery.target_effects.forEach((effect, _index) => {
      if (effect.type === 'damage') {
        // Direct damage effect
        const damageAmount = effect.damage?.amount || 0
        const damageType = effect.damage?.type || 'unknown'
        const totalDamage = damageAmount * damageModifier

        // Check if this is part of an area action
        if (actionType === 'area' && actionData && actionData.radius) {
          // This is AOE damage - create area of effect entry
          const areaChildren = []
          areaChildren.push({
            label: 'Damage',
            value: `${totalDamage}/${damageType}`
          })

          effects.push({
            label: 'Area of effect size',
            value: actionData.radius,
            children: areaChildren
          })
        } else {
          // Direct damage effect
          effects.push({
            label: 'Damage',
            value: `${totalDamage}/${damageType}`
          })
        }
      }

      if (effect.type === 'create-fire' && effect.entity_name) {
        // Create fire/acid effect with nested properties
        const createsChildren = []

        // Check if the effect itself has properties
        if (effect.duration) {
          createsChildren.push({
            label: 'Lifetime',
            value: `${effect.duration / 60} seconds`
          })
        }
        if (effect.damage?.amount) {
          const damagePerSecond = effect.damage.amount * 60
          createsChildren.push({
            label: 'Damage',
            value: `${damagePerSecond}/${effect.damage.type}`
          })
        }

        // If no properties on the effect, try to resolve the entity reference
        if (createsChildren.length === 0 && context.factorioData.entity?.[effect.entity_name]) {
          const fireEntity = context.factorioData.entity[effect.entity_name]

          // Extract lifetime from fire entity
          if (fireEntity.initial_lifetime) {
            createsChildren.push({
              label: 'Lifetime',
              value: `${fireEntity.initial_lifetime / 60} seconds`
            })
          }

          // For acid splash, calculate total damage over lifetime from on_damage_tick_effect
          if (
            fireEntity.on_damage_tick_effect &&
            fireEntity.on_damage_tick_effect.action_delivery
          ) {
            const onDamageDelivery = fireEntity.on_damage_tick_effect.action_delivery
            if (onDamageDelivery.target_effects) {
              const damageEffect = onDamageDelivery.target_effects.find(e => e.type === 'damage')
              if (damageEffect && damageEffect.damage) {
                // Calculate damage per second (without damage modifier for fire entity)
                const damagePerTick = damageEffect.damage.amount
                const damagePerSecond = (damagePerTick * 60 * damageModifier) / 10
                createsChildren.push({
                  label: 'Damage',
                  value: `${damagePerSecond}s/${damageEffect.damage.type}`
                })
              }
            }
          } else if (fireEntity.damage_per_tick?.amount !== undefined) {
            // Extract damage from fire entity for non-acid splash or when damage_per_tick > 0
            const damagePerSecond = fireEntity.damage_per_tick.amount * 60 * damageModifier
            createsChildren.push({
              label: 'Damage',
              value: `${damagePerSecond}/${fireEntity.damage_per_tick.type}`
            })
          }
          if (
            fireEntity.on_damage_tick_effect &&
            fireEntity.on_damage_tick_effect.action_delivery
          ) {
            const onDamageDelivery = fireEntity.on_damage_tick_effect.action_delivery
            if (onDamageDelivery.target_effects) {
              const stickerEffect = onDamageDelivery.target_effects.find(
                e => e.type === 'create-sticker' && e.sticker
              )
              const damageEffect = onDamageDelivery.target_effects.find(e => e.type === 'damage')

              if (stickerEffect || damageEffect) {
                const appliesChildren = []

                // Add sticker effects
                if (stickerEffect && context.factorioData.entity?.[stickerEffect.sticker]) {
                  const stickerEntity = context.factorioData.entity[stickerEffect.sticker]

                  // Extract duration from sticker
                  if (stickerEntity.duration_in_ticks) {
                    const durationSeconds = stickerEntity.duration_in_ticks / 60
                    appliesChildren.push({
                      label: 'Duration',
                      value: `${durationSeconds} seconds`
                    })
                  }

                  // Extract movement speed modifier from sticker
                  if (stickerEntity.target_movement_modifier_from !== undefined) {
                    const speedPercent = stickerEntity.target_movement_modifier_from * 100
                    appliesChildren.push({
                      label: 'Movement speed',
                      value: `${speedPercent}%`
                    })
                  }

                  // Extract vehicle speed modifier from sticker
                  if (stickerEntity.vehicle_speed_modifier_from !== undefined) {
                    const vehicleSpeedPercent = stickerEntity.vehicle_speed_modifier_from * 100
                    appliesChildren.push({
                      label: 'Vehicle speed',
                      value: `${vehicleSpeedPercent}%`
                    })
                  }
                }
                /*
                // Add damage to applies effect
                if (damageEffect && damageEffect.damage) {
                  const damageAmount = damageEffect.damage.amount || 0
                  const damageType = damageEffect.damage.type || 'unknown'
                  const totalDamage = damageAmount * damageModifier
                  const acidDamagePerSecond = totalDamage * 1.2

                  appliesChildren.push({
                    label: 'Damage',
                    value: `${acidDamagePerSecond}/${damageType}`
                  })
                }
                */
                if (appliesChildren.length > 0) {
                  createsChildren.push({
                    label: 'Applies effect',
                    children: appliesChildren
                  })
                }
              }
            }
          }
        }

        // Determine the correct entity name for display
        let entityDisplayName = 'Fire'
        if (effect.entity_name.includes('acid')) {
          entityDisplayName = 'Acid splash'
        } else if (effect.entity_name.includes('fire')) {
          entityDisplayName = 'Fire'
        }

        effects.push({
          label: `Creates: 1 x ${entityDisplayName}`,
          children: createsChildren
        })
      }
    })
  }

  return effects
}

// This is a trigger https://lua-api.factorio.com/latest/types/Trigger.html
function processAction(action, context, damageModifier, statistics) {
  if (action.type === 'area') {
    //Area has radius which interests us
    statistics.push({
      label: 'Area of effect size',
      value: action.radius
    })
  } else if (action.type === 'area') {
  }
  if (action.type === 'line') {
  } else if (action.type === 'direct') {
  }
  // Process action delivery to get effects
  if (action.action_delivery) {
    parseActionDeliveryEffects(
      action.action_delivery,
      context,
      action.type,
      action,
      damageModifier,
      statistics
    )
  }
}

/**
 * Parse attack parameters and extract relevant statistics
 * @param {Object} attackParameters - The attack_parameters object
 * @param {Object} context - The factorio data context
 * @param {boolean} isArtillery - Whether this is artillery (affects labels)
 * @returns {Object} Object containing statistics array
 */
export function parseAttackParameters(attackParameters, context, _isArtillery = false) {
  if (!attackParameters) return null

  const statistics = []
  const damageModifier = attackParameters.damage_modifier || 1

  // Handle ammo_type - flatten actions and process effects
  if (attackParameters.ammo_type) {
    const ammoType = attackParameters.ammo_type
    // Flatten and process all actions
    if (ammoType.action) {
      const actions = Array.isArray(ammoType.action) ? ammoType.action : [ammoType.action]
      for (const action of actions) {
        processAction(action, context, damageModifier, statistics)
      }
    }
  }
  return {
    statistics
  }
}

export default {
  parseAttackParameters
}
