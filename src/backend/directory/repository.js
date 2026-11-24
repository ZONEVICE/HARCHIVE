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

// Note: name is not UNIQUE and not an identity key: two directories with the same name under
//  different parents are legitimate, and what contains what is a relation, never a column.
//  The three dates are epoch seconds and nullable: a directory may be stored before anything
//  has scanned it.
_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS directory (
        id                     INTEGER PRIMARY KEY,
        name                   TEXT NOT NULL,
        date_scan              INTEGER,
        date_creation          INTEGER,
        date_last_modification INTEGER,
        deleted_at             INTEGER
    );
`

// Builds the table and an index on name, the column the file manager searches by. One call
//  builds the whole table.
_.createTable = () => {
    db.prepare(_.CREATE_TABLE).run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_directory_name ON directory (name);').run()
}

// =====================================================================================
// READS.
//
//  Live rows only: every query here carries deleted_at IS NULL, and nothing turns it off.
//  Deleted rows are read by their own family, further down.
// =====================================================================================

/**
 * Reads every live directory.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getAll = () => db.prepare('SELECT * FROM directory WHERE deleted_at IS NULL').all().map(readRow)

/**
 * Reads one live directory by its id.
 * @param {Number} id Id of the directory to read.
 * @returns {Object|null} The row, or null when no live directory has that id.
 */
_.getById = (id) => readRow(db.prepare('SELECT * FROM directory WHERE id = ? AND deleted_at IS NULL').get(id))

// =====================================================================================
// WRITES.
//
//  Both end in RETURNING *, so the stored row comes back in the same statement. Neither
//  names deleted_at: a create is born live, and an update never deletes or restores.
// =====================================================================================

/**
 * Stores a new directory.
 * @param {Object} directory The directory to store. Its id is left to the database.
 * @returns {Object} The stored row, id included.
 */
_.post = (directory) => readRow(db.prepare(
    'INSERT INTO directory (name, date_scan, date_creation, date_last_modification) VALUES (?, ?, ?, ?) RETURNING *'
).get(directory.name, directory.date_scan, directory.date_creation, directory.date_last_modification))

/**
 * Overwrites a live directory with the values it carries.
 * @param {Object} directory The directory to write, id included.
 * @returns {Object|null} The stored row as it ended up, or null when no live directory has that id.
 */
_.update = (directory) => readRow(db.prepare(
    'UPDATE directory SET name = ?, date_scan = ?, date_creation = ?, date_last_modification = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(directory.name, directory.date_scan, directory.date_creation, directory.date_last_modification, directory.id))

// =====================================================================================
// DELETED RECORDS.
//
//  Everything that reads or changes the deleted state, keyed on the id like this entity's
//  DELETE route. softDelete is the only one a route reaches; the rest serve backend code.
// =====================================================================================

/**
 * Reads every deleted directory.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getDeletedAll = () => db.prepare('SELECT * FROM directory WHERE deleted_at IS NOT NULL').all().map(readRow)

/**
 * Reads one deleted directory by its id.
 * @param {Number} id Id of the directory to read.
 * @returns {Object|null} The row, or null when no deleted directory has that id.
 */
_.getDeletedById = (id) => readRow(db.prepare('SELECT * FROM directory WHERE id = ? AND deleted_at IS NOT NULL').get(id))

/**
 * Marks a live directory as deleted. One already deleted is not matched, so its first stamp stays.
 * @param {Number} id Id of the directory to mark.
 * @param {Number} deleted_at Moment of the deletion, in epoch seconds. Decided by the caller.
 * @returns {Object|null} The marked row, or null when no live directory has that id.
 */
_.softDelete = (id, deleted_at) => readRow(db.prepare(
    'UPDATE directory SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(deleted_at, id))

/**
 * Clears the mark of a deleted directory without touching the rest of the row.
 * @param {Number} id Id of the directory to bring back.
 * @returns {Object|null} The restored row, or null when no deleted directory has that id.
 */
_.restoreSoftDelete = (id) => readRow(db.prepare(
    'UPDATE directory SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL RETURNING *'
).get(id))

// =====================================================================================
// PHYSICAL DELETES.
//
//  No route reaches this section. It serves maintenance written on purpose, and the suites
//  purging what they created.
// =====================================================================================

/**
 * Removes one directory from the database for good, live or deleted.
 * @param {Number} id Id of the directory to remove.
 * @returns {Object} The driver's report: changes is 1 when a row was removed.
 */
_.deleteById = (id) => db.prepare('DELETE FROM directory WHERE id = ?').run(id)

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
