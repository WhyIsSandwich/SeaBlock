/**
 * Composable for parsing attack and trigger effect data from entities and items.
 */
import { asArray, formatNumber } from './useDetailsData/sharedFormatters.js'

function toSecondsLabel(ticksOrSeconds, assumeTicks = true) {
  const seconds = assumeTicks ? ticksOrSeconds / 60 : ticksOrSeconds
  return `${formatNumber(seconds)} seconds`
}

function ensureAreaStatistic(statistics, radius) {
  let areaStat = statistics.find(
    stat => stat.label === 'Area of effect size' && Number(stat.value) === Number(radius)
  )
  if (!areaStat) {
    areaStat = {
      label: 'Area of effect size',
      value: radius,
      children: []
    }
    statistics.push(areaStat)
  }
  if (!Array.isArray(areaStat.children)) areaStat.children = []
  return areaStat
}

function resolveEntityReference(delivery) {
  if (!delivery) return null
  if (delivery.type === 'stream') return delivery.stream
  if (delivery.type === 'beam') return delivery.beam
  if (
    delivery.type === 'projectile' ||
    delivery.type === 'artillery' ||
    delivery.type === 'instant'
  ) {
    return delivery.projectile
  }
  return null
}

function getPrototypeFromContext(context, baseType, prototypeName) {
  if (!prototypeName || !context) return null
  return (
    context.factorioData?.[baseType]?.[prototypeName] ||
    context.factorioDataRaw?.[baseType]?.[prototypeName] ||
    null
  )
}

function parseStickerEffect(stickerName, context) {
  const stickerEntity = getPrototypeFromContext(context, 'entity', stickerName)
  if (!stickerEntity) return []

  const children = []
  if (stickerEntity.duration_in_ticks) {
    children.push({ label: 'Duration', value: toSecondsLabel(stickerEntity.duration_in_ticks, true) })
  }
  if (stickerEntity.target_movement_modifier_from !== undefined) {
    children.push({
      label: 'Movement speed',
      value: `${(stickerEntity.target_movement_modifier_from * 100).toFixed(1)}%`
    })
  }
  if (stickerEntity.vehicle_speed_modifier_from !== undefined) {
    children.push({
      label: 'Vehicle Speed',
      value: `${(stickerEntity.vehicle_speed_modifier_from * 100).toFixed(1)}%`
    })
  }
  return children
}

function parseEffectDescriptor(effect, context, damageModifier, statistics, actionData = null, visited = null) {
  if (!effect) return

  // Entity "effects" arrays may use damage_amount/damage_type instead of nested damage object.
  const damageAmount = effect.damage?.amount ?? effect.damage_amount
  const damageType = effect.damage?.type ?? effect.damage_type
  if ((effect.type === 'damage' || damageAmount !== undefined) && damageType) {
    const totalDamage = Number(damageAmount || 0) * damageModifier
    if (actionData?.type === 'area' && actionData.radius !== undefined) {
      const areaStat = ensureAreaStatistic(statistics, actionData.radius)
      areaStat.children.push({
        label: 'Damage',
        value: `${formatNumber(totalDamage)}/${damageType}`
      })
    } else {
      statistics.push({
        label: 'Damage',
        value: `${formatNumber(totalDamage)}/${damageType}`
      })
    }
  }

  if (effect.type === 'speed' && effect.speed_modifier !== undefined) {
    const children = [
      {
        label: 'Movement speed',
        value: `${formatNumber(effect.speed_modifier * 100)}%`
      }
    ]
    if (effect.duration !== undefined) {
      children.push({
        label: 'Duration',
        value: toSecondsLabel(effect.duration, false)
      })
    }
    statistics.push({ label: 'Applies effect', children })
  }

  if (effect.type === 'create-sticker' && effect.sticker) {
    const stickerChildren = parseStickerEffect(effect.sticker, context)
    if (stickerChildren.length > 0) {
      statistics.push({ label: 'Applies effect', children: stickerChildren })
    }
  }

  if ((effect.type === 'create-fire' || effect.type === 'create-entity') && effect.entity_name) {
    const createdEntity = getPrototypeFromContext(context, 'entity', effect.entity_name)
    const createdChildren = []

    if (effect.duration !== undefined) {
      createdChildren.push({
        label: 'Lifetime',
        value: toSecondsLabel(effect.duration, true)
      })
    }

    if (effect.damage?.amount !== undefined && effect.damage?.type) {
      createdChildren.push({
        label: 'Damage',
        value: `${formatNumber(effect.damage.amount * 60 * damageModifier)}/${effect.damage.type}`
      })
    }

    if (createdEntity) {
      parseEntityEffects(createdEntity, context, damageModifier, createdChildren, visited)
      if (
        createdEntity.damage_per_tick?.amount !== undefined &&
        createdEntity.damage_per_tick?.amount > 0 &&
        createdEntity.damage_per_tick?.type
      ) {
        createdChildren.push({
          label: 'Damage',
          value: `${formatNumber(createdEntity.damage_per_tick.amount * 60 * damageModifier)}/${createdEntity.damage_per_tick.type}`
        })
      }
    }

    if (createdChildren.length > 0) {
      const createdLabel =
        createdEntity?.displayName ||
        (effect.entity_name.includes('electric-fire')
          ? 'Electrolytic bile splash'
          : effect.entity_name.includes('acid')
            ? 'Acid splash'
            : effect.entity_name.includes('fire')
              ? 'Fire'
              : effect.entity_name)
      statistics.push({
        label: `Creates: 1 x ${createdLabel}`,
        children: createdChildren
      })
    }
  }

  if (effect.type === 'nested-result' && effect.action) {
    processAction(effect.action, context, damageModifier, statistics, visited)
  }

  if (effect.action) {
    processAction(effect.action, context, damageModifier, statistics, visited)
  }
}

function parseEntityEffects(
  entity,
  context,
  damageModifier = 1,
  statistics = [],
  visited = new Set()
) {
  if (!entity || !context?.factorioData) return statistics
  if (entity.name && visited.has(entity.name)) return statistics
  if (entity.name) visited.add(entity.name)

  asArray(entity.action).forEach(action =>
    processAction(action, context, damageModifier, statistics, visited)
  )
  asArray(entity.initial_action).forEach(action =>
    processAction(action, context, damageModifier, statistics, visited)
  )

  if (entity.area_of_effect !== undefined) {
    ensureAreaStatistic(statistics, entity.area_of_effect)
  }
  if (entity.lifetime !== undefined) {
    statistics.push({ label: 'Lifetime', value: toSecondsLabel(entity.lifetime, true) })
  }
  if (entity.initial_lifetime !== undefined) {
    statistics.push({ label: 'Lifetime', value: toSecondsLabel(entity.initial_lifetime, true) })
  }
  if (entity.light_size_modifier_maximum !== undefined) {
    ensureAreaStatistic(statistics, entity.light_size_modifier_maximum)
  }

  asArray(entity.effects).forEach(effect =>
    parseEffectDescriptor(effect, context, damageModifier, statistics, null, visited)
  )

  const onDamageTickActions = asArray(entity.on_damage_tick_effect)
  if (onDamageTickActions.length > 0) {
    for (const action of onDamageTickActions) {
      const delivery = action?.action_delivery
      if (!delivery) continue

      const appliesChildren = []
      for (const effect of asArray(delivery.target_effects)) {
        if (effect?.type === 'create-sticker' && effect.sticker) {
          appliesChildren.push(...parseStickerEffect(effect.sticker, context))
        }
        if (effect?.type === 'damage' && effect.damage?.amount !== undefined && effect.damage?.type) {
          // Fire on-damage effects are applied in pulses (10 ticks in these prototypes).
          const damagePerSecond = (effect.damage.amount * 60 * damageModifier) / 10
          statistics.push({
            label: 'Damage',
            value: `${formatNumber(damagePerSecond)}/s/${effect.damage.type}`
          })
        }
      }
      if (appliesChildren.length > 0) {
        statistics.push({
          label: 'Applies effect',
          children: appliesChildren
        })
      }
    }
  }

  if (entity.created_effect) {
    const createdEntity = getPrototypeFromContext(context, 'entity', entity.created_effect)
    if (createdEntity) {
      const createdChildren = []
      parseEntityEffects(createdEntity, context, damageModifier, createdChildren, visited)
      if (createdChildren.length > 0) {
        statistics.push({
          label: `Creates: 1 x ${createdEntity.displayName || entity.created_effect}`,
          children: createdChildren
        })
      }
    }
  }

  if (entity.name) visited.delete(entity.name)
  return statistics
}

function parseActionDeliveryEffects(
  delivery,
  context,
  actionData = null,
  damageModifier = 1,
  statistics = [],
  visited = new Set()
) {
  asArray(delivery).forEach(oneDelivery => {
    if (!oneDelivery) return

    const entityName = resolveEntityReference(oneDelivery)
    if (entityName) {
      const referencedEntity = getPrototypeFromContext(context, 'entity', entityName)
      if (referencedEntity) {
        parseEntityEffects(referencedEntity, context, damageModifier, statistics, visited)
      } else {
        statistics.push({
          label: `Creates: 1 x ${entityName}`
        })
      }
    }

    asArray(oneDelivery.source_effects).forEach(effect =>
      parseEffectDescriptor(effect, context, damageModifier, statistics, actionData, visited)
    )
    asArray(oneDelivery.target_effects).forEach(effect =>
      parseEffectDescriptor(effect, context, damageModifier, statistics, actionData, visited)
    )
  })

  return statistics
}

function processAction(action, context, damageModifier, statistics, visited = new Set()) {
  if (!action) return

  if (action.type === 'area' && action.radius !== undefined) {
    ensureAreaStatistic(statistics, action.radius)
  }

  if (action.action_delivery) {
    parseActionDeliveryEffects(
      action.action_delivery,
      context,
      action,
      damageModifier,
      statistics,
      visited
    )
  }
}

export function parseAttackParameters(attackParameters, context, _isArtillery = false) {
  if (!attackParameters || !context?.factorioData) return null

  const statistics = []
  const damageModifier = attackParameters.damage_modifier || 1
  const actions = [
    ...asArray(attackParameters.ammo_type?.action),
    ...asArray(attackParameters.action)
  ]

  if (actions.length === 0 && attackParameters.action_delivery) {
    actions.push({ type: 'direct', action_delivery: attackParameters.action_delivery })
  }

  for (const action of actions) {
    processAction(action, context, damageModifier, statistics)
  }

  return statistics.length > 0 ? { statistics } : null
}

export function parseCapsuleAction(capsuleAction, context) {
  if (!capsuleAction) return null
  if (capsuleAction.attack_parameters) {
    const parsed = parseAttackParameters(capsuleAction.attack_parameters, context, false)
    if (parsed?.statistics?.length > 0) return parsed
  }

  const statistics = []
  if (capsuleAction.radius !== undefined) {
    statistics.push({
      label: 'Area of effect size',
      value: capsuleAction.radius
    })
  }
  if (capsuleAction.type === 'equipment-remote' && capsuleAction.equipment) {
    statistics.push({ label: 'Remote equipment', value: capsuleAction.equipment })
  }
  if (capsuleAction.type === 'artillery-remote' && capsuleAction.flare) {
    statistics.push({ label: 'Targets with', value: capsuleAction.flare })
  }

  return statistics.length > 0 ? { statistics } : null
}

function formatGenericEffectKey(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function formatGenericEffectValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    if (Math.abs(value) <= 2) {
      return `${formatNumber(value * 100)}%`
    }
    return formatNumber(value)
  }
  if (Array.isArray(value)) return value.map(entry => formatGenericEffectValue(entry)).join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return value
}

export function parseGenericItemEffect(effectData) {
  if (!effectData) return null
  if (typeof effectData !== 'object' || Array.isArray(effectData)) {
    return { statistics: [{ label: 'Effect', value: String(effectData) }] }
  }

  const statistics = Object.entries(effectData).map(([key, value]) => ({
    label: formatGenericEffectKey(key),
    value: formatGenericEffectValue(value)
  }))

  return statistics.length > 0 ? { statistics } : null
}

export default {
  parseAttackParameters,
  parseCapsuleAction,
  parseGenericItemEffect
}
