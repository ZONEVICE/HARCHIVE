const db = require('../core/db').GetConnection()

const _ = {}

_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS file (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        hash_256_sha  TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        extension     TEXT NOT NULL,
        tags          TEXT NOT NULL DEFAULT '[]'
    );
`

_.createTable = () => db.prepare(_.CREATE_TABLE).run()

_.getAll = () => {
    const rows = db.prepare('SELECT * FROM file').all()
    return rows.map(r => ({ ...r, tags: JSON.parse(r.tags) }))
}

_.getById = (id) => {
    const row = db.prepare('SELECT * FROM file WHERE id = ?').get(id)
    if (!row) return null
    return { ...row, tags: JSON.parse(row.tags) }
}

_.post = (file) => db.prepare('INSERT INTO file (id, name, hash_256_sha, relative_path, extension, tags) VALUES (?, ?, ?, ?, ?, ?)').run(file.id, file.name, file.hash_256_sha, file.relative_path, file.extension, JSON.stringify(file.tags))

_.update = (file) => db.prepare('UPDATE file SET name = ?, hash_256_sha = ?, relative_path = ?, extension = ?, tags = ? WHERE id = ?').run(file.name, file.hash_256_sha, file.relative_path, file.extension, JSON.stringify(file.tags), file.id)

_.deleteById = (id) => db.prepare('DELETE FROM file WHERE id = ?').run(id)

_.deleteAll = () => db.prepare('DELETE FROM file').run()

module.exports = _
