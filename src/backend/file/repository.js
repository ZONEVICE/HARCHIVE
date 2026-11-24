// =====================================================================================
// CONNECTION.
// =====================================================================================

// The one shared connection, taken once at module load and never closed.
const db = require('../core/db').getSharedConnection()

// Everything this file publishes.
const _ = {}

// =====================================================================================
// TABLE.
// =====================================================================================

// Note: no column here is an identity key. A file is told apart by its id, so name, path and
//  hash are all stored exactly as they arrived — a name folded to lower case would be data
//  loss, and a hash is a byte string nothing may touch.
_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS file (
        id            INTEGER PRIMARY KEY,
        name          TEXT NOT NULL,
        hash_256_sha  TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        extension     TEXT NOT NULL,
        deleted_at    INTEGER
    );
`

// Builds the table and an index on name, the column the file manager searches by. One call
//  builds the whole table.
_.createTable = () => {
    db.prepare(_.CREATE_TABLE).run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_file_name ON file (name);').run()
}

// =====================================================================================
// READS.
//
//  Live rows only: every query here carries deleted_at IS NULL, and nothing turns it off.
//  Deleted rows are read by their own family, further down.
// =====================================================================================

/**
 * Reads every live file.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getAll = () => db.prepare('SELECT * FROM file WHERE deleted_at IS NULL').all().map(readRow)

/**
 * Reads one live file by its id.
 * @param {Number} id Id of the file to read.
 * @returns {Object|null} The row, or null when no live file has that id.
 */
_.getById = (id) => readRow(db.prepare('SELECT * FROM file WHERE id = ? AND deleted_at IS NULL').get(id))

// =====================================================================================
// WRITES.
//
//  Both end in RETURNING *, so the stored row comes back in the same statement. Neither
//  names deleted_at: a create is born live, and an update never deletes or restores.
// =====================================================================================

/**
 * Stores a new file.
 * @param {Object} file The file to store. Its id is left to the database.
 * @returns {Object} The stored row, id included.
 */
_.post = (file) => readRow(db.prepare(
    'INSERT INTO file (name, hash_256_sha, relative_path, extension) VALUES (?, ?, ?, ?) RETURNING *'
).get(file.name, file.hash_256_sha, file.relative_path, file.extension))

/**
 * Overwrites a live file with the values it carries.
 * @param {Object} file The file to write, id included.
 * @returns {Object|null} The stored row as it ended up, or null when no live file has that id.
 */
_.update = (file) => readRow(db.prepare(
    'UPDATE file SET name = ?, hash_256_sha = ?, relative_path = ?, extension = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(file.name, file.hash_256_sha, file.relative_path, file.extension, file.id))

// =====================================================================================
// DELETED RECORDS.
//
//  Everything that reads or changes the deleted state, keyed on the id like this entity's
//  DELETE route. softDelete is the only one a route reaches; the rest serve backend code.
// =====================================================================================

/**
 * Reads every deleted file.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getDeletedAll = () => db.prepare('SELECT * FROM file WHERE deleted_at IS NOT NULL').all().map(readRow)

/**
 * Reads one deleted file by its id.
 * @param {Number} id Id of the file to read.
 * @returns {Object|null} The row, or null when no deleted file has that id.
 */
_.getDeletedById = (id) => readRow(db.prepare('SELECT * FROM file WHERE id = ? AND deleted_at IS NOT NULL').get(id))

/**
 * Marks a live file as deleted. One already deleted is not matched, so its first stamp stays.
 * @param {Number} id Id of the file to mark.
 * @param {Number} deleted_at Moment of the deletion, in epoch seconds. Decided by the caller.
 * @returns {Object|null} The marked row, or null when no live file has that id.
 */
_.softDelete = (id, deleted_at) => readRow(db.prepare(
    'UPDATE file SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(deleted_at, id))

/**
 * Clears the mark of a deleted file without touching the rest of the row.
 * @param {Number} id Id of the file to bring back.
 * @returns {Object|null} The restored row, or null when no deleted file has that id.
 */
_.restoreSoftDelete = (id) => readRow(db.prepare(
    'UPDATE file SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL RETURNING *'
).get(id))

// =====================================================================================
// PHYSICAL DELETES.
//
//  No route reaches this section. It serves maintenance written on purpose, and the suites
//  purging what they created.
// =====================================================================================

/**
 * Removes one file from the database for good, live or deleted.
 * @param {Number} id Id of the file to remove.
 * @returns {Object} The driver's report: changes is 1 when a row was removed.
 */
_.deleteById = (id) => db.prepare('DELETE FROM file WHERE id = ?').run(id)

// =====================================================================================
// LOCAL FUNCTIONS.
// =====================================================================================

/**
 * The one shape a row leaves this file in.
 * @param {Object|undefined} row What the driver answered.
 * @returns {Object|null} The plain row, or null when the driver found nothing.
 */
function readRow(row) {
    // A miss answers undefined, and every caller of this file branches on null instead.
    if (row === undefined) return null

    // Note: this table has no boolean column, so the row leaves exactly as it came.
    return row
}

module.exports = _
