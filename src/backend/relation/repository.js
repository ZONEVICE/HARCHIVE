const db = require('../core/db').GetConnection()

const _ = {}

_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS relation (
        id        INTEGER PRIMARY KEY,
        id_1      INTEGER NOT NULL,
        entity_1  TEXT NOT NULL,
        id_2          INTEGER NOT NULL,
        entity_2      TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        note          TEXT
    );
`

_.createTable = () => db.prepare(_.CREATE_TABLE).run()

_.getAll = () => db.prepare('SELECT * FROM relation').all()

_.getById = (id) => db.prepare('SELECT * FROM relation WHERE id = ?').get(id)

_.getByEntity = (entity) => db.prepare(
    'SELECT * FROM relation WHERE entity_1 = ? OR entity_2 = ?'
).all(entity, entity)

_.getByEntityId = (entity_id) => db.prepare(
    'SELECT * FROM relation WHERE id_1 = ? OR id_2 = ?'
).all(entity_id, entity_id)

_.post = (relation) => db.prepare(
    'INSERT INTO relation (id, id_1, entity_1, id_2, entity_2, relation_type, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
).run(relation.id, relation.id_1, relation.entity_1, relation.id_2, relation.entity_2, relation.relation_type, relation.note)

_.update = (relation) => db.prepare(
    'UPDATE relation SET id_1 = ?, entity_1 = ?, id_2 = ?, entity_2 = ?, relation_type = ?, note = ? WHERE id = ?'
).run(relation.id_1, relation.entity_1, relation.id_2, relation.entity_2, relation.relation_type, relation.note, relation.id)

_.deleteById = (id) => db.prepare('DELETE FROM relation WHERE id = ?').run(id)

_.deleteAll = () => db.prepare('DELETE FROM relation').run()

module.exports = _
