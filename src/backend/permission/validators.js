const { SYSTEM_ENTITIES } = require('../core/constants')

const _ = {}

_.isString = v => typeof v === 'string'
_.isNumber = v => typeof v === 'number'
_.isBoolean = v => typeof v === 'boolean'
_.isNumberOrNull = v => v === null || typeof v === 'number'
// Ids arriving in the URL are strings (`req.params.id`). The controller passes them through
//  Number() first, and this says whether the result is a usable id: the database assigns them as
//  INTEGER PRIMARY KEY, so they are whole and start at 1.
_.isId = v => Number.isInteger(v) && v > 0
// The four flags are optional on create: what the client omits stays false, which is the
//  model default and the safe answer.
_.isOptionalBoolean = v => v === undefined || typeof v === 'boolean'
// The scope: the name of one of SYSTEM_ENTITIES, or null for a permission that applies to
//  every entity. The name is checked against the catalogue, never a position in it, so adding
//  or reordering an entity never reinterprets a stored row.
_.isValidScope = v => v === null || SYSTEM_ENTITIES.includes(v)
// On create the scope may be left out entirely, and then it is null — the widest one. That is
//  safe only because the four flags default to false: the resulting permission reaches every
//  entity and grants nothing.
_.isOptionalValidScope = v => v === undefined || _.isValidScope(v)

// Validates the body of a create request. The id is assigned by the database and deleted_at is
//  not accepted here, so only the name, the scope and the four flags are checked.
_.validatePost = (body) => {
    if (!_.isString(body.name)) return false
    if (!_.isOptionalValidScope(body.entity)) return false
    if (!_.isOptionalBoolean(body.can_read)) return false
    if (!_.isOptionalBoolean(body.can_create)) return false
    if (!_.isOptionalBoolean(body.can_edit)) return false
    if (!_.isOptionalBoolean(body.can_delete)) return false
    return true
}

// Validates the body of an update request. The four flags are required here: an update replaces
//  the whole record, so an omitted flag would silently clear a right. deleted_at is the client
//  flag: a boolean, or null/absent to leave the stored value untouched.
//
// `entity` is required too, and for the mirror-image reason: leaving it out of an update would
//  silently widen a permission scoped to one entity into a permission over all of them, which is
//  the escalation this column exists to prevent. A global permission has to say so, by sending
//  `entity: null` explicitly.
_.validateUpdate = (body) => {
    if (!_.isNumber(body.id)) return false
    if (!_.isString(body.name)) return false
    if (!_.isValidScope(body.entity)) return false
    if (!_.isBoolean(body.can_read)) return false
    if (!_.isBoolean(body.can_create)) return false
    if (!_.isBoolean(body.can_edit)) return false
    if (!_.isBoolean(body.can_delete)) return false
    if (body.deleted_at !== undefined && body.deleted_at !== null && !_.isBoolean(body.deleted_at)) return false
    return true
}

module.exports = _
