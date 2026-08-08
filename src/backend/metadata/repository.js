const db = require('../core/db').getSharedConnection()

const _ = {}

_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS metadata (
        id    INTEGER PRIMARY KEY,
        name  TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        deleted_at INTEGER
    );
`

_.createTable = () => db.prepare(_.CREATE_TABLE).run()

_.getAll = () => db.prepare('SELECT * FROM metadata').all()

_.getById = (id) => {
    const row = db.prepare('SELECT * FROM metadata WHERE id = ?').get(id)
    if (!row) return null
    return row
}

_.getByName = (name) => {
    const row = db.prepare('SELECT * FROM metadata WHERE name = ?').get(name)
    if (!row) return null
    return row
}

_.update = (metadata) => db.prepare('UPDATE metadata SET name = ?, value = ?, deleted_at = ? WHERE id = ?').run(metadata.name, metadata.value, metadata.deleted_at, metadata.id)

_.post = (metadata) => db.prepare('INSERT INTO metadata (name, value, deleted_at) VALUES (?, ?, ?)').run(metadata.name, metadata.value, metadata.deleted_at)

_.softDeleteByName = (name, deleted_at) => db.prepare('UPDATE metadata SET deleted_at = ? WHERE name = ?').run(deleted_at, name)

// Physical deletes. They are not reachable from any HTTP endpoint: only backend code
//  calling service.hardDeleteByName gets to them.
_.deleteByName = (name) => db.prepare('DELETE FROM metadata WHERE name = ?').run(name)

_.deleteAll = () => db.prepare('DELETE FROM metadata').run()

module.exports = _
