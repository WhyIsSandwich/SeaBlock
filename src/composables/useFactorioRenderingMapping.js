/* eslint-disable unused-imports/no-unused-vars */
import { missingPrototypeHandlers } from './renderingHandlers/missingPrototypeHandlers.js'

const pageRandom = Math.random()
const DEFAULT_RUNTIME_CONTEXT = Object.freeze({
  direction: null,
  state: 'idle',
  activity: 0,
  progress: 0,
  time: 0,
  spinSpeed: 1
})

export function useFactorioRenderingMapping() {
  const toFiniteNumber = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback)

  const normalizeRuntimeContext = (runtime = {}) => {
    const runtimeObject = runtime && typeof runtime === 'object' ? runtime : {}
    const normalizedActivity = Math.max(0, toFiniteNumber(runtimeObject.activity, 0))
    const normalizedProgress = Math.max(0, Math.min(1, toFiniteNumber(runtimeObject.progress, 0)))
    const normalizedSpinSpeed = Math.max(0, toFiniteNumber(runtimeObject.spinSpeed, 1))
    const normalizedState =
      typeof runtimeObject.state === 'string'
        ? runtimeObject.state
        : runtimeObject.isWorking
          ? 'working'
          : DEFAULT_RUNTIME_CONTEXT.state

    return {
      direction: runtimeObject.direction ?? runtimeObject.orientation ?? DEFAULT_RUNTIME_CONTEXT.direction,
      state: normalizedState,
      activity: normalizedActivity,
      progress: normalizedProgress,
      time: toFiniteNumber(runtimeObject.time ?? runtimeObject.t, 0),
      spinSpeed: normalizedSpinSpeed
    }
  }

  const isRuntimeActive = runtime => {
    return runtime.activity > 0 || ['working', 'active', 'preparing', 'attacking', 'on'].includes(runtime.state)
  }

  const applyRuntimeSpeed = (layer, runtime, speedResolver) => {
    if (!layer || !isRuntimeActive(runtime)) {
      return layer
    }
    if (Array.isArray(layer)) {
      return layer.map(entry => applyRuntimeSpeed(entry, runtime, speedResolver))
    }
    if (typeof layer !== 'object') {
      return layer
    }

    const baseSpeed = Number.isFinite(layer.animation_speed) ? layer.animation_speed : 1
    const nextLayer = {
      ...layer,
      animation_speed: speedResolver(baseSpeed, runtime)
    }

    if (Array.isArray(layer.layers)) {
      nextLayer.layers = layer.layers.map(entry => applyRuntimeSpeed(entry, runtime, speedResolver))
    }

    return nextLayer
  }

  const applyRuntimeActivity = (layer, runtime) => {
    const activityMultiplier = Math.max(runtime.activity || 0, 1)
    const progressBoost = runtime.progress > 0 ? 1 + runtime.progress : 1
    return applyRuntimeSpeed(
      layer,
      runtime,
      baseSpeed => baseSpeed * activityMultiplier * progressBoost
    )
  }

  const applyRuntimeSpin = (layer, runtime) => {
    return applyRuntimeSpeed(
      layer,
      runtime,
      baseSpeed => baseSpeed * Math.max(runtime.spinSpeed, runtime.activity || 1)
    )
  }

  const normalizeRenderingLayers = (type, result) => {
    if (result === null || result === undefined) {
      return []
    }

    if (!Array.isArray(result)) {
      throw new TypeError(
        `Rendering handler for type "${type}" must return an array of layers. Received: ${typeof result}`
      )
    }

    return result.filter(Boolean)
  }

  const combinator = entity => {
    const animations = []
    if (entity.sprites) {
      animations.push(entity.sprites)
    }
    if (entity.activity_led_sprites) {
      animations.push(entity.activity_led_sprites)
    }
    return animations
  }
  const normalizeDirectionKey = direction => {
    if (typeof direction === 'string') {
      return direction
    }

    if (typeof direction === 'number' && Number.isFinite(direction)) {
      const cardinal = ['north', 'east', 'south', 'west']
      const normalized = ((Math.trunc(direction) % cardinal.length) + cardinal.length) % cardinal.length
      return cardinal[normalized]
    }

    return null
  }

  const pickDirectionalVariant = (directionalSet, direction = null) => {
    if (!directionalSet || typeof directionalSet !== 'object') return null

    const normalizedDirection = normalizeDirectionKey(direction)
    if (normalizedDirection && directionalSet[normalizedDirection]) {
      return directionalSet[normalizedDirection]
    }

    const preferredDirections = ['north', 'east', 'south', 'west']
    for (const direction of preferredDirections) {
      if (directionalSet[direction]) {
        return directionalSet[direction]
      }
    }

    return Object.values(directionalSet).find(Boolean) || null
  }

  const railPictures = (entity, runtime = {}) => {
    let pictures = []
    // TODO: add runtime direction + variation selection.
    const directionalPictures = pickDirectionalVariant(entity.pictures, runtime.direction)
    if (directionalPictures) {
      pictures.push(directionalPictures.ties)
      pictures.push(directionalPictures.backplates)
      pictures.push(directionalPictures.stone_path)
      pictures.push(directionalPictures.stone_path_background)
      pictures.push(directionalPictures.metals)
    }

    pictures = pictures.filter(Boolean)

    return pictures
  }
  const belts = entity => {
    return [entity.belt_animation_set?.animation_set].filter(Boolean)
  }
  const shiftLayerBy = (layer, deltaX = 0, deltaY = 0) => {
    if (!layer || typeof layer !== 'object') {
      return layer
    }

    const [baseX = 0, baseY = 0] = Array.isArray(layer.shift) ? layer.shift : [0, 0]
    return {
      ...layer,
      shift: [baseX + deltaX, baseY + deltaY]
    }
  }
  const getSplitterBeltOffsets = direction => {
    const normalizedDirection = normalizeDirectionKey(direction)
    if (normalizedDirection === 'east' || normalizedDirection === 'west') {
      return [
        [0, -0.25],
        [0, 0.25]
      ]
    }

    return [
      [-0.25, 0],
      [0.25, 0]
    ]
  }
  const splitters = (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
    const baseBeltLayer = entity.belt_animation_set?.animation_set
    const beltLayers = baseBeltLayer
      ? getSplitterBeltOffsets(runtime.direction).map(([dx, dy]) => shiftLayerBy(baseBeltLayer, dx, dy))
      : []
    const structure = pickDirectionalVariant(entity.structure, runtime.direction)
    const structurePatch = pickDirectionalVariant(entity.structure_patch, runtime.direction)

    // Canvas rendering draws in array order (first -> last), so belts must come first to sit underneath.
    return [...beltLayers, structurePatch, structure].filter(Boolean)
  }
  const undergroundBelts = (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
    const layers = [...belts(entity)]
    const { structure } = entity
    if (!structure || typeof structure !== 'object') {
      return layers
    }

    const beltToGroundType = entity.belt_to_ground_type || runtime.state
    const preferOutput = ['output', 'out', 'direction_out'].includes(beltToGroundType)
    const mainStructureKey = preferOutput ? 'direction_out' : 'direction_in'
    const mainStructure = structure[mainStructureKey] || structure.direction_in || structure.direction_out

    return [structure.back_patch, ...layers, mainStructure, structure.front_patch].filter(Boolean)
  }
  const hasDirectionalKeys = layer => {
    if (!layer || typeof layer !== 'object') {
      return false
    }
    return ['north', 'east', 'south', 'west'].some(direction => layer[direction])
  }
  const resolveDirectionalLayer = (layer, runtime = DEFAULT_RUNTIME_CONTEXT) => {
    if (!layer || typeof layer !== 'object') {
      return layer
    }
    if (!hasDirectionalKeys(layer)) {
      return layer
    }
    return pickDirectionalVariant(layer, runtime.direction)
  }
  const toLayerArray = layer => {
    if (!layer) {
      return []
    }
    if (Array.isArray(layer)) {
      return layer.filter(Boolean)
    }
    if (layer && typeof layer === 'object' && Array.isArray(layer.sheets)) {
      return layer.sheets.filter(Boolean)
    }
    return [layer]
  }
  const getShiftTuple = layer => {
    if (!layer || typeof layer !== 'object' || !Array.isArray(layer.shift)) {
      return [0, 0]
    }
    const [shiftX = 0, shiftY = 0] = layer.shift
    return [toFiniteNumber(shiftX, 0), toFiniteNumber(shiftY, 0)]
  }
  const applyShiftOffsetToLayers = (layers, [deltaX = 0, deltaY = 0]) => {
    if (!Array.isArray(layers) || layers.length === 0 || (deltaX === 0 && deltaY === 0)) {
      return layers
    }
    return layers.map(layer => shiftLayerBy(layer, deltaX, deltaY))
  }
  const toBottomCenterPivotShift = layer => {
    if (!layer || typeof layer !== 'object') {
      return [0, 0]
    }

    const layerHeight = toFiniteNumber(layer.height, 0)
    const layerScale = toFiniteNumber(layer.scale, 1)
    if (layerHeight <= 0) {
      return [0, 0]
    }

    // Renderer centers every sprite on the entity origin. Inserter arm/hand sprites are authored
    // with their "joint" at the bottom center, so shift upward by half their rendered height.
    return [0, (-layerHeight * layerScale) / 64]
  }
  const applyBottomCenterPivotToLayers = layers => {
    if (!Array.isArray(layers) || layers.length === 0) {
      return layers
    }

    const applyBottomCenterPivotToLayer = layer => {
      if (!layer || typeof layer !== 'object') {
        return layer
      }
      if (Array.isArray(layer.layers)) {
        return {
          ...layer,
          layers: layer.layers.map(entry => applyBottomCenterPivotToLayer(entry))
        }
      }

      const [pivotX, pivotY] = toBottomCenterPivotShift(layer)
      return shiftLayerBy(layer, pivotX, pivotY)
    }

    return layers.map(layer => applyBottomCenterPivotToLayer(layer))
  }
  const toRailPieceSprites = piece => {
    if (!piece || typeof piece !== 'object') {
      return piece
    }
    return piece.sprites || piece
  }
  const freezeLayerAnimation = layer => {
    if (!layer || typeof layer !== 'object') {
      return layer
    }

    const frozenLayer = { ...layer }
    if (!Number.isFinite(frozenLayer.animation_speed)) {
      frozenLayer.animation_speed = 0
    }
    if (Array.isArray(frozenLayer.layers)) {
      frozenLayer.layers = frozenLayer.layers.map(entry => freezeLayerAnimation(entry))
    }

    return frozenLayer
  }
  const railSignalPictures = pictureSet => {
    if (!pictureSet || typeof pictureSet !== 'object') {
      return []
    }

    return [
      pictureSet.structure,
      toRailPieceSprites(pictureSet.rail_piece),
      toRailPieceSprites(pictureSet.upper_rail_piece)
    ]
      .filter(Boolean)
      .map(layer => freezeLayerAnimation(layer))
  }
  const inserters = (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
    const active = isRuntimeActive(runtime)
    const selectedHand = active
      ? entity.hand_closed_picture || entity.hand_open_picture
      : entity.hand_open_picture || entity.hand_closed_picture
    const selectedHandShadow = active
      ? entity.hand_closed_shadow || entity.hand_open_shadow
      : entity.hand_open_shadow || entity.hand_closed_shadow

    const platformLayers = toLayerArray(resolveDirectionalLayer(entity.platform_picture, runtime))
    const [platformShiftX, platformShiftY] = getShiftTuple(platformLayers[0])
    const platformAnchorShift = [platformShiftX, platformShiftY]
    const baseHandShadowLayers = toLayerArray(
      applyRuntimeActivity(resolveDirectionalLayer(entity.hand_base_shadow, runtime), runtime)
    )
    const baseHandLayers = toLayerArray(
      applyRuntimeActivity(resolveDirectionalLayer(entity.hand_base_picture, runtime), runtime)
    )
    const handShadowLayers = toLayerArray(
      applyRuntimeActivity(resolveDirectionalLayer(selectedHandShadow, runtime), runtime)
    )
    const handLayers = toLayerArray(
      applyRuntimeActivity(resolveDirectionalLayer(selectedHand, runtime), runtime)
    )
    const alignedBaseHandShadowLayers = applyBottomCenterPivotToLayers(
      applyShiftOffsetToLayers(baseHandShadowLayers, platformAnchorShift)
    )
    const alignedBaseHandLayers = applyBottomCenterPivotToLayers(
      applyShiftOffsetToLayers(baseHandLayers, platformAnchorShift)
    )
    const alignedHandShadowLayers = applyBottomCenterPivotToLayers(
      applyShiftOffsetToLayers(handShadowLayers, platformAnchorShift)
    )
    const alignedHandLayers = applyBottomCenterPivotToLayers(
      applyShiftOffsetToLayers(handLayers, platformAnchorShift)
    )

    return [
      ...platformLayers,
      ...alignedBaseHandShadowLayers,
      ...alignedBaseHandLayers,
      ...alignedHandShadowLayers,
      ...alignedHandLayers
    ].filter(Boolean)
  }
  const rollingStock = entity => {
    // to do
    //needs filenames implements
    let animations = [entity.pictures.rotated, entity.wheels.rotated]
    animations = animations.filter(Boolean)
    return animations
  }
  const selectTurretAnimation = (entity, runtime = {}) => {
    const state = runtime.state || 'prepared'
    switch (state) {
      case 'folded':
        return entity.folded_animation || entity.prepared_animation
      case 'preparing':
        return entity.preparing_animation || entity.prepared_animation
      case 'attacking':
        return entity.attacking_animation || entity.prepared_animation
      default:
        return entity.prepared_animation
    }
  }
  const selectMiningDrillAnimation = (entity, runtime = {}) => {
    const directionalAnimation = pickDirectionalVariant(entity.graphics_set?.animation, runtime.direction)
    return directionalAnimation || entity.graphics_set?.animation
  }
  const selectMiningDrillBasePicture = (entity, runtime = {}) => {
    const directionalBase = pickDirectionalVariant(entity.base_picture, runtime.direction)
    return directionalBase || entity.base_picture
  }
  const entityPrototypes = {
    ...missingPrototypeHandlers,
    arrow: entity => {
      // ArrowPrototype
      return [entity.arrow_picture, entity.circle_picture].filter(Boolean)
    },
    'artillery-flare': entity => {
      // ArtilleryFlarePrototype
      return [entity.pictures?.[0]].filter(Boolean)
    },
    'artillery-projectile': entity => {
      // ArtilleryProjectilePrototype
      return [entity.picture, entity.shadow].filter(Boolean)
    },
    beam: entity => {
      // BeamPrototype
      const beamGraphics = entity.graphics_set?.beam || {}
      const groundGraphics = entity.graphics_set?.ground || {}
      return [
        beamGraphics.head,
        beamGraphics.body,
        beamGraphics.tail,
        beamGraphics.start,
        beamGraphics.ending,
        groundGraphics.head,
        groundGraphics.body,
        groundGraphics.tail
      ].filter(Boolean)
    },
    'character-corpse': entity => {
      // CharacterCorpsePrototype
      return [entity.pictures?.[0]].filter(Boolean)
    },
    cliff: entity => {
      // CliffPrototype
      const first = Object.values(entity.orientations)[0]
      if (first) {
        const pictures = []
        if (first.pictures) {
          pictures.push(first.pictures[0])
        }
        if (first.pictures_lower) {
          pictures.push(first.pictures_lower[0])
        }
        // These are sprite variations
        return pictures
      }
    },
    corpse: entity => {
      // CorpsePrototype
      return [entity.animation?.[0], entity.ground_patch, entity.ground_patch_decay].filter(Boolean)
    },
    'rail-remnants': entity => {
      // RailRemnantsPrototype
      return railPictures(entity)
    },
    'deconstructible-tile-proxy': entity => {
      // DeconstructibleTileProxyPrototype
      return []
    },
    'entity-ghost': entity => {
      // EntityGhostPrototype
      return []
    },
    accumulator: entity => {
      // AccumulatorPrototype
      return [entity.chargable_graphics.charge_animation]
    },
    'agricultural-tower': entity => {
      // AgriculturalTowerPrototype
      return []
    },
    'artillery-turret': entity => {
      // ArtilleryTurretPrototype
      return [entity.base_picture, entity.cannon_barrel_pictures].filter(Boolean)
    },
    'asteroid-collector': entity => {
      // AsteroidCollectorPrototype
      return []
    },
    asteroid: entity => {
      // AsteroidPrototype
      return []
    },
    beacon: entity => {
      // BeaconPrototype
      const animation_list = entity.graphics_set?.animation_list
      if (animation_list) {
        const animations = animation_list.filter(a => a.always_draw).map(a => a.animation)
        return animations
      } else {
        const animations = []
        if (entity.base_picture) {
          animations.push(entity.base_picture)
        }
        if (entity.animation) {
          animations.push(entity.animation)
        }
        return animations
      }
    },
    boiler: (entity, runtime = {}) => {
      // BoilerPrototype
      const animations = []
      if (entity.pictures) {
        const pictures = pickDirectionalVariant(entity.pictures, runtime.direction)
        if (!pictures) {
          return animations
        }
        if (pictures.structure) {
          animations.push(pictures.structure)
        }
        if (pictures.fire) {
          animations.push(pictures.fire)
        }
        if (pictures.fire_glow) {
          // Blend mode is handled by the animation engine via layer blend fields.
          //animations.push(pictures.fire_glow)
        }
        return animations
      }
    },
    'burner-generator': entity => {
      // BurnerGeneratorPrototype
      return [entity.animation].filter(Boolean)
    },
    'cargo-bay': entity => {
      // CargoBayPrototype
      return []
    },
    'cargo-landing-pad': entity => {
      // CargoLandingPadPrototype
      return [entity.graphics_set?.picture, entity.graphics_set?.animation, entity.robot_animation].filter(
        Boolean
      )
    },
    'cargo-pod': entity => {
      // CargoPodPrototype
      return [entity.default_graphic, entity.default_shadow_graphic, entity.sprite].filter(Boolean)
    },
    character: entity => {
      // CharacterPrototype
      const armorRandom = Math.ceil(pageRandom * entity.animations.length)
      const armorAnimation = entity.animations[armorRandom]
      const animations = [
        armorAnimation.idle_with_gun,
        armorAnimation.running_with_gun,
        armorAnimation.mining_with_tool
      ]

      const randomAnimation = Math.ceil(pageRandom * animations.length)
      const animation = animations[randomAnimation]
      return [animation]
    },
    'arithmetic-combinator': entity => {
      // ArithmeticCombinatorPrototype
      return combinator(entity)
    },
    'decider-combinator': entity => {
      // DeciderCombinatorPrototype
      return combinator(entity)
    },
    'selector-combinator': entity => {
      // SelectorCombinatorPrototype
      return combinator(entity)
    },
    'constant-combinator': entity => {
      // ConstantCombinatorPrototype
      return combinator(entity)
    },
    container: entity => {
      // ContainerPrototype
      return [entity.picture]
    },
    'logistic-container': entity => {
      // LogisticContainerPrototype
      return [entity.animation, entity.picture].filter(Boolean)
    },
    'infinity-container': entity => {
      // InfinityContainerPrototype
      return [entity.picture]
    },
    'temporary-container': entity => {
      // TemporaryContainerPrototype
      return [entity.picture].filter(Boolean)
    },
    'assembling-machine': (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // AssemblingMachinePrototype
      const animations = [entity.graphics_set.idle_animation]
      if (entity.graphics_set.always_draw_idle_animation) {
        // TODO: include idle + active layers together when always_draw_idle_animation is true.
      } else {
        animations[0] = entity.graphics_set.animation
      }
      if (entity.graphics_set.working_visualisations) {
        convertEffectLayer(entity.graphics_set.working_visualisations, null, runtime).forEach(a =>
          animations.push(a)
        )
      }
      return animations
    },
    'rocket-silo': entity => {
      // RocketSiloPrototype
      const animations = [
        entity.door_back_sprite,
        entity.door_front_sprite,
        entity.base_front_sprite,
        entity.base_day_sprite,
        entity.shadow_sprite
        //entity.hole_sprite
        //entity.hole_light_sprite,
        //entity.rocket_shadow_overlay_sprite,
        //entity.rocket_glow_overlay_sprite
      ].filter(Boolean)
      // too big!
      return animations
    },
    furnace: (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // FurnacePrototype
      const animations = [entity.graphics_set.animation]
      if (entity.graphics_set.working_visualisations) {
        // Working visualisations are included below; directional variants resolve from runtime direction.
        convertEffectLayer(entity.graphics_set.working_visualisations, null, runtime).forEach(a =>
          animations.push(a)
        )
      }
      return animations
    },
    'display-panel': entity => {
      // DisplayPanelPrototype
      return [entity.sprites]
    },
    'electric-energy-interface': entity => {
      // ElectricEnergyInterfacePrototype
      return [entity.animation, entity.picture].filter(Boolean)
    },
    'electric-pole': entity => {
      // ElectricPolePrototype
      return [entity.pictures]
    },
    'unit-spawner': entity => {
      // EnemySpawnerPrototype
      // needs masks working
      return [entity.graphics_set.animations[0]]
    },
    'capture-robot': entity => {
      // CaptureRobotPrototype
      return []
    },
    'combat-robot': entity => {
      // CombatRobotPrototype
      return [entity.in_motion]
    },
    'construction-robot': entity => {
      // ConstructionRobotPrototype
      return [entity.in_motion]
    },
    'logistic-robot': entity => {
      // LogisticRobotPrototype
      return [entity.in_motion]
    },
    'fusion-generator': entity => {
      // FusionGeneratorPrototype
      return []
    },
    'fusion-reactor': entity => {
      // FusionReactorPrototype
      return []
    },
    gate: entity => {
      // GatePrototype
      return [entity.horizontal_animation]
    },
    generator: entity => {
      // GeneratorPrototype
      return [entity.horizontal_animation]
    },
    'heat-interface': entity => {
      // HeatInterfacePrototype
      return [entity.picture].filter(Boolean)
    },
    'heat-pipe': entity => {
      // HeatPipePrototype
      return entity.connection_sprites?.straight_horizontal || []
    },
    inserter: (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // InserterPrototype
      return inserters(entity, runtime)
    },
    lab: (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // LabPrototype
      // needs masks working
      if (isRuntimeActive(runtime)) {
        return [entity.on_animation].filter(Boolean)
      }
      return [entity.off_animation || entity.on_animation].filter(Boolean)
    },
    lamp: entity => {
      // LampPrototype
      const animations = []
      if (entity.picture_on) {
        animations.push(entity.picture_on)
      }
      if (entity.picture_off) {
        animations.push(entity.picture_off)
      }
      const animation = animations[Math.floor(pageRandom * animations.length)]
      return [animation]
    },
    'land-mine': entity => {
      // LandMinePrototype
      return [entity.picture_safe, entity.picture_set, entity.picture_set_enemy].filter(Boolean)
    },
    'lightning-attractor': entity => {
      // LightningAttractorPrototype
      return []
    },
    'linked-container': entity => {
      // LinkedContainerPrototype
      return [entity.picture].filter(Boolean)
    },
    market: entity => {
      // MarketPrototype
      return [entity.picture].filter(Boolean)
    },
    'mining-drill': (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // MiningDrillPrototype
      const animations = []
      const basePicture = selectMiningDrillBasePicture(entity, runtime)
      const drillAnimation = selectMiningDrillAnimation(entity, runtime)

      if (basePicture) {
        animations.push(basePicture)
      }
      if (drillAnimation) {
        animations.push(applyRuntimeActivity(drillAnimation, runtime))
      }

      if (entity.graphics_set?.working_visualisations && isRuntimeActive(runtime)) {
        convertEffectLayer(entity.graphics_set.working_visualisations, null, runtime).forEach(layer =>
          animations.push(applyRuntimeActivity(layer, runtime))
        )
      }

      if (animations.length > 0) {
        return animations
      }

      if (entity.base_picture) {
        // Sheet/variation support is partial; this path keeps the first practical layers only.
        return [entity.base_picture, entity.graphics_set.animation]
      }
      if (entity.graphics_set) {
        // Directional/state-specific drill visuals are not fully mapped yet.
        return [entity.graphics_set.animation]
      }
    },
    'offshore-pump': (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // OffshorePumpPrototype
      // TODO: normalize base_pictures directional structure to explicit drawable layers.
      const basePictures = pickDirectionalVariant(entity.graphics_set?.base_pictures, runtime.direction)
      const animation = pickDirectionalVariant(entity.graphics_set?.animation, runtime.direction)
      const fluidAnimation = pickDirectionalVariant(entity.graphics_set?.fluid_animation, runtime.direction)
      const layers = [basePictures || entity.graphics_set?.base_pictures, animation].filter(Boolean)

      if (isRuntimeActive(runtime) && fluidAnimation) {
        layers.push(fluidAnimation)
      }

      return layers
    },
    pipe: entity => {
      // PipePrototype
      return [entity.pictures.straight_horizontal]
    },
    'infinity-pipe': entity => {
      // InfinityPipePrototype
      return [entity.pictures?.straight_horizontal].filter(Boolean)
    },
    'pipe-to-ground': (entity, runtime = {}) => {
      // PipeToGroundPrototype
      return [pickDirectionalVariant(entity.pictures, runtime.direction)].filter(Boolean)
    },
    'player-port': entity => {
      // PlayerPortPrototype
      return []
    },
    'power-switch': entity => {
      // PowerSwitchPrototype
      return [entity.power_on_animation]
    },
    'programmable-speaker': entity => {
      // ProgrammableSpeakerPrototype
      return [entity.sprite]
    },
    'proxy-container': entity => {
      // ProxyContainerPrototype
      return [entity.picture].filter(Boolean)
    },
    pump: entity => {
      // PumpPrototype
      return [entity.animations]
    },
    radar: (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // RadarPrototype
      const directionalPicture = pickDirectionalVariant(entity.pictures, runtime.direction) || entity.pictures
      const mainPicture = applyRuntimeSpin(directionalPicture, runtime)
      return [mainPicture, entity.integration_patch].filter(Boolean)
    },
    'curved-rail-a': (entity, runtime = {}) => {
      // CurvedRailAPrototype
      return railPictures(entity, runtime)
    },
    'elevated-curved-rail-a': (entity, runtime = {}) => {
      // ElevatedCurvedRailAPrototype
      return railPictures(entity, runtime)
    },
    'curved-rail-b': (entity, runtime = {}) => {
      // CurvedRailBPrototype
      return railPictures(entity, runtime)
    },
    'elevated-curved-rail-b': (entity, runtime = {}) => {
      // ElevatedCurvedRailBPrototype
      return railPictures(entity, runtime)
    },
    'half-diagonal-rail': (entity, runtime = {}) => {
      // HalfDiagonalRailPrototype
      return railPictures(entity, runtime)
    },
    'elevated-half-diagonal-rail': (entity, runtime = {}) => {
      // ElevatedHalfDiagonalRailPrototype
      return railPictures(entity, runtime)
    },
    'legacy-curved-rail': (entity, runtime = {}) => {
      // LegacyCurvedRailPrototype
      return railPictures(entity, runtime)
    },
    'legacy-straight-rail': (entity, runtime = {}) => {
      // LegacyStraightRailPrototype
      return railPictures(entity, runtime)
    },
    'rail-ramp': (entity, runtime = {}) => {
      // RailRampPrototype
      return railPictures(entity, runtime)
    },
    'straight-rail': (entity, runtime = {}) => {
      // StraightRailPrototype
      return railPictures(entity, runtime)
    },
    'elevated-straight-rail': (entity, runtime = {}) => {
      // ElevatedStraightRailPrototype
      return railPictures(entity, runtime)
    },
    'rail-chain-signal': entity => {
      // RailChainSignalPrototype
      return railSignalPictures(entity.ground_picture_set)
    },
    'rail-signal': entity => {
      // RailSignalPrototype
      return railSignalPictures(entity.ground_picture_set)
    },
    'rail-support': entity => {
      // RailSupportPrototype
      return [entity.graphics_set.structure]
    },
    reactor: (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // ReactorPrototype
      // Blend/tint support is handled by the animation engine during compositing.
      const layers = [entity.lower_layer_picture, entity.picture].filter(Boolean)

      if (entity.working_light_picture && isRuntimeActive(runtime)) {
        const lightLayer = applyRuntimeActivity(
          {
            ...entity.working_light_picture,
            draw_as_light: true
          },
          runtime
        )
        layers.push(lightLayer)
      }

      return layers
    },
    roboport: entity => {
      // RoboportPrototype
      return [
        entity.base,
        entity.base_animation,
        entity.door_animation_up,
        entity.door_animation_down
      ]
    },
    segment: entity => {
      // SegmentPrototype
      return []
    },
    'segmented-unit': entity => {
      // SegmentedUnitPrototype
      return []
    },
    'simple-entity-with-owner': entity => {
      // SimpleEntityWithOwnerPrototype
      return [entity.pictures[0]]
    },
    'simple-entity-with-force': entity => {
      // SimpleEntityWithForcePrototype
      return [entity.pictures[0]]
    },
    'solar-panel': entity => {
      // SolarPanelPrototype
      return [entity.picture]
    },
    'space-platform-hub': entity => {
      // SpacePlatformHubPrototype
      return []
    },
    'spider-leg': entity => {
      // SpiderLegPrototype
      return []
    },
    'spider-unit': entity => {
      // SpiderUnitPrototype
      return []
    },
    'storage-tank': entity => {
      // StorageTankPrototype
      const tankPictures = entity.pictures
      // Sheet support is partial; this currently selects the primary picture layer.
      return [tankPictures.picture]
    },
    thruster: entity => {
      // ThrusterPrototype
      return []
    },
    'train-stop': entity => {
      // TrainStopPrototype
      let animations = [entity.rail_overlay_animations, entity.animations, entity.top_animations]
      animations = animations.filter(Boolean)
      return animations
    },
    'lane-splitter': (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // LaneSplitterPrototype
      return splitters(entity, runtime)
    },
    'linked-belt': entity => {
      // LinkedBeltPrototype
      return belts(entity)
    },
    'loader-1x1': entity => {
      // Loader1x1Prototype
      return belts(entity)
    },
    loader: entity => {
      // Loader1x2Prototype
      return belts(entity)
    },
    splitter: (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // SplitterPrototype
      return splitters(entity, runtime)
    },
    'transport-belt': entity => {
      // TransportBeltPrototype
      return belts(entity)
    },
    'underground-belt': (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // UndergroundBeltPrototype
      return undergroundBelts(entity, runtime)
    },
    turret: (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // TurretPrototype
      // TODO: wire stripe-backed animations into frame extraction/render path.
      return [applyRuntimeActivity(selectTurretAnimation(entity, runtime), runtime)].filter(Boolean)
    },
    'ammo-turret': (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // AmmoTurretPrototype
      return [applyRuntimeActivity(selectTurretAnimation(entity, runtime), runtime)].filter(Boolean)
    },
    'electric-turret': (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // ElectricTurretPrototype
      return [applyRuntimeActivity(selectTurretAnimation(entity, runtime), runtime)].filter(Boolean)
    },
    'fluid-turret': (entity, runtime = DEFAULT_RUNTIME_CONTEXT) => {
      // FluidTurretPrototype
      return [applyRuntimeActivity(selectTurretAnimation(entity, runtime), runtime)].filter(Boolean)
    },
    unit: entity => {
      // UnitPrototype
      return [entity.run_animation]
    },
    valve: entity => {
      // ValvePrototype
      return [entity.animations]
    },
    car: entity => {
      // CarPrototype
      return [entity.animation]
    },
    'artillery-wagon': entity => {
      // ArtilleryWagonPrototype
      return rollingStock(entity)
    },
    'cargo-wagon': entity => {
      // CargoWagonPrototype
      return rollingStock(entity)
    },
    'infinity-cargo-wagon': entity => {
      // InfinityCargoWagonPrototype
      return rollingStock(entity)
    },
    'fluid-wagon': entity => {
      // FluidWagonPrototype
      return rollingStock(entity)
    },
    locomotive: entity => {
      // LocomotivePrototype
      return rollingStock(entity)
    },
    'spider-vehicle': entity => {
      // SpiderVehiclePrototype
      return [
        entity.graphics_set?.base_animation,
        entity.graphics_set?.animation,
        entity.graphics_set?.base_shadow,
        entity.graphics_set?.shadow_animation,
        entity.animation
      ].filter(Boolean)
    },
    wall: entity => {
      // WallPrototype
      return [entity.pictures.straight_horizontal]
    },
    fish: entity => {
      // FishPrototype
      return [entity.pictures[0]]
    },
    'simple-entity': entity => {
      // SimpleEntityPrototype
      return [entity.pictures[0]]
    },
    tree: entity => {
      // TreePrototype currently uses a single variation only (no wind/state variation mapping yet).
      return [entity.pictures[0]]
    },
    plant: entity => {
      // PlantPrototype
      return []
    },
    explosion: entity => {
      // ExplosionPrototype
      return [entity.animations].filter(Boolean)
    },
    fire: entity => {
      // FireFlamePrototype
      return [entity.pictures, entity.secondary_pictures].filter(Boolean)
    },
    stream: entity => {
      // FluidStreamPrototype
      return [entity.spine_animation, entity.particle, entity.shadow].filter(Boolean)
    },
    'highlight-box': entity => {
      // HighlightBoxEntityPrototype
      return []
    },
    'item-entity': entity => {
      // ItemEntityPrototype
      return []
    },
    'item-request-proxy': entity => {
      // ItemRequestProxyPrototype
      return []
    },
    lightning: entity => {
      // LightningPrototype
      return []
    },
    'particle-source': entity => {
      // ParticleSourcePrototype
      return []
    },
    projectile: entity => {
      // ProjectilePrototype
      return [entity.animation, entity.shadow].filter(Boolean)
    },
    resource: entity => {
      // ResourceEntityPrototype
      return [entity.stages]
    },
    'rocket-silo-rocket': entity => {
      // RocketSiloRocketPrototype
      return [entity.rocket_sprite, entity.rocket_shadow_sprite, entity.rocket_glare_overlay_sprite].filter(
        Boolean
      )
    },
    'rocket-silo-rocket-shadow': entity => {
      // RocketSiloRocketShadowPrototype
      return []
    },
    'smoke-with-trigger': entity => {
      // SmokeWithTriggerPrototype
      return [entity.animation].filter(Boolean)
    },
    'speech-bubble': entity => {
      // SpeechBubblePrototype
      return [entity.animation].filter(Boolean)
    },
    sticker: entity => {
      // StickerPrototype
      return [entity.animation].filter(Boolean)
    },
    'tile-ghost': entity => {
      // TileGhostPrototype
      return []
    },
    // Abstract entities
    abstract: entity => {
      // SmokePrototype
      // EntityWithHealthPrototype
      // EntityWithOwnerPrototype
      // CombinatorPrototype
      // CraftingMachinePrototype
      // FlyingRobotPrototype
      // RobotWithLogisticInterfacePrototype
      // RailPrototype
      // RailSignalBasePrototype
      // TransportBeltConnectablePrototype
      // LoaderPrototype
      // VehiclePrototype
      // RollingStockPrototype
      return []
    }
  }

  function convertEffectLayer(layers, animation_key, runtime = DEFAULT_RUNTIME_CONTEXT) {
    if (!Array.isArray(layers) || layers.length === 0) {
      return []
    }

    const directionalAnimationKeys = ['north', 'east', 'south', 'west']
    const isRenderableLayerDef = candidate => {
      if (!candidate || typeof candidate !== 'object') return false
      return Boolean(
        candidate.filename ||
          candidate.stripes ||
          candidate.sheet ||
          candidate.sheets ||
          candidate.filenames ||
          candidate.layers
      )
    }

    const pickDirectionalAnimation = animation => {
      if (!animation || typeof animation !== 'object') return null

      const preferredDirection = normalizeDirectionKey(runtime.direction)
      if (preferredDirection && isRenderableLayerDef(animation[`${preferredDirection}_animation`])) {
        return animation[`${preferredDirection}_animation`]
      }

      for (const direction of directionalAnimationKeys) {
        if (isRenderableLayerDef(animation[`${direction}_animation`])) {
          return animation[`${direction}_animation`]
        }
      }

      if (preferredDirection && isRenderableLayerDef(animation[preferredDirection])) {
        return animation[preferredDirection]
      }

      for (const direction of directionalAnimationKeys) {
        if (isRenderableLayerDef(animation[direction])) {
          return animation[direction]
        }
      }

      return null
    }

    layers = layers.map(layer => {
      let { animation } = layer
      if (!animation) {
        animation = layer
      }
      if (animation_key) {
        animation = animation[animation_key]
      }
      if (!animation) {
        return null
      }

      const directionalAnimation = pickDirectionalAnimation(animation)
      if (directionalAnimation) {
        animation = directionalAnimation
      } else if (
        animation.north_animation ||
        animation.east_animation ||
        animation.south_animation ||
        animation.west_animation
      ) {
        // Directional visualisations without any valid direction are skipped to avoid malformed layers.
        return null
      }
      const newAnimation = {
        ...animation,
        effect: layer.effect,
        fadeout: layer.fadeout
      }
      return newAnimation
    })
    return layers.filter(Boolean)
  }

  function unWrapLayer(layer) {
    //sheets are for varations either rotated or not
    let sheet = null
    if (layer.sheets) {
      sheet = layer.sheets[0]
    } else if (layer.sheet) {
      const { sheet: singleSheet } = layer
      sheet = singleSheet
    } else if (layer.north) {
      return layer.north
    } else {
      if (layer.filenames) {
        return { ...layer, filename: layer.filenames[0] }
      }
      return layer
    }

    if (Number.isFinite(sheet.variation_count) && sheet.variation_count > 0 && sheet.filenames) {
      return { ...sheet, filename: sheet.filenames[0] }
    } else if (
      Number.isFinite(sheet.variation_count) &&
      sheet.variation_count > 0 &&
      Number.isFinite(sheet.frame_count) &&
      sheet.frame_count > 0
    ) {
      return {
        ...sheet,
        height: sheet.height / sheet.variation_count,
        width: sheet.width / sheet.frame_count,
        frame_count: 0,
        line_length: 0
      }
    } else {
      // Some prototypes (for example underground belt structures) wrap a normal sprite in `sheet`
      // without variation/frame metadata. Preserve dimensions as-is so they render correctly.
      return sheet
    }
  }

  async function getProcessedLayers(layers, animation_speed, imageLoader) {
    // Apply animation speed to all layers recursively
    const globalAnimationSpeed = Number.isFinite(animation_speed) ? animation_speed : 1

    // Recursively flatten layers in depth-first order
    // This processes nested layer structures recursively by going deep into each branch before moving to the next
    const flattenLayers = layers => {
      const result = []
      const addShift = (baseShift, deltaShift) => {
        const [baseX = 0, baseY = 0] = Array.isArray(baseShift) ? baseShift : [0, 0]
        const [deltaX = 0, deltaY = 0] = Array.isArray(deltaShift) ? deltaShift : [0, 0]
        return [baseX + deltaX, baseY + deltaY]
      }
      const hasNonZeroShift = shift => {
        if (!Array.isArray(shift)) {
          return false
        }
        return shift[0] !== 0 || shift[1] !== 0
      }

      const processLayer = (layer, animation_speed, inheritedShift = [0, 0]) => {
        if (!layer) {
          return
        }

        if (Array.isArray(layer)) {
          layer.forEach(entry => processLayer(entry, animation_speed, inheritedShift))
          return
        }

        if (typeof layer !== 'object') {
          return
        }

        const unwrappedLayer = unWrapLayer(layer)

        if (!unwrappedLayer) {
          return
        }

        if (Array.isArray(unwrappedLayer)) {
          unwrappedLayer.forEach(entry => processLayer(entry, animation_speed, inheritedShift))
          return
        }

        if (typeof unwrappedLayer !== 'object') {
          return
        }

        const preparedLayer = { ...unwrappedLayer }
        const combinedShift = addShift(inheritedShift, preparedLayer.shift)
        if (hasNonZeroShift(combinedShift)) {
          preparedLayer.shift = combinedShift
        }
        if (!Number.isFinite(preparedLayer.width) && Number.isFinite(preparedLayer.size)) {
          preparedLayer.width = preparedLayer.size
        }
        if (!Number.isFinite(preparedLayer.height) && Number.isFinite(preparedLayer.size)) {
          preparedLayer.height = preparedLayer.size
        }
        if (!Number.isFinite(preparedLayer.animation_speed)) {
          preparedLayer.animation_speed = animation_speed
        }
        if (preparedLayer?.layers) {
          // If this layer has nested layers, recursively process them
          preparedLayer.layers.forEach(a =>
            processLayer(a, preparedLayer.animation_speed, combinedShift)
          )
        } else {
          // If this is a leaf layer, add it to the result
          result.push(preparedLayer)
        }
      }

      layers.forEach(entry => processLayer(entry, animation_speed))
      return result
    }
    const sortedLayers = flattenLayers(layers, animation_speed)

    const layersWithFiles = await Promise.all(
      sortedLayers.map(async layer => {
        const firstStripe = Array.isArray(layer.stripes) ? layer.stripes[0] : null
        const resolvedFilename = layer.filename || firstStripe?.filename
        const source_x = Number.isFinite(layer.source_x) ? layer.source_x : (firstStripe?.x ?? 0)
        const source_y = Number.isFinite(layer.source_y) ? layer.source_y : (firstStripe?.y ?? 0)

        if (!resolvedFilename) {
          throw new Error(
            `Layer is missing filename and stripes filename. Available keys: ${Object.keys(layer).join(', ')}`
          )
        }

        let stripeFiles = null
        if (Array.isArray(layer.stripes) && layer.stripes.length > 0) {
          const uniqueStripeFilenames = [...new Set(layer.stripes.map(stripe => stripe?.filename).filter(Boolean))]
          const loadedStripeFiles = await Promise.all(
            uniqueStripeFilenames.map(async filename => [filename, await imageLoader(filename)])
          )
          stripeFiles = Object.fromEntries(loadedStripeFiles)
        }

        const primaryFile = stripeFiles?.[resolvedFilename] || (await imageLoader(resolvedFilename))

        return {
          ...layer,
          filename: resolvedFilename,
          source_x,
          source_y,
          stripeFiles,
          file: primaryFile
        }
      })
    )

    const shadow = []
    const base = []
    const glow = []
    const light = []

    layersWithFiles.forEach(promise => {
      if (promise.draw_as_shadow) {
        shadow.push(promise)
      } else if (promise.draw_as_glow) {
        glow.push(promise)
      } else if (promise.draw_as_light) {
        light.push(promise)
      } else {
        base.push(promise)
      }
    })

    return {
      shadow,
      base,
      glow,
      light
    }
  }

  return {
    getRenderingMethod: (animationData, runtime = {}) => {
      const handler = entityPrototypes[animationData.type]
      if (!handler) {
        return null
      }
      const runtimeContext = normalizeRuntimeContext(runtime)
      return normalizeRenderingLayers(animationData.type, handler(animationData, runtimeContext))
    },
    getProcessedLayers
  }
}
