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

// Note: path_absolute is this entity's identity key. It arrives normalised — NFC and trimmed,
//  done by the service — and, unlike every other identity key of the project, it is NOT
//  folded to lower case: a filesystem path is case-sensitive, so /home/V/ and /home/v/ are two
//  directories. A plain UNIQUE then compares exactly. name and path_relative are stored as
//  they arrived.
_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS workspace (
        id            INTEGER PRIMARY KEY,
        name          TEXT NOT NULL,
        path_absolute TEXT NOT NULL UNIQUE,
        path_relative TEXT NOT NULL,
        deleted_at    INTEGER
    );
`

// Builds the table. Called once during boot, before anything reads or writes. The UNIQUE
//  constraint already indexes path_absolute, the only column looked up besides the id.
_.createTable = () => db.prepare(_.CREATE_TABLE).run()

// =====================================================================================
// READS.
//
//  Live rows only: every query here carries deleted_at IS NULL, and nothing turns it off.
//  Deleted rows are read by their own family, further down.
// =====================================================================================

/**
 * Reads every live workspace.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getAll = () => db.prepare('SELECT * FROM workspace WHERE deleted_at IS NULL').all().map(readRow)

/**
 * Reads one live workspace by its id.
 * @param {Number} id Id of the workspace to read.
 * @returns {Object|null} The row, or null when no live workspace has that id.
 */
_.getById = (id) => readRow(db.prepare('SELECT * FROM workspace WHERE id = ? AND deleted_at IS NULL').get(id))

/**
 * Reads one live workspace by its absolute path.
 * @param {String} path_absolute The path, already normalised by the service. Compared exactly.
 * @returns {Object|null} The row, or null when no live workspace has that path.
 */
_.getByPathAbsolute = (path_absolute) => readRow(db.prepare('SELECT * FROM workspace WHERE path_absolute = ? AND deleted_at IS NULL').get(path_absolute))

// =====================================================================================
// WRITES.
//
//  Both end in RETURNING *, so the stored row comes back in the same statement. Neither
//  names deleted_at: a create is born live, and an update never deletes or restores.
// =====================================================================================

/**
 * Stores a new workspace.
 * @param {Object} workspace The workspace to store. Its id is left to the database.
 * @returns {Object} The stored row, id included.
 */
_.post = (workspace) => readRow(db.prepare(
    'INSERT INTO workspace (name, path_absolute, path_relative) VALUES (?, ?, ?) RETURNING *'
).get(workspace.name, workspace.path_absolute, workspace.path_relative))

/**
 * Overwrites a live workspace with the values it carries.
 * @param {Object} workspace The workspace to write, id included.
 * @returns {Object|null} The stored row as it ended up, or null when no live workspace has that id.
 */
_.update = (workspace) => readRow(db.prepare(
    'UPDATE workspace SET name = ?, path_absolute = ?, path_relative = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(workspace.name, workspace.path_absolute, workspace.path_relative, workspace.id))

// =====================================================================================
// DELETED RECORDS.
//
//  Everything that reads or changes the deleted state, keyed on the id like this entity's
//  DELETE route. softDelete is the only one a route reaches; the rest serve backend code.
// =====================================================================================

/**
 * Reads every deleted workspace.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getDeletedAll = () => db.prepare('SELECT * FROM workspace WHERE deleted_at IS NOT NULL').all().map(readRow)

/**
 * Reads one deleted workspace by its id.
 * @param {Number} id Id of the workspace to read.
 * @returns {Object|null} The row, or null when no deleted workspace has that id.
 */
_.getDeletedById = (id) => readRow(db.prepare('SELECT * FROM workspace WHERE id = ? AND deleted_at IS NOT NULL').get(id))

/**
 * Reads one deleted workspace by its absolute path.
 * @param {String} path_absolute The path, already normalised by the service. Compared exactly.
 * @returns {Object|null} The row, or null when no deleted workspace has that path.
 */
_.getDeletedByPathAbsolute = (path_absolute) => readRow(db.prepare('SELECT * FROM workspace WHERE path_absolute = ? AND deleted_at IS NOT NULL').get(path_absolute))

/**
 * Marks a live workspace as deleted. One already deleted is not matched, so its first stamp stays.
 * @param {Number} id Id of the workspace to mark.
 * @param {Number} deleted_at Moment of the deletion, in epoch seconds. Decided by the caller.
 * @returns {Object|null} The marked row, or null when no live workspace has that id.
 */
_.softDelete = (id, deleted_at) => readRow(db.prepare(
    'UPDATE workspace SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(deleted_at, id))

/**
 * Clears the mark of a deleted workspace without touching the rest of the row.
 * @param {Number} id Id of the workspace to bring back.
 * @returns {Object|null} The restored row, or null when no deleted workspace has that id.
 */
_.restoreSoftDelete = (id) => readRow(db.prepare(
    'UPDATE workspace SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL RETURNING *'
).get(id))

// =====================================================================================
// PHYSICAL DELETES.
//
//  No route reaches this section. It serves maintenance written on purpose, and the suites
//  purging what they created.
// =====================================================================================

/**
 * Removes one workspace from the database for good, live or deleted.
 * @param {Number} id Id of the workspace to remove.
 * @returns {Object} The driver's report: changes is 1 when a row was removed.
 */
_.deleteById = (id) => db.prepare('DELETE FROM workspace WHERE id = ?').run(id)

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
