const db = require('../core/db').GetConnection()

const _ = {}

_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS permission (
        id         INTEGER PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
        can_read   INTEGER NOT NULL DEFAULT 0,
        can_create INTEGER NOT NULL DEFAULT 0,
        can_edit   INTEGER NOT NULL DEFAULT 0,
        can_delete INTEGER NOT NULL DEFAULT 0,
        deleted_at INTEGER
    );
`

_.createTable = () => db.prepare(_.CREATE_TABLE).run()

// SQLite has no boolean type, so the four flags live as INTEGER 0/1. Every read turns them
//  back into real booleans, so the HTTP surface always answers true/false and never 1/0.
const readRow = (row) => {
    if (!row) return null
    row.can_read = row.can_read === 1
    row.can_create = row.can_create === 1
    row.can_edit = row.can_edit === 1
    row.can_delete = row.can_delete === 1
    return row
}

// Reads return soft-deleted permissions too: the client decides whether to show them (trash can).
_.getAll = () => db.prepare('SELECT * FROM permission').all().map(readRow)

_.getById = (id) => readRow(db.prepare('SELECT * FROM permission WHERE id = ?').get(id))

_.getByName = (name) => readRow(db.prepare('SELECT * FROM permission WHERE name = ?').get(name))

_.post = (permission) => db.prepare(
    'INSERT INTO permission (name, can_read, can_create, can_edit, can_delete, deleted_at) VALUES (?, ?, ?, ?, ?, ?)'
).run(
    permission.name,
    permission.can_read ? 1 : 0,
    permission.can_create ? 1 : 0,
    permission.can_edit ? 1 : 0,
    permission.can_delete ? 1 : 0,
    permission.deleted_at
)

_.update = (permission) => db.prepare(
    'UPDATE permission SET name = ?, can_read = ?, can_create = ?, can_edit = ?, can_delete = ?, deleted_at = ? WHERE id = ?'
).run(
    permission.name,
    permission.can_read ? 1 : 0,
    permission.can_create ? 1 : 0,
    permission.can_edit ? 1 : 0,
    permission.can_delete ? 1 : 0,
    permission.deleted_at,
    permission.id
)

_.softDelete = (id, deleted_at) => db.prepare('UPDATE permission SET deleted_at = ? WHERE id = ?').run(deleted_at, id)

// Clears the trash mark without touching the flags. The startup seed needs it: a default
//  permission sitting in the trash is restored, never re-created, because its UNIQUE name
//  is still taken.
_.restore = (id) => db.prepare('UPDATE permission SET deleted_at = NULL WHERE id = ?').run(id)

// Physical deletes. They are not reachable from any HTTP endpoint: only backend code
//  calling service.hardDelete gets to them.
_.deleteById = (id) => db.prepare('DELETE FROM permission WHERE id = ?').run(id)

_.deleteAll = () => db.prepare('DELETE FROM permission').run()

module.exports = _
