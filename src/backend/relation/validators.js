const { SYSTEM_ENTITIES } = require('../core/constants')
const { RELATION_TYPES } = require('./types-of-relation')

const _ = {}

_.isString = v => typeof v === 'string'
_.isNumber = v => typeof v === 'number'
_.isNullableString = v => v == null || typeof v === 'string'
_.isValidEntity = v => SYSTEM_ENTITIES.includes(v)
_.isValidRelationType = v => RELATION_TYPES.includes(v)

module.exports = _
