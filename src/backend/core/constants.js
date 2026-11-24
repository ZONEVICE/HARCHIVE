// =====================================================================================
// IMPORTS.
// =====================================================================================

const { join } = require('path')
const _ = {}

// =====================================================================================
// FILESYSTEM PATHS.
//  Resolved from this file's own directory, so they hold wherever the process is started
//  from. Both are created at startup by index.js when they are missing.
// =====================================================================================

// Everything the application writes to disk lives here. Gitignored, so a clone has none of it.
_.DATA_DIRECTORY = join(__dirname, '../../data/')

// The SQLite database. WAL puts two more files next to it, harchive.db-wal and harchive.db-shm,
//  both regenerated and both covered by the same ignored directory.
_.DATABASE_FILE_PATH = join(__dirname, '../../data/harchive.db')

// =====================================================================================
// ENTITY CATALOGUES.
//
//  One array per shape of entity, and every entity of the system belongs to exactly one of
//  them. A name moves from one array to another the day the entity is promoted or demoted,
//  and nothing else about the entity depends on which array it sits in.
//
//  The catalogues are membership lists, never ordered ones: a relation stores the entity
//  *name* and a permission stores the name of the entity it is scoped to, so an entity may
//  be added, removed or re-sorted without reinterpreting a single stored row.
// =====================================================================================

// The entities a client reaches over /api/<entity>/.
_.ENTITY_HTTP = ['directory', 'file', 'metadata', 'permission', 'relation', 'tag', 'user', 'workspace']

// The entities only backend code ever calls.
_.ENTITY_INTERNAL = ['seeder']

// The entities that follow none of the structure above.
_.ENTITY_REBEL = []

module.exports = _
