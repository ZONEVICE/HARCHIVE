// =====================================================================================
// IMPORTS.
// =====================================================================================

// The three entity catalogues: an end must name a member of one of them.
const { ENTITY_HTTP, ENTITY_INTERNAL, ENTITY_REBEL } = require('../core/constants')

// The fixed catalogue of relation types.
const { RELATION_TYPES } = require('./types-of-relation')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// PREDICATES.
//
//  Deliberately duplicated in every HTTP entity, so the folder stays liftable. The last
//  three are this entity's own: the note and the two catalogue checks a relation is built on.
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

// True for text, an explicit null, or nothing at all. The note is optional free text.
_.isNullableString = (v) => v === undefined || v === null || _.isString(v)

// True when the name belongs to an entity of any of the three kinds. Membership is checked,
//  never a position, so the catalogues may be re-sorted. Whether that entity owns a table
//  needs the database, so the service asks it.
_.isValidEntity = (v) => ENTITY_HTTP.includes(v) || ENTITY_INTERNAL.includes(v) || ENTITY_REBEL.includes(v)

// True when the value is a type of the catalogue.
_.isValidRelationType = (v) => RELATION_TYPES.includes(v)

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
    // The first end.
    if (_.isId(body.id_1) === false) return false
    if (_.isValidEntity(body.entity_1) === false) return false

    // The second end.
    if (_.isId(body.id_2) === false) return false
    if (_.isValidEntity(body.entity_2) === false) return false

    // What the link means, and the optional words saying it.
    if (_.isValidRelationType(body.relation_type) === false) return false
    if (_.isNullableString(body.note) === false) return false

    return true
}

/**
 * Checks the body of an update request. It names the row it targets and carries every field,
 *  because an update replaces the whole record.
 * @param {Object} body The raw req.body.
 * @returns {Boolean} True when the request may go through.
 */
_.validateUpdate = (body) => {
    // The row the update targets.
    if (_.isId(body.id) === false) return false

    // Then every field it writes, exactly as a create checks them.
    return _.validatePost(body)
}

module.exports = _
