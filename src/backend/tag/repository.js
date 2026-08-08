const db = require('../core/db').getSharedConnection()

const _ = {}

_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS tag (
        id         INTEGER PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
        metadata   TEXT NOT NULL DEFAULT '{}',
        deleted_at INTEGER
    );
`

_.createTable = () => db.prepare(_.CREATE_TABLE).run()

// Reads return soft-deleted tags too: the client decides whether to show them (trash can).
_.getAll = () => db.prepare('SELECT * FROM tag').all()

_.getById = (id) => {
    const row = db.prepare('SELECT * FROM tag WHERE id = ?').get(id)
    if (!row) return null
    return row
}

_.getByName = (name) => {
    const row = db.prepare('SELECT * FROM tag WHERE name = ?').get(name)
    if (!row) return null
    return row
}

_.post = (tag) => db.prepare('INSERT INTO tag (name, metadata, deleted_at) VALUES (?, ?, ?)').run(tag.name, tag.metadata, tag.deleted_at)

_.update = (tag) => db.prepare('UPDATE tag SET name = ?, metadata = ?, deleted_at = ? WHERE id = ?').run(tag.name, tag.metadata, tag.deleted_at, tag.id)

_.softDelete = (id, deleted_at) => db.prepare('UPDATE tag SET deleted_at = ? WHERE id = ?').run(deleted_at, id)

_.deleteAll = () => db.prepare('DELETE FROM tag').run()

module.exports = _
