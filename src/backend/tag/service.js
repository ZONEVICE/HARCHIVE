// =====================================================================================
// IMPORTS.
// =====================================================================================

// The class a write is built with.
const Tag = require('./model')

// The only door to the tag table.
const repository = require('./repository')

// The shared clock, in epoch seconds.
const { getSystemTime } = require('../core/time')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// DATA ACCESS.
//
//  This service is the only door to repository.js: a controller never reaches the repository
//  itself. Every primitive there is exposed here, used or not, and answers plain rows exactly
//  as the repository gave them. A lookup by the identity key normalises it first.
// =====================================================================================

// Every live tag.
_.getAll = () => repository.getAll()

// One live tag by id, or null.
_.getById = (id) => repository.getById(id)

// One live tag by name, or null, whatever casing or accent shape the name was typed in.
_.getByName = (name) => repository.getByName(_.normalizeName(name))

// Stores a new tag and hands back the stored row, id included.
_.create = (tag) => repository.post(tag)

// Overwrites a live tag and hands back the stored row, or null when there is no such tag.
_.update = (tag) => repository.update(tag)

// =====================================================================================
// DELETED RECORDS.
//
//  softDelete is what the DELETE route calls. The rest serve backend code only — the
//  seeder, maintenance, the suites — and no route reaches them.
// =====================================================================================

/**
 * Deletes a live tag, stamping the current time.
 * @param {Number} id Id of the tag to delete.
 * @returns {Number|null} The id of the deleted tag, or null when no live tag has that id. A
 *  deleted record never travels to the client, so its id is all that comes back.
 */
_.softDelete = (id) => {
    // The repository matches live rows only, so a second delete finds nothing to stamp.
    const deleted = repository.softDelete(id, getSystemTime())
    if (deleted === null) return null

    return deleted.id
}

// Every deleted tag.
_.getDeletedAll = () => repository.getDeletedAll()

// One deleted tag by id, or null.
_.getDeletedById = (id) => repository.getDeletedById(id)

// One deleted tag by name, or null. Normalised like every lookup by the identity key.
_.getDeletedByName = (name) => repository.getDeletedByName(_.normalizeName(name))

// Brings a deleted tag back exactly as it was. Hands back the row, or null when no deleted tag
//  has that id.
_.restoreSoftDelete = (id) => repository.restoreSoftDelete(id)

// Removes a tag for good, live or deleted.
_.hardDelete = (id) => repository.deleteById(id)

// =====================================================================================
// NORMALISATION.
// =====================================================================================

/**
 * The one shape a tag name is ever stored or compared in.
 *
 * NFC composes the accents, so `artístico` typed on two different keyboards is one tag and
 *  not two byte strings that look identical. The lower case is what makes the UNIQUE column
 *  case-insensitive, and it belongs here rather than on the column because SQLite folds ASCII
 *  only — COLLATE NOCASE would let 'ARTÍSTICO' in beside 'artístico'. Lower case is also the
 *  convention this catalogue follows, Danbooru style, like the `implies` relation it uses.
 * @param {String} name The name as it arrived.
 * @returns {String} The name as the column holds it.
 */
_.normalizeName = (name) => name.normalize('NFC').trim().toLowerCase()

// =====================================================================================
// MODEL CONSTRUCTION.
// =====================================================================================

/**
 * Builds a Tag out of a create request body.
 * @param {String} body.name The name, normalised on the way in.
 * @param {String} body.metadata Optional. The JSON blob. Absent keeps the model default, '{}'.
 * @returns {Object} The model to hand to create(). Its id is left to the database.
 */
_.buildForCreate = (body) => {
    // The identity key is the one field normalised; the blob is stored as it came.
    const tag = new Tag()
    tag.name = _.normalizeName(body.name)

    // Assigned only when it was sent, so an omitted blob keeps the model's own default.
    if (body.metadata !== undefined) tag.metadata = body.metadata

    return tag
}

/**
 * Builds a Tag out of an update request body. The whole record is replaced.
 * @param {Number} body.id Id of the tag being written.
 * @param {String} body.name The name, normalised on the way in.
 * @param {String} body.metadata The JSON blob, as text.
 * @returns {Object} The model to hand to update().
 */
_.buildForUpdate = (body) => {
    // deleted_at stays null: an update never writes it, so the model does not carry one.
    const tag = new Tag()
    tag.setClass(body.id, _.normalizeName(body.name), body.metadata, null)

    return tag
}

// =====================================================================================
// UNIQUENESS GUARDS.
//
//  A deleted tag still holds its UNIQUE name, so the handlers ask both families before
//  storing: a controlled 409 instead of the constraint blowing up into a 500.
// =====================================================================================

// True when a live tag holds the name.
_.isNameTaken = (name) => _.getByName(name) !== null

// True when a deleted tag holds the name. The client cannot see that tag, so it gets a 409
//  of its own.
_.isNameHeldByDeleted = (name) => _.getDeletedByName(name) !== null

/**
 * The live guard for an update, ignoring the tag being updated so it can keep its own name.
 * @param {String} name The name to check.
 * @param {Number} id Id of the tag being updated.
 * @returns {Boolean} True when another live tag already holds the name.
 */
_.isNameTakenByAnother = (name, id) => {
    // Nobody holds it: free.
    const clash = _.getByName(name)
    if (clash === null) return false

    // Held by the tag itself: still free for it.
    return clash.id !== id
}

module.exports = _
