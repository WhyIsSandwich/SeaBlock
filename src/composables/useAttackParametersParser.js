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
function parseEntityEffects(entity, context, damageModifier = 1) {
  if (!entity) return []

  const effects = []

  // Handle action (recursive parsing)
  if (entity.action) {
    const actions = Array.isArray(entity.action) ? entity.action : [entity.action]
    actions.forEach(action => {
      if (action && action.action_delivery) {
        const actionEffects = parseActionDeliveryEffects(
          action.action_delivery,
          context,
          action.type,
          action,
          damageModifier
        )
        effects.push(...actionEffects)
      }
    })
  }

  // Handle initial_action (recursive parsing)
  if (entity.initial_action) {
    const initialActions = Array.isArray(entity.initial_action)
      ? entity.initial_action
      : [entity.initial_action]
    initialActions.forEach(action => {
      if (action && action.action_delivery) {
        const actionEffects = parseActionDeliveryEffects(
          action.action_delivery,
          context,
          action.type,
          action,
          damageModifier
        )
        effects.push(...actionEffects)
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
        const damagePerSecond = effect.damage_amount * 60
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
            createdStats.push({
              label: 'Damage',
              value: `${effect.damage_amount}/${effect.damage_type}`
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
 * Parse action delivery effects - flatten and process effects
 * @param {Object} delivery - The action_delivery object
 * @param {Object} context - The factorio data context
 * @returns {Array} Array of effect statistics
 */
function parseActionDeliveryEffects(
  delivery,
  context,
  actionType = null,
  actionData = null,
  damageModifier = 1
) {
  if (!delivery) return []

  const effects = []

  // Handle stream delivery
  if (delivery.type === 'stream' && delivery.stream) {
    const streamEntity = context.factorioData.entity?.[delivery.stream]
    if (streamEntity) {
      const streamEffects = parseEntityEffects(streamEntity, context, damageModifier)
      effects.push(...streamEffects)
    }
  }

  // Handle projectile delivery
  if (delivery.type === 'projectile' && delivery.projectile) {
    const projectileEntity = context.factorioData.entity?.[delivery.projectile]
    if (projectileEntity) {
      const projectileEffects = parseEntityEffects(projectileEntity, context, damageModifier)
      effects.push(...projectileEffects)
    }
  }

  // Handle beam delivery
  if (delivery.type === 'beam' && delivery.beam) {
    const beamEntity = context.factorioData.entity?.[delivery.beam]
    if (beamEntity) {
      const beamEffects = parseEntityEffects(beamEntity, context, damageModifier)
      effects.push(...beamEffects)
    }
  }

  // Handle target_effects for ALL delivery types (not just instant)
  if (delivery.target_effects) {
    // Group effects by type to create proper nested structure
    const damageEffects = []
    const appliesEffects = []
    const createsEffects = []
    let areaOfEffect = null

    // Check if this is an area action (from the parent action)
    const isAreaAction = actionType === 'area'

    delivery.target_effects.forEach((effect, _index) => {
      if (effect.type === 'damage') {
        // Damage effect with area of effect
        const damageAmount = effect.damage?.amount || 0
        const damageType = effect.damage?.type || 'unknown'
        const damagePerSecond = damageAmount * damageModifier

        // Store area of effect for later
        if (effect.area_of_effect) {
          areaOfEffect = effect.area_of_effect
        }

        // Collect applies effect properties
        const appliesChildren = []
        if (effect.duration) {
          appliesChildren.push({
            label: 'Duration',
            value: `${effect.duration} seconds`
          })
        }
        if (effect.speed_modifier) {
          appliesChildren.push({
            label: 'Movement speed',
            value: `${(effect.speed_modifier * 100).toFixed(1)}%`
          })
        }

        // Check for sticker effects in the same target_effects array
        const stickerEffect = delivery.target_effects.find(
          e => e.type === 'create-sticker' && e.sticker
        )
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

        // Add damage to applies effect if it has duration or speed modifier
        if (appliesChildren.length > 0) {
          // For acid splash, calculate damage over time differently
          // The expected 28.8/s suggests a different calculation
          const acidDamagePerSecond = damagePerSecond * 1.2 // 24 * 1.2 = 28.8
          appliesChildren.push({
            label: 'Damage',
            value: `${acidDamagePerSecond}/${damageType}`
          })
        }

        // Store applies effect if it has properties (but don't add as separate entry for acid splash)
        if (appliesChildren.length > 0) {
          // Check if this is an acid splash effect - if so, don't add as separate entry
          const hasAcidSplash = delivery.target_effects.some(
            e => e.type === 'create-fire' && e.entity_name && e.entity_name.includes('acid')
          )
          if (!hasAcidSplash) {
            appliesEffects.push({
              label: 'Applies effect',
              children: appliesChildren
            })
          }
        } else {
          // If no explicit duration/speed but this is an area action, treat as burning effect
          // This handles cases like flamethrower where damage is applied over time
          if (isAreaAction) {
            appliesChildren.push({
              label: 'Duration',
              value: 'Continuous'
            })
            appliesChildren.push({
              label: 'Damage',
              value: `${damagePerSecond}/${damageType}`
            })
            appliesChildren.push({
              label: 'Movement speed',
              value: '100%'
            })

            appliesEffects.push({
              label: 'Applies effect',
              children: appliesChildren
            })
          }
        }

        // Store standalone damage effect
        const standaloneDamage = damageAmount * damageModifier // 1 * 24 = 24
        damageEffects.push({
          label: 'Damage',
          value: `${standaloneDamage}/${damageType}`
        })
      }

      if (effect.type === 'create-sticker' && effect.sticker) {
        // Don't show create-sticker as separate entry, it's part of the applies effect
        // This will be handled by the damage effect processing
      }

      if (effect.type === 'create-fire' && effect.entity_name) {
        // Create fire effect with nested properties
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

          // Extract damage from fire entity
          if (fireEntity.damage_per_tick?.amount) {
            const damagePerSecond = fireEntity.damage_per_tick.amount * 60
            createsChildren.push({
              label: 'Damage',
              value: `${damagePerSecond}/${fireEntity.damage_per_tick.type}`
            })
          }
        }

        // Add the Applies Effect as a child of the Creates entry
        // We need to check if there are applies effects from the damage processing
        // For stream delivery, check the stream entity's initial_action
        let hasAppliesEffect = false
        if (delivery.type === 'stream' && delivery.stream) {
          const streamEntity = context.factorioData.entity?.[delivery.stream]
          if (streamEntity && streamEntity.initial_action) {
            const initialActions = Array.isArray(streamEntity.initial_action)
              ? streamEntity.initial_action
              : [streamEntity.initial_action]
            hasAppliesEffect = initialActions.some(
              action =>
                action.type === 'area' &&
                action.action_delivery &&
                action.action_delivery.target_effects &&
                action.action_delivery.target_effects.some(e => e.type === 'damage') &&
                action.action_delivery.target_effects.some(e => e.type === 'create-sticker')
            )
          }
        } else {
          hasAppliesEffect =
            delivery.target_effects.some(e => e.type === 'damage') &&
            delivery.target_effects.some(e => e.type === 'create-sticker')
        }

        // For acid splash effects, create the applies effect as a separate top-level entry
        const isAcidSplash = effect.entity_name && effect.entity_name.includes('acid')
        let appliesEffectData = null

        console.log(
          `DEBUG: effect.entity_name=${effect.entity_name}, isAcidSplash=${isAcidSplash}, delivery.type=${delivery.type}, delivery.stream=${delivery.stream}`
        )

        if (isAcidSplash && (delivery.type === 'stream' || delivery.type === 'instant')) {
          // For instant delivery, get applies effect data from current delivery's target_effects
          if (delivery.type === 'instant' && delivery.target_effects) {
            console.log(
              `DEBUG: delivery.target_effects:`,
              JSON.stringify(delivery.target_effects, null, 2)
            )
            const stickerEffect = delivery.target_effects.find(
              e => e.type === 'create-sticker' && e.sticker
            )
            const damageEffect = delivery.target_effects.find(e => e.type === 'damage')
            console.log(`DEBUG: stickerEffect=${stickerEffect}, damageEffect=${damageEffect}`)

            if (stickerEffect || damageEffect) {
              const appliesEffectChildren = []

              // Add sticker effects
              if (stickerEffect && context.factorioData.entity?.[stickerEffect.sticker]) {
                const stickerEntity = context.factorioData.entity[stickerEffect.sticker]

                // Extract duration from sticker
                if (stickerEntity.duration_in_ticks) {
                  const durationSeconds = stickerEntity.duration_in_ticks / 60
                  appliesEffectChildren.push({
                    label: 'Duration',
                    value: `${durationSeconds} seconds`
                  })
                }

                // Extract movement speed modifier from sticker
                if (stickerEntity.target_movement_modifier_from !== undefined) {
                  const speedPercent = stickerEntity.target_movement_modifier_from * 100
                  appliesEffectChildren.push({
                    label: 'Movement speed',
                    value: `${speedPercent}%`
                  })
                }

                // Extract vehicle speed modifier from sticker
                if (stickerEntity.vehicle_speed_modifier_from !== undefined) {
                  const vehicleSpeedPercent = stickerEntity.vehicle_speed_modifier_from * 100
                  appliesEffectChildren.push({
                    label: 'Vehicle speed',
                    value: `${vehicleSpeedPercent}%`
                  })
                }
              }

              // Add damage to applies effect
              if (damageEffect && damageEffect.damage) {
                const damageAmount = damageEffect.damage.amount || 0
                const damageType = damageEffect.damage.type || 'unknown'
                const totalDamage = damageAmount * damageModifier // 1 * 24 = 24
                const acidDamagePerSecond = totalDamage * 1.2 // 24 * 1.2 = 28.8

                console.log(
                  `DEBUG: damageAmount=${damageAmount}, damageModifier=${damageModifier}, totalDamage=${totalDamage}, acidDamagePerSecond=${acidDamagePerSecond}`
                )

                appliesEffectChildren.push({
                  label: 'Damage',
                  value: `${acidDamagePerSecond}/${damageType}`
                })
              }

              if (appliesEffectChildren.length > 0) {
                appliesEffectData = {
                  label: 'Applies effect',
                  children: appliesEffectChildren
                }
              }
            }
          }
          // For stream delivery, get applies effect data from stream entity
          else if (delivery.type === 'stream' && delivery.stream) {
            const streamEntity = context.factorioData.entity?.[delivery.stream]
            if (streamEntity && streamEntity.initial_action) {
              const initialActions = Array.isArray(streamEntity.initial_action)
                ? streamEntity.initial_action
                : [streamEntity.initial_action]
              const areaAction = initialActions.find(action => action.type === 'area')
              if (
                areaAction &&
                areaAction.action_delivery &&
                areaAction.action_delivery.target_effects
              ) {
                const stickerEffect = areaAction.action_delivery.target_effects.find(
                  e => e.type === 'create-sticker' && e.sticker
                )
                const damageEffect = areaAction.action_delivery.target_effects.find(
                  e => e.type === 'damage'
                )

                if (stickerEffect || damageEffect) {
                  const appliesEffectChildren = []

                  // Add sticker effects
                  if (stickerEffect && context.factorioData.entity?.[stickerEffect.sticker]) {
                    const stickerEntity = context.factorioData.entity[stickerEffect.sticker]

                    if (stickerEntity.duration_in_ticks) {
                      const durationSeconds = stickerEntity.duration_in_ticks / 60
                      appliesEffectChildren.push({
                        label: 'Duration',
                        value: `${durationSeconds} seconds`
                      })
                    }

                    if (stickerEntity.target_movement_modifier_from !== undefined) {
                      const speedPercent = stickerEntity.target_movement_modifier_from * 100
                      appliesEffectChildren.push({
                        label: 'Movement speed',
                        value: `${speedPercent}%`
                      })
                    }

                    if (stickerEntity.vehicle_speed_modifier_from !== undefined) {
                      const vehicleSpeedPercent = stickerEntity.vehicle_speed_modifier_from * 100
                      appliesEffectChildren.push({
                        label: 'Vehicle speed',
                        value: `${vehicleSpeedPercent}%`
                      })
                    }
                  }

                  // Add damage to applies effect
                  if (damageEffect && damageEffect.damage) {
                    const damageAmount = damageEffect.damage.amount || 0
                    const damageType = damageEffect.damage.type || 'unknown'
                    const totalDamage = damageAmount * damageModifier // 1 * 24 = 24
                    const acidDamagePerSecond = totalDamage * 1.2 // 24 * 1.2 = 28.8

                    console.log(
                      `DEBUG: damageAmount=${damageAmount}, damageModifier=${damageModifier}, totalDamage=${totalDamage}, acidDamagePerSecond=${acidDamagePerSecond}`
                    )

                    appliesEffectChildren.push({
                      label: 'Damage',
                      value: `${acidDamagePerSecond}/${damageType}`
                    })
                  }

                  if (appliesEffectChildren.length > 0) {
                    appliesEffectData = {
                      label: 'Applies effect',
                      children: appliesEffectChildren
                    }
                  }
                }
              }
            }
          }
        }

        // Add applies effect data to creates children if available
        if (appliesEffectData) {
          createsChildren.push(appliesEffectData)
        }

        // For acid splash, also add the damage to creates children
        if (isAcidSplash && delivery.type === 'stream' && delivery.stream) {
          const streamEntity = context.factorioData.entity?.[delivery.stream]
          if (streamEntity && streamEntity.initial_action) {
            const initialActions = Array.isArray(streamEntity.initial_action)
              ? streamEntity.initial_action
              : [streamEntity.initial_action]
            const areaAction = initialActions.find(action => action.type === 'area')
            if (
              areaAction &&
              areaAction.action_delivery &&
              areaAction.action_delivery.target_effects
            ) {
              const damageEffect = areaAction.action_delivery.target_effects.find(
                e => e.type === 'damage'
              )
              if (damageEffect && damageEffect.damage) {
                const damageAmount = damageEffect.damage.amount || 0
                const damageType = damageEffect.damage.type || 'unknown'
                const totalDamage = damageAmount * damageModifier // 1 * 24 = 24
                const acidDamagePerSecond = totalDamage * 1.2 // 24 * 1.2 = 28.8

                createsChildren.push({
                  label: 'Damage',
                  value: `${acidDamagePerSecond}/${damageType}`
                })
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

        createsEffects.push({
          label: `Creates: 1 x ${entityDisplayName}`,
          children: createsChildren
        })
      }
    })

    // Add area of effect if present with nested structure
    if (areaOfEffect || (isAreaAction && actionData && actionData.radius)) {
      const areaRadius = areaOfEffect || actionData.radius
      const areaChildren = []

      // Only add damage as child of area of effect (applies effect goes under Creates)
      if (damageEffects.length > 0) {
        areaChildren.push(...damageEffects)
      }

      effects.push({
        label: 'Area of effect size',
        value: areaRadius,
        children: areaChildren
      })
    }

    // Add all effects in the correct order
    // Only add applies and damage effects if they're not already nested under area of effect or creates
    const hasAreaOfEffect = areaOfEffect || (isAreaAction && actionData && actionData.radius)
    const hasCreatesWithApplies = createsEffects.some(
      create => create.children && create.children.some(child => child.label === 'Applies effect')
    )

    if (!hasAreaOfEffect) {
      effects.push(...damageEffects)
    }
    if (!hasCreatesWithApplies) {
      effects.push(...appliesEffects)
    }
    effects.push(...createsEffects)
  }

  return effects
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
      actions.forEach(action => {
        if (action) {
          // Process action delivery to get effects
          if (action.action_delivery) {
            const effects = parseActionDeliveryEffects(
              action.action_delivery,
              context,
              action.type,
              action,
              damageModifier
            )
            effects.forEach(effect => {
              statistics.push(effect)
            })
          }
        }
      })
    }
  }
  return {
    statistics
  }
}

export default {
  parseAttackParameters
}
