// =====================================================================================
// IMPORTS.
// =====================================================================================

// Where the data directory and the database file live.
const { DATA_DIRECTORY, DATABASE_FILE_PATH } = require('./constants')

// The filesystem helpers that create both when they are missing.
const { pathExists, createDirectory, createFile } = require('./io')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// STATE.
// =====================================================================================

// The one connection the whole process uses, opened the first time somebody asks for it and
//  never closed. The database is a local file, so there is no pool to manage and nothing to
//  reconnect to. It stays null until getSharedConnection() below fills it in.
let shared_connection = null

// =====================================================================================
// DATABASE FILE.
// =====================================================================================

// Creates the data directory and the database file when they are missing. Called once by
//  index.js, before any repository builds its table. Doing nothing is the normal case.
_.createDatabaseFile = () => {
    // The directory comes first: writing the file into a directory that is not there throws.
    if (pathExists(DATA_DIRECTORY) === false) createDirectory(DATA_DIRECTORY)

    // An empty file is a valid, empty SQLite database. better-sqlite3 fills it in on the
    //  first CREATE TABLE.
    if (pathExists(DATABASE_FILE_PATH) === false) createFile(DATABASE_FILE_PATH, '')
}

// =====================================================================================
// CONNECTION.
// =====================================================================================

/**
 * The shared database connection, opened on the first call and reused by every caller after
 *  that. Every repository holds it as a module-level const, and so does every test that reads
 *  the database directly.
 *
 * There is deliberately no second way in, and nothing ever calls close() on this one. Separate
 *  handles on the same file lock each other out, so a repository opening its own connection
 *  would compete with this one for no gain — which is exactly what the throwaway getConnection()
 *  that used to live here caused: two doors that looked equivalent, one of them a trap.
 * @returns {Object} The better-sqlite3 database handle.
 */
_.getSharedConnection = () => {
    // Already open: hand back the same handle.
    if (shared_connection !== null) return shared_connection

    // Opened lazily, so requiring this file never touches the disk on its own.
    shared_connection = require('better-sqlite3')(DATABASE_FILE_PATH)

    // WAL lets readers work while a writer holds the database, which is what a web server does
    //  all day, and it is a property of the file, so it sticks once set. NORMAL trades an fsync
    //  per transaction for one per checkpoint, which is safe under WAL. busy_timeout makes a
    //  connection wait for a lock instead of throwing SQLITE_BUSY straight away, which matters
    //  because the test suite drives the database from its own process while the server runs.
    shared_connection.pragma('journal_mode = WAL')
    shared_connection.pragma('synchronous = NORMAL')
    shared_connection.pragma('busy_timeout = 5000')   // Milliseconds.

    return shared_connection
}

module.exports = _
