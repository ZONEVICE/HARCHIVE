const { SYSTEM_ENTITIES } = require('../core/constants')
const { RELATION_TYPES } = require('./types-of-relation')

const _ = {}

_.isString = v => typeof v === 'string'
_.isNumber = v => typeof v === 'number'
_.isNullableString = v => v == null || typeof v === 'string'
_.isBoolean = v => typeof v === 'boolean'
_.isNumberOrNull = v => v === null || typeof v === 'number'
_.isValidEntity = v => SYSTEM_ENTITIES.includes(v)
_.isValidRelationType = v => RELATION_TYPES.includes(v)

module.exports = _
