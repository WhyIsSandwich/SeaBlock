function noGraphicsLayers() {
  return []
}

export const missingPrototypeHandlers = {
  entity: noGraphicsLayers,
  entitywithhealth: noGraphicsLayers,
  entitywithowner: noGraphicsLayers,
  combinator: noGraphicsLayers,
  craftingmachine: noGraphicsLayers,
  flyingrobot: noGraphicsLayers,
  robotwithlogisticinterface: noGraphicsLayers,
  rail: noGraphicsLayers,
  railsignalbase: noGraphicsLayers,
  transportbeltconnectable: noGraphicsLayers,
  vehicle: noGraphicsLayers,
  rollingstock: noGraphicsLayers,
  smoke: noGraphicsLayers
}
