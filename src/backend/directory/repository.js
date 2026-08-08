const db = require('../core/db').getSharedConnection()

const _ = {}

_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS directory (
        id                     INTEGER PRIMARY KEY,
        name                   TEXT NOT NULL,
        date_scan              INTEGER,
        date_creation          INTEGER,
        date_last_modification INTEGER,
        deleted_at             INTEGER
    );
`

_.createTable = () => {
    db.prepare(_.CREATE_TABLE).run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_directory_name ON directory (name);').run()
}

// Reads return soft-deleted directories too: the client decides whether to show them (trash can).
_.getAll = () => db.prepare('SELECT * FROM directory').all()

_.getById = (id) => {
    const row = db.prepare('SELECT * FROM directory WHERE id = ?').get(id)
    if (!row) return null
    return row
}

_.post = (directory) => db.prepare(
    'INSERT INTO directory (name, date_scan, date_creation, date_last_modification, deleted_at) VALUES (?, ?, ?, ?, ?)'
).run(directory.name, directory.date_scan, directory.date_creation, directory.date_last_modification, directory.deleted_at)

_.update = (directory) => db.prepare(
    'UPDATE directory SET name = ?, date_scan = ?, date_creation = ?, date_last_modification = ?, deleted_at = ? WHERE id = ?'
).run(directory.name, directory.date_scan, directory.date_creation, directory.date_last_modification, directory.deleted_at, directory.id)

_.softDelete = (id, deleted_at) => db.prepare('UPDATE directory SET deleted_at = ? WHERE id = ?').run(deleted_at, id)

// Physical deletes. They are not reachable from any HTTP endpoint: only backend code
//  calling service.hardDelete gets to them.
_.deleteById = (id) => db.prepare('DELETE FROM directory WHERE id = ?').run(id)

_.deleteAll = () => db.prepare('DELETE FROM directory').run()

module.exports = _
