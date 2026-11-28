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

// Note: username is this entity's identity key. It arrives normalised — NFC, trimmed and
//  lower case, done by the service — and a plain UNIQUE then compares exactly. That single
//  decision settles two things at once: no second account may differ from another only in
//  case, and signing in is case-insensitive, so `vice`, `ViCe` and `VICE` are one account.
//
// Note: username_cased holds the same name as it was typed, and is never looked up: it is a
//  copy kept for showing the name back the way the owner writes it.
//
// Note: no deleted_at. No route deletes an account, so the column would be a state nothing
//  can reach, and there is no deleted-record family either. Add both the day an account can
//  be deleted.
_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS user (
        id             INTEGER PRIMARY KEY,
        username       TEXT NOT NULL UNIQUE,
        username_cased TEXT NOT NULL,
        password       TEXT NOT NULL
    );
`

// Builds the table. Called once during boot, before anything reads or writes. The UNIQUE
//  constraint already indexes username, the only column looked up besides the id.
_.createTable = () => db.prepare(_.CREATE_TABLE).run()

// =====================================================================================
// READS.
// =====================================================================================

/**
 * Reads every account.
 * @returns {Object[]} The rows found, empty when there are none.
 */
_.getAll = () => db.prepare('SELECT * FROM user').all().map(readRow)

/**
 * Reads one account by its id.
 * @param {Number} id Id of the account to read.
 * @returns {Object|null} The row, or null when no account has that id.
 */
_.getById = (id) => readRow(db.prepare('SELECT * FROM user WHERE id = ?').get(id))

/**
 * Reads one account by its username.
 * @param {String} username The username, already normalised by the service. Compared exactly.
 * @returns {Object|null} The row, or null when no account has that username.
 */
_.getByUsername = (username) => readRow(db.prepare('SELECT * FROM user WHERE username = ?').get(username))

// =====================================================================================
// WRITES.
//
//  Both end in RETURNING *, so the stored row comes back in the same statement.
// =====================================================================================

/**
 * Stores a new account.
 * @param {Object} user The account to store. Its id is left to the database.
 * @returns {Object} The stored row, id included.
 */
_.post = (user) => readRow(db.prepare(
    'INSERT INTO user (username, username_cased, password) VALUES (?, ?, ?) RETURNING *'
).get(user.getUsername(), user.getUsernameCased(), user.getPassword()))

/**
 * Writes a new password over the stored one. The entity's own write: no route edits anything
 *  else of an account.
 * @param {Number} id Id of the account.
 * @param {String} new_password The password to store, already normalised by the service.
 * @returns {Object|null} The row as it ended up, or null when no account has that id.
 */
_.setPassword = (id, new_password) => readRow(db.prepare(
    'UPDATE user SET password = ? WHERE id = ? RETURNING *'
).get(new_password, id))

// =====================================================================================
// PHYSICAL DELETES.
//
//  No route reaches this section. It serves maintenance written on purpose, and the suites
//  purging the accounts they created.
// =====================================================================================

/**
 * Removes one account from the database for good.
 * @param {Number} id Id of the account to remove.
 * @returns {Object} The driver's report: changes is 1 when a row was removed.
 */
_.deleteById = (id) => db.prepare('DELETE FROM user WHERE id = ?').run(id)

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
