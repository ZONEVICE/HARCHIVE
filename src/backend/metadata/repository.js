const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = require('../core/db').GetConnection()

const _ = {}

_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS metadata (
        id    INTEGER PRIMARY KEY,
        key   TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
    );
`

_.createTable = () => db.prepare(_.CREATE_TABLE).run()

_.getAll = () => db.prepare('SELECT * FROM metadata').all()

_.getById = (id) => db.prepare('SELECT * FROM metadata WHERE id = ?').get(id)

_.getByKey = (key) => db.prepare('SELECT * FROM metadata WHERE key = ?').get(key)

_.update = (metadata) => db.prepare('UPDATE metadata SET key = ?, value = ? WHERE id = ?').run(metadata.key, metadata.value, metadata.id)

_.post = (metadata) => db.prepare('INSERT INTO metadata (id, key, value) VALUES (?, ?, ?)').run(metadata.id, metadata.key, metadata.value)

_.deleteByKey = (key) => db.prepare('DELETE FROM metadata WHERE key = ?').run(key)

_.deleteAll = () => db.prepare('DELETE FROM metadata').run()

module.exports = _
