// =====================================================================================
// IMPORTS.
// =====================================================================================

// The three entity catalogues: a scope must name a member of one of them.
const { ENTITY_HTTP, ENTITY_INTERNAL, ENTITY_REBEL } = require('../core/constants')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// PREDICATES.
//
//  Deliberately duplicated in every HTTP entity, so the folder stays liftable. The last
//  three are this entity's own: the flags and the scope column, and the ways they may arrive.
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

// True for a boolean or nothing at all. The four flags are optional on create: what the
//  client omits stays false, which is the model default and the safe answer.
_.isOptionalBoolean = (v) => v === undefined || _.isBoolean(v)

/**
 * True for the name of an entity of the system, or an explicit null meaning every entity. The
 *  name is checked against the catalogues, never a position in them, so adding or re-sorting
 *  an entity never reinterprets a stored row.
 * @param {String|null} v The scope as it arrived.
 * @returns {Boolean} True when it is a legal scope.
 */
_.isValidScope = (v) => {
    // Null is the widest scope, and a legal one.
    if (v === null) return true

    // Any other value must be a name from one of the three catalogues.
    return ENTITY_HTTP.includes(v) || ENTITY_INTERNAL.includes(v) || ENTITY_REBEL.includes(v)
}

// The same, plus the option of leaving it out entirely on create — and then it is null, the
//  widest scope. Safe only because the four flags default to false: the resulting permission
//  reaches every entity and grants nothing.
_.isOptionalValidScope = (v) => v === undefined || _.isValidScope(v)

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

    // The scope and the four flags are optional, and checked only when sent.
    if (_.isOptionalValidScope(body.entity) === false) return false
    if (_.isOptionalBoolean(body.can_read) === false) return false
    if (_.isOptionalBoolean(body.can_create) === false) return false
    if (_.isOptionalBoolean(body.can_edit) === false) return false
    if (_.isOptionalBoolean(body.can_delete) === false) return false

    return true
}

/**
 * Checks the body of an update request.
 *
 * Note: the four flags are required here, and so is the scope. An update replaces the whole
 *  record, so an omitted flag would silently clear a right, and an omitted scope would
 *  silently widen a permission scoped to one entity into a permission over all of them —
 *  which is the escalation the scope column exists to prevent. A global permission has to say
 *  so, by sending entity: null explicitly.
 * @param {Object} body The raw req.body.
 * @returns {Boolean} True when the request may go through.
 */
_.validateUpdate = (body) => {
    // The row the update targets, then every field it writes.
    if (_.isId(body.id) === false) return false
    if (_.isString(body.name) === false) return false
    if (_.isValidScope(body.entity) === false) return false
    if (_.isBoolean(body.can_read) === false) return false
    if (_.isBoolean(body.can_create) === false) return false
    if (_.isBoolean(body.can_edit) === false) return false
    if (_.isBoolean(body.can_delete) === false) return false

    return true
}

module.exports = _
