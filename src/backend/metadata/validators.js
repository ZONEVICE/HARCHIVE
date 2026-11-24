// =====================================================================================
// STATE.
// =====================================================================================

// Everything this file publishes.
const _ = {}

// =====================================================================================
// PREDICATES.
//
//  Deliberately duplicated in every HTTP entity, so the folder stays liftable.
// =====================================================================================

// True when the value is text.
_.isString = (v) => typeof v === 'string'

// True when the value is a number. NaN is excluded: it is what Number() answers for a
//  malformed route parameter.
_.isNumber = (v) => typeof v === 'number' && Number.isNaN(v) === false

// True when the value is a real boolean, never a truthy string.
_.isBoolean = (v) => typeof v === 'boolean'

// True when the value can be an id: INTEGER PRIMARY KEY values are whole and start at 1.
_.isId = (v) => Number.isInteger(v) && v > 0

// =====================================================================================
// REQUEST VALIDATORS.
//
//  One per operation, each reading the raw req.body. None accepts deleted_at: only the
//  deleted-record primitives write it, so a body carrying one has it ignored.
// =====================================================================================

/**
 * Checks the body of a create request. The id is assigned by the database.
 * @param {Object} body The raw req.body.
 * @returns {Boolean} True when the request may go through.
 */
_.validatePost = (body) => {
    // The identity key is required.
    if (_.isString(body.name) === false) return false

    // The value is the record: a metadata entry without one has nothing to say.
    if (_.isString(body.value) === false) return false

    return true
}

/**
 * Checks the body of an update request. It names the row it targets and carries every field,
 *  because an update replaces the whole record.
 * @param {Object} body The raw req.body.
 * @returns {Boolean} True when the request may go through.
 */
_.validateUpdate = (body) => {
    // The row the update targets, then every field it writes.
    if (_.isId(body.id) === false) return false
    if (_.isString(body.name) === false) return false
    if (_.isString(body.value) === false) return false

    return true
}

module.exports = _
