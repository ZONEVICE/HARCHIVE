// =====================================================================================
// IMPORTS.
// =====================================================================================

// The class a write is built with.
const WorkSpace = require('./model')

// The only door to the workspace table.
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

// Every live workspace.
_.getAll = () => repository.getAll()

// One live workspace by id, or null.
_.getById = (id) => repository.getById(id)

// One live workspace by absolute path, or null, whatever accent shape or padding it was typed in.
//  No route reaches it yet: the file-manager work will grow its answer without its callers
//  changing.
_.getByPathAbsolute = (path_absolute) => {
    // Normalised first, because that is the shape the column is stored in.
    const normalised = _.normalizePathAbsolute(path_absolute)
    return repository.getByPathAbsolute(normalised)
}

// Stores a new workspace and hands back the stored row, id included.
_.create = (workspace) => repository.post(workspace)

// Overwrites a live workspace and hands back the stored row, or null when there is none.
_.update = (workspace) => repository.update(workspace)

// =====================================================================================
// DELETED RECORDS.
//
//  softDelete is what the DELETE route calls. The rest serve backend code only —
//  maintenance and the suites — and no route reaches them.
// =====================================================================================

/**
 * Deletes a live workspace, stamping the current time.
 * @param {Number} id Id of the workspace to delete.
 * @returns {Number|null} The id of the deleted workspace, or null when no live one has that id.
 *  A deleted record never travels to the client, so its id is all that comes back.
 */
_.softDelete = (id) => {
    // The repository matches live rows only, so a second delete finds nothing to stamp.
    const deleted = repository.softDelete(id, getSystemTime())
    if (deleted === null) return null

    return deleted.id
}

// Every deleted workspace.
_.getDeletedAll = () => repository.getDeletedAll()

// One deleted workspace by id, or null.
_.getDeletedById = (id) => repository.getDeletedById(id)

// One deleted workspace by absolute path, or null. Normalised like every lookup by the key.
_.getDeletedByPathAbsolute = (path_absolute) => {
    // Normalised first, because that is the shape the column is stored in.
    const normalised = _.normalizePathAbsolute(path_absolute)
    return repository.getDeletedByPathAbsolute(normalised)
}

// Brings a deleted workspace back exactly as it was. Hands back the row, or null when no deleted
//  workspace has that id.
_.restoreSoftDelete = (id) => repository.restoreSoftDelete(id)

// Removes a workspace for good, live or deleted.
_.hardDelete = (id) => repository.deleteById(id)

// =====================================================================================
// NORMALISATION.
// =====================================================================================

/**
 * The one shape an absolute path is ever stored or compared in.
 *
 * Note: NFC and trim, and deliberately no lower case — the one identity key of the project
 *  that is not folded. A filesystem path is case-sensitive on every OS this project targets,
 *  so /home/V/ and /home/v/ are two different directories and folding them would merge two
 *  workspaces into one. NFC still matters: the same accented path typed on another operating
 *  system must not arrive as a different byte string that matches nothing.
 * @param {String} path_absolute The path as it arrived.
 * @returns {String} The path as the column holds it.
 */
_.normalizePathAbsolute = (path_absolute) => path_absolute.normalize('NFC').trim()

// =====================================================================================
// MODEL CONSTRUCTION.
// =====================================================================================

/**
 * Builds a WorkSpace out of a create request body.
 * @param {String} body.name The display name.
 * @param {String} body.path_absolute The absolute directory, normalised on the way in.
 * @param {String} body.path_relative The relative path, stored as it arrived.
 * @returns {Object} The model to hand to create(). Its id is left to the database.
 */
_.buildForCreate = (body) => {
    // The identity key is the one field normalised; the rest are stored as they came.
    const workspace = new WorkSpace()
    workspace.name = body.name
    workspace.path_absolute = _.normalizePathAbsolute(body.path_absolute)
    workspace.path_relative = body.path_relative

    return workspace
}

/**
 * Builds a WorkSpace out of an update request body. The whole record is replaced.
 * @param {Number} body.id Id of the workspace being written.
 * @param {String} body.name The display name.
 * @param {String} body.path_absolute The absolute directory, normalised on the way in.
 * @param {String} body.path_relative The relative path, stored as it arrived.
 * @returns {Object} The model to hand to update().
 */
_.buildForUpdate = (body) => {
    // deleted_at stays null: an update never writes it, so the model does not carry one.
    const workspace = new WorkSpace()
    workspace.setClass(
        body.id,
        body.name,
        _.normalizePathAbsolute(body.path_absolute),
        body.path_relative,
        null
    )

    return workspace
}

// =====================================================================================
// UNIQUENESS GUARDS.
//
//  A deleted workspace still holds its UNIQUE path, so the handlers ask both families before
//  storing: a controlled 409 instead of the constraint blowing up into a 500.
// =====================================================================================

// True when a live workspace holds the path.
_.isPathTaken = (path_absolute) => _.getByPathAbsolute(path_absolute) !== null

// True when a deleted workspace holds the path. The client cannot see that workspace, so it
//  gets a 409 of its own.
_.isPathHeldByDeleted = (path_absolute) => _.getDeletedByPathAbsolute(path_absolute) !== null

/**
 * The live guard for an update, ignoring the workspace being updated so it can keep its own path.
 * @param {String} path_absolute The path to check.
 * @param {Number} id Id of the workspace being updated.
 * @returns {Boolean} True when another live workspace already holds the path.
 */
_.isPathTakenByAnother = (path_absolute, id) => {
    // Nobody holds it: free.
    const clash = _.getByPathAbsolute(path_absolute)
    if (clash === null) return false

    // Held by the workspace itself: still free for it.
    return clash.id !== id
}

module.exports = _
