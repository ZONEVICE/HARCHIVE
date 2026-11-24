// =====================================================================================
// IMPORTS.
// =====================================================================================

// The class a write is built with.
const Metadata = require('./model')

// The only door to the metadata table.
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

// Every live metadata record.
_.getAll = () => repository.getAll()

// One live record by id, or null.
_.getById = (id) => repository.getById(id)

// One live record by name, or null, whatever casing or accent shape the name was typed in.
_.getByName = (name) => repository.getByName(_.normalizeName(name))

// Stores a new record and hands back the stored row, id included.
_.create = (metadata) => repository.post(metadata)

// Overwrites a live record and hands back the stored row, or null when there is no such record.
_.update = (metadata) => repository.update(metadata)

// =====================================================================================
// DELETED RECORDS.
//
//  Note: keyed on the name, like the DELETE route and like the repository. softDeleteByName
//  is what that route calls; the rest serve backend code only — the seeder, maintenance, the
//  suites — and no route reaches them.
// =====================================================================================

/**
 * Deletes a live metadata record, stamping the current time.
 * @param {String} name The name, in any casing. Normalised here.
 * @returns {Number|null} The id of the deleted record, or null when no live record has that
 *  name. A deleted record never travels to the client, so its id is all that comes back.
 */
_.softDeleteByName = (name) => {
    // The repository matches live rows only, so a second delete finds nothing to stamp.
    const deleted = repository.softDeleteByName(_.normalizeName(name), getSystemTime())
    if (deleted === null) return null

    return deleted.id
}

// Every deleted metadata record.
_.getDeletedAll = () => repository.getDeletedAll()

// One deleted record by id, or null.
_.getDeletedById = (id) => repository.getDeletedById(id)

// One deleted record by name, or null. Normalised like every lookup by the identity key.
_.getDeletedByName = (name) => repository.getDeletedByName(_.normalizeName(name))

// Brings a deleted record back exactly as it was, value included. Hands back the row, or null
//  when no deleted record has that name.
_.restoreSoftDeleteByName = (name) => repository.restoreSoftDeleteByName(_.normalizeName(name))

// Removes a record for good, live or deleted.
_.hardDeleteByName = (name) => repository.deleteByName(_.normalizeName(name))

// =====================================================================================
// NORMALISATION.
// =====================================================================================

/**
 * The one shape a metadata name is ever stored or compared in.
 *
 * NFC composes the accents, so a name typed on another operating system or keyboard cannot
 *  arrive as a different byte string that displays identically and matches nothing. The lower
 *  case is what makes the UNIQUE column case-insensitive, and it has to happen here because
 *  SQLite folds ASCII only: COLLATE NOCASE would file 'CAFÉ' and 'café' as two records.
 *  The value is left alone — it is not an identity key and may hold anything.
 * @param {String} name The name as it arrived.
 * @returns {String} The name as the column holds it.
 */
_.normalizeName = (name) => name.normalize('NFC').trim().toLowerCase()

// =====================================================================================
// MODEL CONSTRUCTION.
// =====================================================================================

/**
 * Builds a Metadata out of a create request body.
 * @param {String} body.name The name, normalised on the way in.
 * @param {String} body.value The value, stored exactly as it arrived.
 * @returns {Object} The model to hand to create(). Its id is left to the database.
 */
_.buildForCreate = (body) => {
    // The identity key is the one field normalised. The value is assigned unconditionally:
    //  a metadata record *is* its value.
    const metadata = new Metadata()
    metadata.name = _.normalizeName(body.name)
    metadata.value = body.value

    return metadata
}

/**
 * Builds a Metadata out of an update request body. The whole record is replaced.
 * @param {Number} body.id Id of the record being written.
 * @param {String} body.name The name, normalised on the way in.
 * @param {String} body.value The value, stored exactly as it arrived.
 * @returns {Object} The model to hand to update().
 */
_.buildForUpdate = (body) => {
    // deleted_at stays null: an update never writes it, so the model does not carry one.
    const metadata = new Metadata()
    metadata.setClass(body.id, _.normalizeName(body.name), body.value, null)

    return metadata
}

// =====================================================================================
// UNIQUENESS GUARDS.
//
//  A deleted record still holds its UNIQUE name, so the handlers ask both families before
//  storing: a controlled 409 instead of the constraint blowing up into a 500.
// =====================================================================================

// True when a live record holds the name.
_.isNameTaken = (name) => _.getByName(name) !== null

// True when a deleted record holds the name. The client cannot see that record, so it gets a
//  409 of its own.
_.isNameHeldByDeleted = (name) => _.getDeletedByName(name) !== null

/**
 * The live guard for an update, ignoring the record being updated so it can keep its own name.
 * @param {String} name The name to check.
 * @param {Number} id Id of the record being updated.
 * @returns {Boolean} True when another live record already holds the name.
 */
_.isNameTakenByAnother = (name, id) => {
    // Nobody holds it: free.
    const clash = _.getByName(name)
    if (clash === null) return false

    // Held by the record itself: still free for it.
    return clash.id !== id
}

module.exports = _
