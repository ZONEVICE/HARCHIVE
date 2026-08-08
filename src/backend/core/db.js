const _ = {}

const { DATA_DIRECTORY, DATABASE_FILE_PATH } = require('../core/constants')
const { pathExists, createDirectory, createFile } = require('./io')

_.createDatabaseFile = () => {
    if (pathExists(DATA_DIRECTORY) === false) {
        createDirectory(DATA_DIRECTORY);
    }
    if (pathExists(DATABASE_FILE_PATH) === false) {
        createFile(DATABASE_FILE_PATH, '');
    }
}

// The one connection the whole process uses. It is opened the first time somebody asks for it
//  and never closed — the database is a local file, so there is no pool to manage and nothing to
//  reconnect to.
//
//  There is deliberately no second way in. Separate handles on the same file lock each other
//  out, so a repository opening its own connection would compete with this one for no gain, and
//  the throwaway `GetConnection()` that used to live here was a trap for exactly that reason:
//  whoever wrote the next repository had to pick between two doors that looked equivalent.
//  Everything — repositories, tests, future maintenance scripts — comes through here, and
//  nothing calls close() on it.
let shared_connection = null

_.getSharedConnection = () => {
    if (shared_connection !== null) return shared_connection

    shared_connection = require('better-sqlite3')(DATABASE_FILE_PATH)

    // WAL lets readers work while a writer holds the database, which is what a web server does
    //  all day, and it is a property of the file, so it sticks once set. NORMAL trades an fsync
    //  per transaction for one per checkpoint, which is safe under WAL. busy_timeout makes a
    //  connection wait for a lock instead of throwing SQLITE_BUSY straight away, which matters
    //  because the test suite drives the database from its own process while the server runs.
    shared_connection.pragma('journal_mode = WAL')
    shared_connection.pragma('synchronous = NORMAL')
    shared_connection.pragma('busy_timeout = 5000')

    return shared_connection
}

module.exports = _
