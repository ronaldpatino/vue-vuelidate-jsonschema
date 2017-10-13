var additionalPropertiesValidator = require('./validators/additionalProperties')
var anyOfValidator = require('./validators/anyOf')
var betweenValidator = require('./validators/between')
var enumValidator = require('./validators/enum')
var equalValidator = require('./validators/const')
var isFunction = require('lodash/isFunction')
var isPlainObject = require('lodash/isPlainObject')
var itemsValidator = require('./validators/items')
var maxItemsValidator = require('./validators/maxItems')
var maxLengthValidator = require('./validators/maxLength')
var maxPropertiesValidator = require('./validators/maxProperties')
var maxValidator = require('./validators/maximum')
var minItemsValidator = require('./validators/minItems')
var minLengthValidator = require('./validators/minLength')
var minPropertiesValidator = require('./validators/minProperties')
var minValidator = require('./validators/minimum')
var multipleOfValidator = require('./validators/multipleOf')
var notValidator = require('./validators/not')
var oneOfValidator = require('./validators/oneOf')
var patternPropertiesValidator = require('./validators/patternProperties')
var patternValidator = require('./validators/pattern')
var reduce = require('lodash/reduce')
var requiredValidator = require('./validators/required')
var typeArrayValidator = require('./validators/typeArray')
var typeValidator = require('./validators/type')
var uniq = require('lodash/uniq')
var uniqueValidator = require('./validators/uniqueItems')
var validators = require('vuelidate/lib/validators')

function mergeIntoArray(to, from) {
  var allKeys = uniq(Object.keys(to).concat(Object.keys(from)))

  allKeys.forEach(function(key) {
    var toVal = to[key]
    var fromVal = from[key]

    if (to.hasOwnProperty(key) && from.hasOwnProperty(key) && isFunction(fromVal)) {
      to[key] = [].concat(toVal).concat(fromVal)
    } else if (isPlainObject(toVal) && isPlainObject(fromVal)) {
      mergeIntoArray(toVal, fromVal)
    } else if (fromVal) {
      to[key] = fromVal
    }
  })
}

function createAndValidator(obj) {
  Object.keys(obj).forEach(function(key) {
    // TODO: are array valid in a vuelidate validations config? if so we need a different approach
    var value = obj[key]
    if (Array.isArray(value)) {
      obj[key] = validators.and.apply(null, value)
    } else if (isPlainObject(value)) {
      createAndValidator(value)
    }
  })
}

function impossiblevalidator() {
  return false
}

function getPropertyValidationRules(propertySchema, isRequired, isAttached, propKey) {
  var validationObj = {}

  // support for boolean schemas
  if (propertySchema === true) {
    return validationObj
  } else if (propertySchema === false) {
    validationObj.schemaImpossible = impossiblevalidator
    return validationObj
  }

  function has(name) {
    return propertySchema.hasOwnProperty(name)
  }

  // add child properties
  if (has('properties')) {
    var req = propertySchema.required || []
    validationObj = reduce(propertySchema.properties, function(all, childPropSchema, propKey) {
      var propRequired = req.indexOf(propKey) !== -1
      all[propKey] = getPropertyValidationRules(childPropSchema, propRequired, isAttached, propKey)
      return all
    }, validationObj)
  }

  if (Array.isArray(propertySchema.type)) {
    validationObj.schemaTypes = typeArrayValidator(propertySchema, propertySchema.type.map(function(type) {
      return typeValidator(propertySchema, type)
    }))
  } else if (has('type')) {
    validationObj.schemaType = typeValidator(propertySchema, propertySchema.type)
  }

  if (isRequired) {
    validationObj.schemaRequired = requiredValidator(propertySchema, isAttached)
  }

  if (has('oneOf')) {
    validationObj.schemaOneOf = oneOfValidator(propertySchema, propertySchema.oneOf, getPropertyValidationRules)
  }

  if (has('anyOf')) {
    validationObj.schemaAnyOf = anyOfValidator(propertySchema, propertySchema.anyOf, getPropertyValidationRules)
  }

  if (has('not')) {
    validationObj.schemaNot = notValidator(propertySchema, propertySchema.not, getPropertyValidationRules)
  }

  if (has('minLength')) {
    validationObj.schemaMinLength = minLengthValidator(propertySchema, propertySchema.minLength)
  }

  if (has('maxLength')) {
    validationObj.schemaMaxLength = maxLengthValidator(propertySchema, propertySchema.maxLength)
  }

  if (has('minItems')) {
    validationObj.schemaMinItems = minItemsValidator(propertySchema, propertySchema.minItems)
  }

  if (has('maxItems')) {
    validationObj.schemaMaxItems = maxItemsValidator(propertySchema, propertySchema.maxItems)
  }

  if (has('minimum') && has('maximum')) {
    validationObj.schemaBetween = betweenValidator(propertySchema, propertySchema.minimum, propertySchema.maximum)
  } else if (has('minimum')) {
    validationObj.schemaMinimum = minValidator(propertySchema, propertySchema.minimum)
  } else if (has('maximum')) {
    validationObj.schemaMaximum = maxValidator(propertySchema, propertySchema.maximum)
  }

  if (has('maxProperties')) {
    validationObj.schemaMaxProperties = maxPropertiesValidator(propertySchema, propertySchema.maxProperties)
  }

  if (has('minProperties')) {
    validationObj.schemaMinProperties = minPropertiesValidator(propertySchema, propertySchema.minProperties)
  }

  if (has('multipleOf')) {
    validationObj.schemaMultipleOf = multipleOfValidator(propertySchema, propertySchema.multipleOf)
  }

  if (has('pattern')) {
    validationObj.schemaPattern = patternValidator(propertySchema, new RegExp(propertySchema.pattern))
  }

  if (has('patternProperties')) {
    validationObj.schemaPatternProperties = patternPropertiesValidator(propertySchema, propertySchema.patternProperties, getPropertyValidationRules)
  }

  if (has('additionalProperties')) {
    validationObj.schemaAdditionalProperties = additionalPropertiesValidator(propertySchema, propertySchema.additionalProperties, getPropertyValidationRules)
  }

  if (has('enum')) {
    validationObj.schemaEnum = enumValidator(propertySchema, propertySchema.enum)
  }

  if (has('const')) {
    validationObj.schemaConst = equalValidator(propertySchema, propertySchema.const)
  }

  if (has('uniqueItems')) {
    validationObj.schemaUniqueItems = uniqueValidator(propertySchema)
  }

  // TODO we can't check statically for type, EVER
  if (has('items') && propertySchema.type === 'array' && isPlainObject(propertySchema.items)) {
    validationObj.$each = getPropertyValidationRules(propertySchema.items, true, true)
  } else if (has('items')) {
    validationObj.schemaItems = itemsValidator(propertySchema, getPropertyValidationRules)
  }

  if (has('allOf')) {
    propertySchema.allOf.forEach(function(schema) {
      mergeIntoArray(validationObj, getPropertyValidationRules(schema, false, isAttached))
    })

    createAndValidator(validationObj)
  }

  return validationObj
}

module.exports = {
  getPropertyValidationRules: getPropertyValidationRules
}
