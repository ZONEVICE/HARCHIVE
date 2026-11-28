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
//  in any language. metadata is stored exactly as it was sent.
_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS tag (
        id         INTEGER PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        metadata   TEXT NOT NULL DEFAULT '{}',
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
 * Reads every live tag.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getAll = () => db.prepare('SELECT * FROM tag WHERE deleted_at IS NULL').all().map(readRow)

/**
 * Reads one live tag by its id.
 * @param {Number} id Id of the tag to read.
 * @returns {Object|null} The row, or null when no live tag has that id.
 */
_.getById = (id) => readRow(db.prepare('SELECT * FROM tag WHERE id = ? AND deleted_at IS NULL').get(id))

/**
 * Reads one live tag by its name.
 * @param {String} name The name, already normalised by the service. Compared exactly.
 * @returns {Object|null} The row, or null when no live tag has that name.
 */
_.getByName = (name) => readRow(db.prepare('SELECT * FROM tag WHERE name = ? AND deleted_at IS NULL').get(name))

// =====================================================================================
// WRITES.
//
//  Both end in RETURNING *, so the stored row comes back in the same statement. Neither
//  names deleted_at: a create is born live, and an update never deletes or restores.
// =====================================================================================

/**
 * Stores a new tag.
 * @param {Object} tag The tag to store. Its id is left to the database.
 * @returns {Object} The stored row, id included.
 */
_.post = (tag) => readRow(db.prepare(
    'INSERT INTO tag (name, metadata) VALUES (?, ?) RETURNING *'
).get(tag.getName(), tag.getMetadata()))

/**
 * Overwrites a live tag with the values it carries.
 * @param {Object} tag The tag to write, id included.
 * @returns {Object|null} The stored row as it ended up, or null when no live tag has that id.
 */
_.update = (tag) => readRow(db.prepare(
    'UPDATE tag SET name = ?, metadata = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(tag.getName(), tag.getMetadata(), tag.getId()))

// =====================================================================================
// DELETED RECORDS.
//
//  Everything that reads or changes the deleted state, keyed on the id like this entity's
//  DELETE route. softDelete is the only one a route reaches; the rest serve backend code.
// =====================================================================================

/**
 * Reads every deleted tag.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getDeletedAll = () => db.prepare('SELECT * FROM tag WHERE deleted_at IS NOT NULL').all().map(readRow)

/**
 * Reads one deleted tag by its id.
 * @param {Number} id Id of the tag to read.
 * @returns {Object|null} The row, or null when no deleted tag has that id.
 */
_.getDeletedById = (id) => readRow(db.prepare('SELECT * FROM tag WHERE id = ? AND deleted_at IS NOT NULL').get(id))

/**
 * Reads one deleted tag by its name.
 * @param {String} name The name, already normalised by the service. Compared exactly.
 * @returns {Object|null} The row, or null when no deleted tag has that name.
 */
_.getDeletedByName = (name) => readRow(db.prepare('SELECT * FROM tag WHERE name = ? AND deleted_at IS NOT NULL').get(name))

/**
 * Marks a live tag as deleted. A tag already deleted is not matched, so its first stamp stays.
 * @param {Number} id Id of the tag to mark.
 * @param {Number} deleted_at Moment of the deletion, in epoch seconds. Decided by the caller.
 * @returns {Object|null} The marked row, or null when no live tag has that id.
 */
_.softDelete = (id, deleted_at) => readRow(db.prepare(
    'UPDATE tag SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(deleted_at, id))

/**
 * Clears the mark of a deleted tag without touching the rest of the row. It is restored, never
 *  re-created, because its UNIQUE name is still taken.
 * @param {Number} id Id of the tag to bring back.
 * @returns {Object|null} The restored row, or null when no deleted tag has that id.
 */
_.restoreSoftDelete = (id) => readRow(db.prepare(
    'UPDATE tag SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL RETURNING *'
).get(id))

// =====================================================================================
// PHYSICAL DELETES.
//
//  No route reaches this section. It serves maintenance written on purpose, and the suites
//  purging what they created.
// =====================================================================================

/**
 * Removes one tag from the database for good, live or deleted.
 * @param {Number} id Id of the tag to remove.
 * @returns {Object} The driver's report: changes is 1 when a row was removed.
 */
_.deleteById = (id) => db.prepare('DELETE FROM tag WHERE id = ?').run(id)

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
