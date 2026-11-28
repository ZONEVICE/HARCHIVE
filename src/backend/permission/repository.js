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
//  case, done by the service — and a plain UNIQUE then compares exactly.
//
// Note: entity holds the *name* of the entity the flags apply to, or NULL for every entity.
//  A name and never a position in a catalogue, so adding or re-sorting an entity never
//  reinterprets a stored row — which is exactly why this is not a positional bitmask.
//
// Note: the four flags are INTEGER 0/1, because SQLite has no boolean type, and they default
//  to 0. readRow below turns them back into real booleans, so no layer above ever sees a 1.
_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS permission (
        id         INTEGER PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        entity     TEXT,
        can_read   INTEGER NOT NULL DEFAULT 0,
        can_create INTEGER NOT NULL DEFAULT 0,
        can_edit   INTEGER NOT NULL DEFAULT 0,
        can_delete INTEGER NOT NULL DEFAULT 0,
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
 * Reads every live permission.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getAll = () => db.prepare('SELECT * FROM permission WHERE deleted_at IS NULL').all().map(readRow)

/**
 * Reads one live permission by its id.
 * @param {Number} id Id of the permission to read.
 * @returns {Object|null} The row, or null when no live permission has that id.
 */
_.getById = (id) => readRow(db.prepare('SELECT * FROM permission WHERE id = ? AND deleted_at IS NULL').get(id))

/**
 * Reads one live permission by its name.
 * @param {String} name The name, already normalised by the service. Compared exactly.
 * @returns {Object|null} The row, or null when no live permission has that name.
 */
_.getByName = (name) => readRow(db.prepare('SELECT * FROM permission WHERE name = ? AND deleted_at IS NULL').get(name))

// =====================================================================================
// WRITES.
//
//  Both end in RETURNING *, so the stored row comes back in the same statement. Neither
//  names deleted_at: a create is born live, and an update never deletes or restores. The
//  four flags go in as 0/1, the only shape SQLite has for them.
// =====================================================================================

/**
 * Stores a new permission.
 * @param {Object} permission The permission to store. Its id is left to the database.
 * @returns {Object} The stored row, id included.
 */
_.post = (permission) => readRow(db.prepare(
    'INSERT INTO permission (name, entity, can_read, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
).get(
    permission.getName(),
    permission.getEntity(),
    toInteger(permission.getCanRead()),
    toInteger(permission.getCanCreate()),
    toInteger(permission.getCanEdit()),
    toInteger(permission.getCanDelete())
))

/**
 * Overwrites a live permission with the values it carries.
 * @param {Object} permission The permission to write, id included.
 * @returns {Object|null} The stored row as it ended up, or null when no live permission has
 *  that id.
 */
_.update = (permission) => readRow(db.prepare(
    'UPDATE permission SET name = ?, entity = ?, can_read = ?, can_create = ?, can_edit = ?, can_delete = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(
    permission.getName(),
    permission.getEntity(),
    toInteger(permission.getCanRead()),
    toInteger(permission.getCanCreate()),
    toInteger(permission.getCanEdit()),
    toInteger(permission.getCanDelete()),
    permission.getId()
))

// =====================================================================================
// DELETED RECORDS.
//
//  Everything that reads or changes the deleted state, keyed on the id like this entity's
//  DELETE route. softDelete is the only one a route reaches; the rest serve backend code.
// =====================================================================================

/**
 * Reads every deleted permission.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getDeletedAll = () => db.prepare('SELECT * FROM permission WHERE deleted_at IS NOT NULL').all().map(readRow)

/**
 * Reads one deleted permission by its id.
 * @param {Number} id Id of the permission to read.
 * @returns {Object|null} The row, or null when no deleted permission has that id.
 */
_.getDeletedById = (id) => readRow(db.prepare('SELECT * FROM permission WHERE id = ? AND deleted_at IS NOT NULL').get(id))

/**
 * Reads one deleted permission by its name.
 * @param {String} name The name, already normalised by the service. Compared exactly.
 * @returns {Object|null} The row, or null when no deleted permission has that name.
 */
_.getDeletedByName = (name) => readRow(db.prepare('SELECT * FROM permission WHERE name = ? AND deleted_at IS NOT NULL').get(name))

/**
 * Marks a live permission as deleted. One already deleted is not matched, so its first stamp
 *  stays.
 * @param {Number} id Id of the permission to mark.
 * @param {Number} deleted_at Moment of the deletion, in epoch seconds. Decided by the caller.
 * @returns {Object|null} The marked row, or null when no live permission has that id.
 */
_.softDelete = (id, deleted_at) => readRow(db.prepare(
    'UPDATE permission SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(deleted_at, id))

/**
 * Clears the mark of a deleted permission without touching its flags. It is restored, never
 *  re-created, because its UNIQUE name is still taken — which is what the seeder needs when
 *  a default role has been deleted.
 * @param {Number} id Id of the permission to bring back.
 * @returns {Object|null} The restored row, or null when no deleted permission has that id.
 */
_.restoreSoftDelete = (id) => readRow(db.prepare(
    'UPDATE permission SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL RETURNING *'
).get(id))

// =====================================================================================
// PHYSICAL DELETES.
//
//  No route reaches this section. It serves maintenance written on purpose, and the suites
//  purging what they created.
// =====================================================================================

/**
 * Removes one permission from the database for good, live or deleted.
 * @param {Number} id Id of the permission to remove.
 * @returns {Object} The driver's report: changes is 1 when a row was removed.
 */
_.deleteById = (id) => db.prepare('DELETE FROM permission WHERE id = ?').run(id)

// =====================================================================================
// LOCAL FUNCTIONS.
// =====================================================================================

/**
 * The one shape a row leaves this file in.
 * @param {Object|undefined} row What the driver answered.
 * @returns {Object|null} The plain row with real booleans, or null when the driver found
 *  nothing.
 */
function readRow(row) {
    // A miss answers undefined, and every caller of this file branches on null instead.
    if (row === undefined) return null

    // The four flags come out of SQLite as 0/1 and leave this file as false/true, so a 1 never
    //  reaches a strict comparison above.
    row.can_read = row.can_read === 1
    row.can_create = row.can_create === 1
    row.can_edit = row.can_edit === 1
    row.can_delete = row.can_delete === 1

    return row
}

/**
 * The one shape a flag goes into SQLite in.
 * @param {Boolean} flag The flag as the model holds it.
 * @returns {Number} 1 for true, 0 for anything else.
 */
function toInteger(flag) {
    // Only an explicit true grants: anything else is stored as the flag that grants nothing.
    if (flag === true) return 1

    return 0
}

module.exports = _
