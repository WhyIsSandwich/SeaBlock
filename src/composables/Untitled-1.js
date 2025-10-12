{

  name: 'string',
  order: 'number', //order of the rule in the tooltip
  type: 'statistics|section',
  //only run rules for a given entity
  forType: 'entity|etc',
  shownInTooltip: 'boolean', //whether this rule should be shown in the tooltip
  //How to get a value from the data object mandatory if key not key not provided
  getValue: function(data,context){},
  //extra conditions for when this should be rule should be run, isTooltip is always checked as are any other conditions set in the rule
  condition: function(data,context){},
  //transforms the obtained format can use registered patterns or custom (mostly for simple rules that return a formatted string)
  transform: function(value){},

}


