// =====================================================================================
// STARTUP SEQUENCE.
//
//  Four phases, in this order and no other: create the database file, create every table,
//  seed the default data, start the server. Adding an entity means adding its createTable()
//  to phase two; it never means adding a seed call to phase three.
// =====================================================================================

// =====================================================================================
// PHASE 1 — THE DATABASE FILE.
// =====================================================================================

// The database bootstrap.
const db = require('./core/db')

// Creates src/data/ and the database file when they are missing. Everything below assumes
//  there is a file to talk to.
db.createDatabaseFile()

// =====================================================================================
// PHASE 2 — THE TABLES.
//
//  One createTable() per entity that owns a table, and nothing else. Each one is
//  CREATE TABLE IF NOT EXISTS, so this is a no-op on every boot after the first.
// =====================================================================================

// The metadata table.
const metadata_repository = require('./metadata/repository')
metadata_repository.createTable()

// The file table.
const file_repository = require('./file/repository')
file_repository.createTable()

// The user table.
const user_repository = require('./user/repository')
user_repository.createTable()

// The relation table.
const relation_repository = require('./relation/repository')
relation_repository.createTable()

// The tag table.
const tag_repository = require('./tag/repository')
tag_repository.createTable()

// The directory table.
const directory_repository = require('./directory/repository')
directory_repository.createTable()

// The workspace table.
const workspace_repository = require('./workspace/repository')
workspace_repository.createTable()

// The permission table.
const permission_repository = require('./permission/repository')
permission_repository.createTable()

// =====================================================================================
// PHASE 3 — THE DEFAULT DATA.
//
//  It runs after every table on purpose: the seeder writes through user, permission and
//  relation, so each of those tables has to exist already. The whole seed is idempotent and
//  exits the process rather than log and continue — a backend without a live administrator
//  is half-initialised and must not come up at all.
// =====================================================================================

// The intern entity that owns the default rows.
const seeder_service = require('./seeder/service')
seeder_service.seed()

// =====================================================================================
// PHASE 4 — THE WEB SERVER.
// =====================================================================================

// The Express application, built and wired but not listening yet.
const app = require('./web/app')

// The port to listen on.
const { PORT } = require('./core/env')

// Note: the listen callback must check its error argument. Express 5 registers this same
//  callback as the server's error handler, so a failed bind *calls* it with an Error instead
//  of not calling it — and ignoring that prints "listening on port 9000" for a port the
//  process never got, then exits 0 once the event loop empties, which a watcher reports as a
//  clean exit. The whole failure then looks like a normal shutdown.
const server = app.listen(PORT, (error) => {
    // A failed bind arrives here as an Error; a successful one as nothing at all.
    if (error !== undefined && error !== null) {
        console.error(`Error: the web server could not listen on port ${PORT}:`, error.message)
        process.exit(1)
    }

    // Listening for real.
    console.log(`HARCHIVE backend listening on port: ${PORT}.`)
})

// Express's own handler is a `once`, so it covers the bind and nothing after it. This one
//  catches a fault that arrives later, when the server is already up.
server.on('error', (error) => {
    console.error('Error: the web server stopped listening:', error.message)
    process.exit(1)
})
