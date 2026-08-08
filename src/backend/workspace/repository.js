const db = require('../core/db').getSharedConnection()

const _ = {}

_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS workspace (
        id            INTEGER PRIMARY KEY,
        name          TEXT NOT NULL,
        path_absolute TEXT NOT NULL UNIQUE,
        path_relative TEXT NOT NULL,
        deleted_at    INTEGER
    );
`

_.createTable = () => db.prepare(_.CREATE_TABLE).run()

// Reads return soft-deleted workspaces too: the client decides whether to show them (trash can).
_.getAll = () => db.prepare('SELECT * FROM workspace').all()

_.getById = (id) => {
    const row = db.prepare('SELECT * FROM workspace WHERE id = ?').get(id)
    if (!row) return null
    return row
}

_.getByPathAbsolute = (path_absolute) => {
    const row = db.prepare('SELECT * FROM workspace WHERE path_absolute = ?').get(path_absolute)
    if (!row) return null
    return row
}

_.post = (workspace) => db.prepare(
    'INSERT INTO workspace (name, path_absolute, path_relative, deleted_at) VALUES (?, ?, ?, ?)'
).run(workspace.name, workspace.path_absolute, workspace.path_relative, workspace.deleted_at)

_.update = (workspace) => db.prepare(
    'UPDATE workspace SET name = ?, path_absolute = ?, path_relative = ?, deleted_at = ? WHERE id = ?'
).run(workspace.name, workspace.path_absolute, workspace.path_relative, workspace.deleted_at, workspace.id)

_.softDelete = (id, deleted_at) => db.prepare('UPDATE workspace SET deleted_at = ? WHERE id = ?').run(deleted_at, id)

// Physical deletes. They are not reachable from any HTTP endpoint: only backend code
//  calling service.hardDelete gets to them.
_.deleteById = (id) => db.prepare('DELETE FROM workspace WHERE id = ?').run(id)

_.deleteAll = () => db.prepare('DELETE FROM workspace').run()

module.exports = _
