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

// The link table. Five columns identify a link — both ends and its type — and none of them is
//  a foreign key: an end is a name and an id, checked by the service against the catalogues.
//
// Note: no FOREIGN KEY, here least of all. A cascade would delete rows, which the delete
//  policy forbids outright, and a reference would stop a deleted row from outliving what it
//  points at — the two halves of this design that matter most.
//
// Note: entity_1 and entity_2 hold the entity *name*, never a position in a catalogue, so an
//  entity may be added, removed or re-sorted without reinterpreting a single stored row.
_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS relation (
        id            INTEGER PRIMARY KEY,
        id_1          INTEGER NOT NULL,
        entity_1      TEXT NOT NULL,
        id_2          INTEGER NOT NULL,
        entity_2      TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        note          TEXT,
        deleted_at    INTEGER
    );
`

// Builds the table and an index on every column a lookup goes by. This is the table that grows
//  fastest, and its main lookup is an OR over two columns, which without an index scans it
//  twice.
_.createTable = () => {
    db.prepare(_.CREATE_TABLE).run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_relation_id_1 ON relation (id_1);').run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_relation_id_2 ON relation (id_2);').run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_relation_entity_1 ON relation (entity_1);').run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_relation_entity_2 ON relation (entity_2);').run()
}

// =====================================================================================
// READS.
//
//  Live rows only: every query here carries deleted_at IS NULL, and nothing turns it off.
//  Deleted rows are read by their own family, further down.
// =====================================================================================

/**
 * Reads every live relation.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getAll = () => db.prepare('SELECT * FROM relation WHERE deleted_at IS NULL').all().map(readRow)

/**
 * Reads one live relation by its id.
 * @param {Number} id Id of the relation to read.
 * @returns {Object|null} The row, or null when no live relation has that id.
 */
_.getById = (id) => readRow(db.prepare('SELECT * FROM relation WHERE id = ? AND deleted_at IS NULL').get(id))

/**
 * Reads every live relation that names an entity on either side.
 * @param {String} entity The entity name to look for.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getByEntity = (entity) => db.prepare(
    'SELECT * FROM relation WHERE (entity_1 = ? OR entity_2 = ?) AND deleted_at IS NULL'
).all(entity, entity).map(readRow)

/**
 * Reads every live relation that mentions a record id on either side.
 *
 * Note: it matches on the id alone, and each table has its own INTEGER PRIMARY KEY sequence,
 *  so a directory id and a file id collide as a matter of course. A caller that means one
 *  entity must check entity_1 / entity_2 as well.
 * @param {Number} entity_id The record id to look for.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getByEntityId = (entity_id) => db.prepare(
    'SELECT * FROM relation WHERE (id_1 = ? OR id_2 = ?) AND deleted_at IS NULL'
).all(entity_id, entity_id).map(readRow)

/**
 * Reads the live relation with exactly these two ends and this type — the five columns that
 *  identify a link.
 * @param {Object} relation A Relation model; its id_1, entity_1, id_2, entity_2 and
 *  relation_type are read through its get methods.
 * @returns {Object|null} The row, or null when no live relation has those five values.
 */
_.getByEnds = (relation) => readRow(db.prepare(
    'SELECT * FROM relation WHERE id_1 = ? AND entity_1 = ? AND id_2 = ? AND entity_2 = ? AND relation_type = ? AND deleted_at IS NULL'
).get(relation.getId1(), relation.getEntity1(), relation.getId2(), relation.getEntity2(), relation.getRelationType()))

// =====================================================================================
// WRITES.
//
//  Both end in RETURNING *, so the stored row comes back in the same statement. Neither
//  names deleted_at: a create is born live, and an update never deletes or restores.
// =====================================================================================

/**
 * Stores a new relation.
 * @param {Object} relation The relation to store. Its id is left to the database.
 * @returns {Object} The stored row, id included.
 */
_.post = (relation) => readRow(db.prepare(
    'INSERT INTO relation (id_1, entity_1, id_2, entity_2, relation_type, note) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
).get(relation.getId1(), relation.getEntity1(), relation.getId2(), relation.getEntity2(), relation.getRelationType(), relation.getNote()))

/**
 * Overwrites a live relation with the values it carries.
 * @param {Object} relation The relation to write, id included.
 * @returns {Object|null} The stored row as it ended up, or null when no live relation has
 *  that id.
 */
_.update = (relation) => readRow(db.prepare(
    'UPDATE relation SET id_1 = ?, entity_1 = ?, id_2 = ?, entity_2 = ?, relation_type = ?, note = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(relation.getId1(), relation.getEntity1(), relation.getId2(), relation.getEntity2(), relation.getRelationType(), relation.getNote(), relation.getId()))

// =====================================================================================
// DELETED RECORDS.
//
//  Everything that reads or changes the deleted state, keyed on the id like this entity's
//  DELETE route. Every lookup of the live family has its twin here. softDelete is the only
//  one a route reaches directly; restoreSoftDelete is also reached by POST, which brings a
//  deleted twin back instead of duplicating it — see the service.
// =====================================================================================

/**
 * Reads every deleted relation.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getDeletedAll = () => db.prepare('SELECT * FROM relation WHERE deleted_at IS NOT NULL').all().map(readRow)

/**
 * Reads one deleted relation by its id.
 * @param {Number} id Id of the relation to read.
 * @returns {Object|null} The row, or null when no deleted relation has that id.
 */
_.getDeletedById = (id) => readRow(db.prepare('SELECT * FROM relation WHERE id = ? AND deleted_at IS NOT NULL').get(id))

/**
 * Reads every deleted relation that names an entity on either side.
 * @param {String} entity The entity name to look for.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getDeletedByEntity = (entity) => db.prepare(
    'SELECT * FROM relation WHERE (entity_1 = ? OR entity_2 = ?) AND deleted_at IS NOT NULL'
).all(entity, entity).map(readRow)

/**
 * Reads every deleted relation that mentions a record id on either side. The same id
 *  collision as getByEntityId applies.
 * @param {Number} entity_id The record id to look for.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getDeletedByEntityId = (entity_id) => db.prepare(
    'SELECT * FROM relation WHERE (id_1 = ? OR id_2 = ?) AND deleted_at IS NOT NULL'
).all(entity_id, entity_id).map(readRow)

/**
 * Reads a deleted relation with exactly these two ends and this type. When several were
 *  deleted over time, the most recent id answers, so the choice is a rule and not rowid luck.
 * @param {Object} relation A Relation model; its id_1, entity_1, id_2, entity_2 and
 *  relation_type are read through its get methods.
 * @returns {Object|null} The row, or null when no deleted relation has those five values.
 */
_.getDeletedByEnds = (relation) => readRow(db.prepare(
    'SELECT * FROM relation WHERE id_1 = ? AND entity_1 = ? AND id_2 = ? AND entity_2 = ? AND relation_type = ? AND deleted_at IS NOT NULL ORDER BY id DESC'
).get(relation.getId1(), relation.getEntity1(), relation.getId2(), relation.getEntity2(), relation.getRelationType()))

/**
 * Marks a live relation as deleted. One already deleted is not matched, so its first stamp
 *  stays.
 * @param {Number} id Id of the relation to mark.
 * @param {Number} deleted_at Moment of the deletion, in epoch seconds. Decided by the caller.
 * @returns {Object|null} The marked row, or null when no live relation has that id.
 */
_.softDelete = (id, deleted_at) => readRow(db.prepare(
    'UPDATE relation SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING *'
).get(deleted_at, id))

/**
 * Clears the mark of a deleted relation without touching the rest of the row.
 * @param {Number} id Id of the relation to bring back.
 * @returns {Object|null} The restored row, or null when no deleted relation has that id.
 */
_.restoreSoftDelete = (id) => readRow(db.prepare(
    'UPDATE relation SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL RETURNING *'
).get(id))

// =====================================================================================
// PHYSICAL DELETES.
//
//  No route reaches this section. It serves maintenance written on purpose, and the suites
//  purging what they created.
// =====================================================================================

/**
 * Removes one relation from the database for good, live or deleted.
 * @param {Number} id Id of the relation to remove.
 * @returns {Object} The driver's report: changes is 1 when a row was removed.
 */
_.deleteById = (id) => db.prepare('DELETE FROM relation WHERE id = ?').run(id)

// =====================================================================================
// SCHEMA.
// =====================================================================================

/**
 * Says whether the database holds a table of that name. An end of a relation points at a row
 *  of a table, so an entity that owns none — the seeder — cannot be one. Only the schema
 *  catalogue is read: no other entity's table is touched.
 * @param {String} name The table name, which is the entity name.
 * @returns {Boolean} True when the table exists.
 */
_.isTable = (name) => {
    // sqlite_master lists every table of the file; a miss answers undefined.
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)

    return row !== undefined
}

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
