const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = require('../core/db').GetConnection()

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

_.getById = (id) => db.prepare('SELECT * FROM metadata WHERE id = ?').get(id)

_.getByName = (name) => db.prepare('SELECT * FROM metadata WHERE name = ?').get(name)

_.update = (metadata) => db.prepare('UPDATE metadata SET name = ?, value = ?, deleted_at = ? WHERE id = ?').run(metadata.name, metadata.value, metadata.deleted_at, metadata.id)

_.post = (metadata) => db.prepare('INSERT INTO metadata (name, value, deleted_at) VALUES (?, ?, ?)').run(metadata.name, metadata.value, metadata.deleted_at)

_.deleteByName = (name) => db.prepare('DELETE FROM metadata WHERE name = ?').run(name)

_.deleteAll = () => db.prepare('DELETE FROM metadata').run()

module.exports = _
