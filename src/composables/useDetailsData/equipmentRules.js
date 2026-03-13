import { sectionTypes } from '../detailsDataTypes.js'
import { parseAttackParameters, parseGenericItemEffect } from '../useAttackParametersParser.js'

export const equipmentRules = [
  {
    name: sectionTypes.effect,
    order: 1,
    type: 'section',
    forType: 'equipment',
    shownInTooltip: true,
    getValue: (data, context) => {
      if (data.equipment?.attack_parameters) {
        return parseAttackParameters(data.equipment.attack_parameters, context, false)
      }
      if (data.equipment?.effect !== undefined) {
        return parseGenericItemEffect(data.equipment.effect)
      }
      return null
    },
    condition: data =>
      data.equipment?.attack_parameters !== undefined || data.equipment?.effect !== undefined
  }
]

export const equipmentSectionRules = equipmentRules.filter(rule => rule.type === 'section')
