const _ = {}

_.isString = v => typeof v === 'string'
_.isBoolean = v => typeof v === 'boolean'
_.isNumberOrNull = v => v === null || typeof v === 'number'

module.exports = _
