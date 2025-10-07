/*

https://lua-api.factorio.com/latest/prototypes/Prototype.html Children section has html to generate this

function generateFactorioPrototypeMapping() {
  // Find the details element containing the prototype hierarchy
  const detailsElement = document.querySelector('details ul');
  
  if (!detailsElement) {
    console.error('Could not find prototype hierarchy details element');
    return {};
  }

  const prototypeMapping = {};
  const baseTypes = [];
  const subtypeToBaseType = {};
  const baseTypeToSubtypes = {};
  
  // Get all direct child li elements (base types)
  const topLevelItems = Array.from(detailsElement.children).filter(child => child.tagName === 'LI');
  
  topLevelItems.forEach(baseLi => {
    const baseLink = baseLi.querySelector('a');
    if (!baseLink) return;
    
    // Extract the actual prototype name from the span content
    const span = baseLi.querySelector('span');
    let baseTypeName;
    
    if (span) {
      const spanText = span.textContent.trim();
      // Check if it contains 'abstract'
      if (spanText.includes('abstract')) {
        // Use the link text, lowercased, without the final 'Prototype' word
        baseTypeName = baseLink.textContent.trim().toLowerCase().replace(/prototype$/, '');
      } else {
        // Extract the name from the span (between quotes)
        const match = spanText.match(/'([^']+)'/);
        baseTypeName = match ? match[1] : baseLink.textContent.trim();
      }
    } else {
      baseTypeName = baseLink.textContent.trim();
    }
    
    baseTypes.push(baseTypeName);
    
    // Find all nested li elements (subtypes) - look for li elements that are not direct children
    const subtypeItems = baseLi.querySelectorAll('ul li');
    const subtypes = [];
    
    subtypeItems.forEach(subtypeLi => {
      const subtypeLink = subtypeLi.querySelector('a');
      if (!subtypeLink) return;
      
      const subtypeSpan = subtypeLi.querySelector('span');
      let subtypeName;
      
      if (subtypeSpan) {
        const spanText = subtypeSpan.textContent.trim();
        // Check if it contains 'abstract'
        if (spanText.includes('abstract')) {
          // Use the link text, lowercased, without the final 'Prototype' word
          subtypeName = subtypeLink.textContent.trim().toLowerCase().replace(/prototype$/, '');
        } else {
          // Extract the name from the span (between quotes)
          const match = spanText.match(/'([^']+)'/);
          subtypeName = match ? match[1] : subtypeLink.textContent.trim();
        }
      } else {
        subtypeName = subtypeLink.textContent.trim();
      }
      
      subtypes.push(subtypeName);
      
      // Map subtype to base type
      subtypeToBaseType[subtypeName] = baseTypeName;
      
      // Store subtype info
      prototypeMapping[subtypeName] = {
        type: 'subtype',
        baseType: baseTypeName
      };
    });
    
    // Include the base type itself in its subtypes list
    const allTypes = [baseTypeName, ...subtypes];
    
    // Store subtypes for this base type (including the base type itself)
    prototypeMapping[baseTypeName] = {
      type: 'base',
      subtypes: allTypes
    };
    baseTypeToSubtypes[baseTypeName] = allTypes;
    
    // Also map the base type to itself
    subtypeToBaseType[baseTypeName] = baseTypeName;
  });
  
  return {
    prototypeMapping,
    baseTypes,
    subtypeToBaseType,
    baseTypeToSubtypes,
    
    // Utility functions
    isBaseType: (name) => baseTypes.includes(name),
    isSubtype: (name) => prototypeMapping[name]?.type === 'subtype',
    getBaseType: (subtypeName) => subtypeToBaseType[subtypeName],
    getSubtypes: (baseTypeName) => baseTypeToSubtypes[baseTypeName] || [],
    getAllSubtypes: () => Object.keys(subtypeToBaseType)
  };
}
const mapping = generateFactorioPrototypeMapping()
JSON.stringify(mapping.baseTypeToSubtypes, null, 2)


*/

const baseTypeToSubtypes = {
  achievement: [
    'achievement',
    'achievementprototypewithcondition',
    'complete-objective-achievement',
    'dont-build-entity-achievement',
    'dont-craft-manually-achievement',
    'dont-kill-manually-achievement',
    'dont-research-before-researching-achievement',
    'dont-use-entity-in-energy-production-achievement',
    'build-entity-achievement',
    'change-surface-achievement',
    'combat-robot-count-achievement',
    'construct-with-robots-achievement',
    'create-platform-achievement',
    'deconstruct-with-robots-achievement',
    'deliver-by-robots-achievement',
    'deplete-resource-achievement',
    'destroy-cliff-achievement',
    'equip-armor-achievement',
    'group-attack-achievement',
    'kill-achievement',
    'module-transfer-achievement',
    'place-equipment-achievement',
    'player-damaged-achievement',
    'produce-achievement',
    'produce-per-hour-achievement',
    'research-achievement',
    'research-with-science-pack-achievement',
    'shoot-achievement',
    'space-connection-distance-traveled-achievement',
    'train-path-achievement',
    'use-entity-in-energy-production-achievement',
    'use-item-achievement'
  ],
  activetrigger: ['activetrigger', 'chain-active-trigger', 'delayed-active-trigger'],
  'airborne-pollutant': ['airborne-pollutant'],
  'ammo-category': ['ammo-category'],
  'asteroid-chunk': ['asteroid-chunk'],
  'autoplace-control': ['autoplace-control'],
  'burner-usage': ['burner-usage'],
  'collision-layer': ['collision-layer'],
  'custom-event': ['custom-event'],
  'custom-input': ['custom-input'],
  'damage-type': ['damage-type'],
  'optimized-decorative': ['optimized-decorative'],
  entity: [
    'entity',
    'arrow',
    'artillery-flare',
    'artillery-projectile',
    'beam',
    'character-corpse',
    'cliff',
    'corpse',
    'rail-remnants',
    'deconstructible-tile-proxy',
    'entity-ghost',
    'entitywithhealth',
    'entitywithowner',
    'accumulator',
    'agricultural-tower',
    'artillery-turret',
    'asteroid-collector',
    'asteroid',
    'beacon',
    'boiler',
    'burner-generator',
    'cargo-bay',
    'cargo-landing-pad',
    'cargo-pod',
    'character',
    'combinator',
    'arithmetic-combinator',
    'decider-combinator',
    'selector-combinator',
    'constant-combinator',
    'container',
    'logistic-container',
    'infinity-container',
    'temporary-container',
    'craftingmachine',
    'assembling-machine',
    'rocket-silo',
    'furnace',
    'display-panel',
    'electric-energy-interface',
    'electric-pole',
    'unit-spawner',
    'flyingrobot',
    'capture-robot',
    'combat-robot',
    'robotwithlogisticinterface',
    'construction-robot',
    'logistic-robot',
    'fusion-generator',
    'fusion-reactor',
    'gate',
    'generator',
    'heat-interface',
    'heat-pipe',
    'inserter',
    'lab',
    'lamp',
    'land-mine',
    'lightning-attractor',
    'linked-container',
    'market',
    'mining-drill',
    'offshore-pump',
    'pipe',
    'infinity-pipe',
    'pipe-to-ground',
    'player-port',
    'power-switch',
    'programmable-speaker',
    'proxy-container',
    'pump',
    'radar',
    'rail',
    'curved-rail-a',
    'elevated-curved-rail-a',
    'curved-rail-b',
    'elevated-curved-rail-b',
    'half-diagonal-rail',
    'elevated-half-diagonal-rail',
    'legacy-curved-rail',
    'legacy-straight-rail',
    'rail-ramp',
    'straight-rail',
    'elevated-straight-rail',
    'railsignalbase',
    'rail-chain-signal',
    'rail-signal',
    'rail-support',
    'reactor',
    'roboport',
    'segment',
    'segmented-unit',
    'simple-entity-with-owner',
    'simple-entity-with-force',
    'solar-panel',
    'space-platform-hub',
    'spider-leg',
    'spider-unit',
    'storage-tank',
    'thruster',
    'train-stop',
    'transportbeltconnectable',
    'lane-splitter',
    'linked-belt',
    'loader',
    'loader-1x1',
    'loader',
    'splitter',
    'transport-belt',
    'underground-belt',
    'turret',
    'ammo-turret',
    'electric-turret',
    'fluid-turret',
    'unit',
    'valve',
    'vehicle',
    'car',
    'rollingstock',
    'artillery-wagon',
    'cargo-wagon',
    'infinity-cargo-wagon',
    'fluid-wagon',
    'locomotive',
    'spider-vehicle',
    'wall',
    'fish',
    'simple-entity',
    'tree',
    'plant',
    'explosion',
    'fire',
    'stream',
    'highlight-box',
    'item-entity',
    'item-request-proxy',
    'lightning',
    'particle-source',
    'projectile',
    'resource',
    'rocket-silo-rocket',
    'rocket-silo-rocket-shadow',
    'smoke',
    'smoke-with-trigger',
    'speech-bubble',
    'sticker',
    'tile-ghost'
  ],
  'equipment-category': ['equipment-category'],
  'equipment-grid': ['equipment-grid'],
  equipment: [
    'equipment',
    'active-defense-equipment',
    'battery-equipment',
    'belt-immunity-equipment',
    'energy-shield-equipment',
    'equipment-ghost',
    'generator-equipment',
    'inventory-bonus-equipment',
    'movement-bonus-equipment',
    'night-vision-equipment',
    'roboport-equipment',
    'solar-panel-equipment'
  ],
  fluid: ['fluid'],
  'fuel-category': ['fuel-category'],
  'item-group': ['item-group'],
  item: [
    'item',
    'ammo',
    'capsule',
    'gun',
    'item-with-entity-data',
    'item-with-label',
    'item-with-inventory',
    'blueprint-book',
    'item-with-tags',
    'selection-tool',
    'blueprint',
    'copy-paste-tool',
    'deconstruction-item',
    'spidertron-remote',
    'upgrade-item',
    'module',
    'rail-planner',
    'space-platform-starter-pack',
    'tool',
    'armor',
    'repair-tool'
  ],
  'item-subgroup': ['item-subgroup'],
  'mod-data': ['mod-data'],
  'module-category': ['module-category'],
  'noise-expression': ['noise-expression'],
  'noise-function': ['noise-function'],
  'optimized-particle': ['optimized-particle'],
  'procession-layer-inheritance-group': ['procession-layer-inheritance-group'],
  procession: ['procession'],
  quality: ['quality'],
  'recipe-category': ['recipe-category'],
  recipe: ['recipe'],
  'resource-category': ['resource-category'],
  shortcut: ['shortcut'],
  'space-connection': ['space-connection'],
  'space-location': ['space-location', 'planet'],
  'surface-property': ['surface-property'],
  surface: ['surface'],
  technology: ['technology'],
  tile: ['tile'],
  'trivial-smoke': ['trivial-smoke'],
  'virtual-signal': ['virtual-signal']
}

const subtypeToBaseType = Object.fromEntries(
  Object.entries(baseTypeToSubtypes).flatMap(([baseType, subtypes]) =>
    subtypes.map(subtype => [subtype, baseType])
  )
)

console.log(subtypeToBaseType)

export function useFactorioPrototypeMapping(language = 'en') {
  return {
    baseTypeToSubtypes,
    subtypeToBaseType,
    language
  }
}
