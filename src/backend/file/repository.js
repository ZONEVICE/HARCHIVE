const db = require('../core/db').GetConnection()

const _ = {}

_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS file (
        id            INTEGER PRIMARY KEY,
        name          TEXT NOT NULL,
        hash_256_sha  TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        extension     TEXT NOT NULL,
        deleted_at    INTEGER
    );
`

_.createTable = () => {
    db.prepare(_.CREATE_TABLE).run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_file_name ON file (name);').run()
}

_.getAll = () => db.prepare('SELECT * FROM file').all()

_.getById = (id) => {
    const row = db.prepare('SELECT * FROM file WHERE id = ?').get(id)
    if (!row) return null
    return row
}

_.post = (file) => db.prepare('INSERT INTO file (name, hash_256_sha, relative_path, extension, deleted_at) VALUES (?, ?, ?, ?, ?)').run(file.name, file.hash_256_sha, file.relative_path, file.extension, file.deleted_at)

_.update = (file) => db.prepare('UPDATE file SET name = ?, hash_256_sha = ?, relative_path = ?, extension = ?, deleted_at = ? WHERE id = ?').run(file.name, file.hash_256_sha, file.relative_path, file.extension, file.deleted_at, file.id)

_.deleteById = (id) => db.prepare('DELETE FROM file WHERE id = ?').run(id)

_.deleteAll = () => db.prepare('DELETE FROM file').run()

module.exports = _
