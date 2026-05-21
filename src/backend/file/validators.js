const _ = {}

_.isString = v => typeof v === 'string'
_.isArrayOfStrings = v => Array.isArray(v) && v.every(i => typeof i === 'string')

module.exports = _
