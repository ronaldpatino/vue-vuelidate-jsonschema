var vuelidate = require('vuelidate')
var isPlainObject = require('lodash/isPlainObject')
var every = require('lodash/every')
var pullAll = require('lodash/pullAll')
var validate = require('../validate')

module.exports = function additionalPropertiesValidator(propertySchema, additionalProperties, getPropertyValidationRules) {
  return vuelidate.withParams({
    type: 'schemaAdditionalProperties',
    additionalProperties: additionalProperties,
    schema: propertySchema
  }, function(object) {
    if (!object || !isPlainObject(object)) return true
    var keys = Object.keys(object)
    var properties = Object.keys(propertySchema.properties || {})
    var additionalKeys
    if (additionalProperties === true || additionalProperties === undefined) {
      return true
    } else {
      if (!propertySchema.patternProperties) {
        if (additionalProperties === false) {
          return keys.every(function(key) {
            return properties.indexOf(key) !== -1
          })
        } else {
          additionalKeys = pullAll(keys, properties)
        }
      } else {
        var patternKeys = Object.keys(propertySchema.patternProperties).map(function(key) {
          return new RegExp(key)
        })

        additionalKeys = keys.filter(function(key) {
          if (propertySchema.properties && propertySchema.properties[key]) { return false }

          return !patternKeys.some(function(regexp) {
            return regexp.test(key)
          })
        })
      }

      if (additionalProperties === false) {
        return additionalKeys.length === 0
      } else if (isPlainObject(additionalProperties)) {
        var validatorGroup = getPropertyValidationRules(additionalProperties)

        return every(additionalKeys, function(additionalKey) {
          var innerProp = object[additionalKey]
          return validate(validatorGroup, innerProp)
        })
      }
    }

    return true
  })
}
