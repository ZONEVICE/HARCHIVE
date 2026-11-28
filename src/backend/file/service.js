// =====================================================================================
// IMPORTS.
// =====================================================================================

// The class a write is built with.
const File = require('./model')

// The only door to the file table.
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
//  as the repository gave them.
// =====================================================================================

// Every live file.
_.getAll = () => repository.getAll()

// One live file by id, or null.
_.getById = (id) => repository.getById(id)

// Stores a new file and hands back the stored row, id included.
_.create = (file) => repository.post(file)

// Overwrites a live file and hands back the stored row, or null when there is none.
_.update = (file) => repository.update(file)

// =====================================================================================
// DELETED RECORDS.
//
//  softDelete is what the DELETE route calls. The rest serve backend code only —
//  maintenance and the suites — and no route reaches them.
// =====================================================================================

/**
 * Deletes a live file, stamping the current time.
 * @param {Number} id Id of the file to delete.
 * @returns {Number|null} The id of the deleted file, or null when no live one has that id.
 *  A deleted record never travels to the client, so its id is all that comes back.
 */
_.softDelete = (id) => {
    // The repository matches live rows only, so a second delete finds nothing to stamp.
    const deleted = repository.softDelete(id, getSystemTime())
    if (deleted === null) return null

    return deleted.id
}

// Every deleted file.
_.getDeletedAll = () => repository.getDeletedAll()

// One deleted file by id, or null.
_.getDeletedById = (id) => repository.getDeletedById(id)

// Brings a deleted file back exactly as it was. Hands back the row, or null when no deleted
//  file has that id.
_.restoreSoftDelete = (id) => repository.restoreSoftDelete(id)

// Removes a file for good, live or deleted.
_.hardDelete = (id) => repository.deleteById(id)

// =====================================================================================
// MODEL CONSTRUCTION.
// =====================================================================================

/**
 * Builds a File out of a create request body.
 * @param {String} body.name The file name.
 * @param {String} body.hash_256_sha The SHA-256 of the contents.
 * @param {String} body.relative_path The path inside its workspace.
 * @param {String} body.extension The extension.
 * @returns {Object} The model to hand to create(). Its id is left to the database.
 */
_.buildForCreate = (body) => {
    // Nothing is normalised: this entity has no identity key, so every value is stored as it
    //  arrived.
    const file = new File()
    file.setName(body.name)
    file.setHash256Sha(body.hash_256_sha)
    file.setRelativePath(body.relative_path)
    file.setExtension(body.extension)

    return file
}

/**
 * Builds a File out of an update request body. The whole record is replaced.
 * @param {Number} body.id Id of the file being written.
 * @param {String} body.name The file name.
 * @param {String} body.hash_256_sha The SHA-256 of the contents.
 * @param {String} body.relative_path The path inside its workspace.
 * @param {String} body.extension The extension.
 * @returns {Object} The model to hand to update().
 */
_.buildForUpdate = (body) => {
    // deleted_at stays null: an update never writes it, so the model does not carry one.
    const file = new File()
    file.setClass(
        body.id,
        body.name,
        body.hash_256_sha,
        body.relative_path,
        body.extension,
        null
    )

    return file
}

module.exports = _
