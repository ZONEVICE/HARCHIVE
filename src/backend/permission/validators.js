const _ = {}

_.isString = v => typeof v === 'string'
_.isNumber = v => typeof v === 'number'
_.isBoolean = v => typeof v === 'boolean'
_.isNumberOrNull = v => v === null || typeof v === 'number'
// The four flags are optional on create: what the client omits stays false, which is the
//  model default and the safe answer.
_.isOptionalBoolean = v => v === undefined || typeof v === 'boolean'

// Validates the body of a create request. The id is assigned by the database and deleted_at is
//  not accepted here, so only the name and the four flags are checked.
_.validatePost = (body) => {
    if (!_.isString(body.name)) return false
    if (!_.isOptionalBoolean(body.can_read)) return false
    if (!_.isOptionalBoolean(body.can_create)) return false
    if (!_.isOptionalBoolean(body.can_edit)) return false
    if (!_.isOptionalBoolean(body.can_delete)) return false
    return true
}

// Validates the body of an update request. The four flags are required here: an update replaces
//  the whole record, so an omitted flag would silently clear a right. deleted_at is the client
//  flag: a boolean, or null/absent to leave the stored value untouched.
_.validateUpdate = (body) => {
    if (!_.isNumber(body.id)) return false
    if (!_.isString(body.name)) return false
    if (!_.isBoolean(body.can_read)) return false
    if (!_.isBoolean(body.can_create)) return false
    if (!_.isBoolean(body.can_edit)) return false
    if (!_.isBoolean(body.can_delete)) return false
    if (body.deleted_at !== undefined && body.deleted_at !== null && !_.isBoolean(body.deleted_at)) return false
    return true
}

module.exports = _
