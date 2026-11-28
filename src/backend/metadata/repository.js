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

// Note: name is this entity's identity key, so it arrives normalised — NFC, trimmed and lower
//  case, done by the service before it gets here — and a plain UNIQUE then compares exactly,
//  in any language. value is stored exactly as it was sent, and has no default: a metadata
//  record *is* its value.
_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS metadata (
        id         INTEGER PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        value      TEXT NOT NULL,
        deleted_at INTEGER
    );
`

// Builds the table. Called once during boot, before anything reads or writes. The UNIQUE
//  constraint already indexes name, the only column looked up besides the id.
_.createTable = () => db.prepare(_.CREATE_TABLE).run()

// =====================================================================================
// READS.
//
//  Live rows only: every query here carries deleted_at IS NULL, and nothing turns it off.
//  Deleted rows are read by their own family, further down.
// =====================================================================================

/**
 * Reads every live metadata record.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getAll = () => db.prepare('SELECT * FROM metadata WHERE deleted_at IS NULL').all().map(readRow)

/**
 * Reads one live metadata record by its id.
 * @param {Number} id Id of the record to read.
 * @returns {Object|null} The row, or null when no live metadata record has that id.
 */
_.getById = (id) => readRow(db.prepare('SELECT * FROM metadata WHERE id = ? AND deleted_at IS NULL').get(id))

/**
 * Reads one live metadata record by its name.
 * @param {String} name The name, already normalised by the service. Compared exactly.
 * @returns {Object|null} The row, or null when no live metadata record has that name.
 */
_.getByName = (name) => readRow(db.prepare('SELECT * FROM metadata WHERE name = ? AND deleted_at IS NULL').get(name))

// =====================================================================================
// WRITES.
//
//  Both end in RETURNING *, so the stored row comes back in the same statement. Neither
//  names deleted_at: a create is born live, and an update never deletes or restores.
// =====================================================================================

/**
 * Stores a new metadata record.
 * @param {Object} metadata The record to store. Its id is left to the database.
 * @returns {Object} The stored row, id included.
 */
_.post = (metadata) => readRow(db.prepare(
    'INSERT INTO metadata (name, value) VALUES (?, ?) RETURNING *'
).get(metadata.getName(), metadata.getValue()))

/**
 * Overwrites a live metadata record with the values it carries.
 * @param {Object} metadata The record to write, id included.
 * @returns {Object|null} The stored row as it ended up, or null when no live record has that id.
 */
_.update = (metadata) => readRow(db.prepare(
    'UPDATE metadata SET name = ?, value = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(metadata.getName(), metadata.getValue(), metadata.getId()))

// =====================================================================================
// DELETED RECORDS.
//
//  Note: the writes of this family are keyed on the name, not the id. The client knows a
//  metadata record by its name, so that is what the DELETE route takes, and the whole family
//  follows it: mixing keys inside one entity is what makes a caller guess. The reads keep
//  their usual names, since there is a getDeletedBy<Field> for every lookup anyway.
//  softDeleteByName is the only one a route reaches; the rest serve backend code.
// =====================================================================================

/**
 * Reads every deleted metadata record.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getDeletedAll = () => db.prepare('SELECT * FROM metadata WHERE deleted_at IS NOT NULL').all().map(readRow)

/**
 * Reads one deleted metadata record by its id.
 * @param {Number} id Id of the record to read.
 * @returns {Object|null} The row, or null when no deleted metadata record has that id.
 */
_.getDeletedById = (id) => readRow(db.prepare('SELECT * FROM metadata WHERE id = ? AND deleted_at IS NOT NULL').get(id))

/**
 * Reads one deleted metadata record by its name.
 * @param {String} name The name, already normalised by the service. Compared exactly.
 * @returns {Object|null} The row, or null when no deleted metadata record has that name.
 */
_.getDeletedByName = (name) => readRow(db.prepare('SELECT * FROM metadata WHERE name = ? AND deleted_at IS NOT NULL').get(name))

/**
 * Marks a live metadata record as deleted. One already deleted keeps its first stamp.
 * @param {String} name The name, already normalised by the service.
 * @param {Number} deleted_at Moment of the deletion, in epoch seconds. Decided by the caller.
 * @returns {Object|null} The marked row, or null when no live record has that name.
 */
_.softDeleteByName = (name, deleted_at) => readRow(db.prepare(
    'UPDATE metadata SET deleted_at = ? WHERE name = ? AND deleted_at IS NULL RETURNING *'
).get(deleted_at, name))

/**
 * Clears the mark of a deleted metadata record without touching its value. It is restored,
 *  never re-created, because its UNIQUE name is still taken.
 * @param {String} name The name, already normalised by the service.
 * @returns {Object|null} The restored row, or null when no deleted record has that name.
 */
_.restoreSoftDeleteByName = (name) => readRow(db.prepare(
    'UPDATE metadata SET deleted_at = NULL WHERE name = ? AND deleted_at IS NOT NULL RETURNING *'
).get(name))

// =====================================================================================
// PHYSICAL DELETES.
//
//  No route reaches this section. It serves maintenance written on purpose, and the suites
//  purging what they created.
// =====================================================================================

/**
 * Removes one metadata record from the database for good, live or deleted.
 * @param {String} name The name, already normalised by the service.
 * @returns {Object} The driver's report: changes is 1 when a row was removed.
 */
_.deleteByName = (name) => db.prepare('DELETE FROM metadata WHERE name = ?').run(name)

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
