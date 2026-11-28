// =====================================================================================
// IMPORTS.
// =====================================================================================

// The class a write is built with.
const Directory = require('./model')

// The only door to the directory table.
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

// Every live directory.
_.getAll = () => repository.getAll()

// One live directory by id, or null.
_.getById = (id) => repository.getById(id)

// Stores a new directory and hands back the stored row, id included.
_.create = (directory) => repository.post(directory)

// Overwrites a live directory and hands back the stored row, or null when there is none.
_.update = (directory) => repository.update(directory)

// =====================================================================================
// DELETED RECORDS.
//
//  softDelete is what the DELETE route calls. The rest serve backend code only —
//  maintenance and the suites — and no route reaches them.
// =====================================================================================

/**
 * Deletes a live directory, stamping the current time.
 * @param {Number} id Id of the directory to delete.
 * @returns {Number|null} The id of the deleted directory, or null when no live one has that id.
 *  A deleted record never travels to the client, so its id is all that comes back.
 */
_.softDelete = (id) => {
    // The repository matches live rows only, so a second delete finds nothing to stamp.
    const deleted = repository.softDelete(id, getSystemTime())
    if (deleted === null) return null

    return deleted.id
}

// Every deleted directory.
_.getDeletedAll = () => repository.getDeletedAll()

// One deleted directory by id, or null.
_.getDeletedById = (id) => repository.getDeletedById(id)

// Brings a deleted directory back exactly as it was. Hands back the row, or null when no deleted
//  directory has that id.
_.restoreSoftDelete = (id) => repository.restoreSoftDelete(id)

// Removes a directory for good, live or deleted.
_.hardDelete = (id) => repository.deleteById(id)

// =====================================================================================
// MODEL CONSTRUCTION.
// =====================================================================================

/**
 * Builds a Directory out of a create request body.
 * @param {String} body.name The directory name.
 * @param {Number} body.date_scan Optional. Last scan, in epoch seconds, or null.
 * @param {Number} body.date_creation Optional. Creation on disk, in epoch seconds, or null.
 * @param {Number} body.date_last_modification Optional. Last change, in epoch seconds, or null.
 * @returns {Object} The model to hand to create(). Its id is left to the database.
 */
_.buildForCreate = (body) => {
    // The name is required. Nothing is normalised: this entity has no identity key.
    const directory = new Directory()
    directory.setName(body.name)

    // The three dates are optional, and a date the client omits is stored as NULL.
    directory.setDateScan(body.date_scan ?? null)
    directory.setDateCreation(body.date_creation ?? null)
    directory.setDateLastModification(body.date_last_modification ?? null)

    return directory
}

/**
 * Builds a Directory out of an update request body. The whole record is replaced.
 * @param {Number} body.id Id of the directory being written.
 * @param {String} body.name The directory name.
 * @param {Number} body.date_scan Optional. Last scan, in epoch seconds, or null.
 * @param {Number} body.date_creation Optional. Creation on disk, in epoch seconds, or null.
 * @param {Number} body.date_last_modification Optional. Last change, in epoch seconds, or null.
 * @returns {Object} The model to hand to update().
 */
_.buildForUpdate = (body) => {
    // deleted_at stays null: an update never writes it. An omitted date is stored as NULL,
    //  because an update replaces the whole record.
    const directory = new Directory()
    directory.setClass(
        body.id,
        body.name,
        body.date_scan ?? null,
        body.date_creation ?? null,
        body.date_last_modification ?? null,
        null
    )

    return directory
}

module.exports = _
