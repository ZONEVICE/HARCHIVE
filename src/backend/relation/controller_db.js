const _ = {}

const db = require('../logic/db');
const Model = require('./model');

_.CreateTable = () => {
    const query = `
    CREATE TABLE IF NOT EXISTS RELATION (
        id INTEGER PRIMARY KEY,
        id_1 INTEGER NOT NULL,
        id_2 INTEGER NOT NULL,
        table_1 TEXT NOT NULL,
        table_2 TEXT NOT NULL,
        relation_type TEXT NOT NULL
    );`
    const _db = db.GetConnection();
    _db.exec(query);
    _db.close();
}

_.DropTable = () => {
    const query = `DROP TABLE IF EXISTS RELATION;`
    const _db = db.GetConnection();
    _db.exec(query);
    _db.close();
}

_.InsertRelation = relation => {
    const _db = db.GetConnection();
    const query = `INSERT INTO RELATION (id_1, id_2, table_1, table_2, relation_type)
        VALUES (?, ?, ?, ?, ?)`;
    const res = _db.prepare(query).run(
        relation.id_1,
        relation.id_2,
        relation.table_1,
        relation.table_2,
        relation.relation_type
    );
    _db.close();
    return res.changes === 1;
}

_.SelectAllRelations = () => {
    const query = `SELECT * FROM RELATION`;
    const _db = db.GetConnection();
    let res = _db.prepare(query).all();
    _db.close();

    let relations = [];
    for (let row of res) {
        let relation = new Model();
        relation.SetObjectFromDBRows(row);
        relations.push(relation);
    }
    return relations;
}

_.SelectOneById = id => {
    const query = `SELECT * FROM RELATION WHERE id = ?`;
    const _db = db.GetConnection();
    let row = _db.prepare(query).get(id);
    _db.close();

    if (row) {
        let relation = new Model();
        relation.SetObjectFromDBRows(row);
        return relation;
    }
    return null;
}

_.UpdateRelation = relation => {
    const query = `UPDATE RELATION SET
        id_1 = ?,
        id_2 = ?,
        table_1 = ?,
        table_2 = ?,
        relation_type = ?
        WHERE id = ?`;
    const _db = db.GetConnection();
    const res = _db.prepare(query).run(
        relation.id_1,
        relation.id_2,
        relation.table_1,
        relation.table_2,
        relation.relation_type,
        relation.id
    );
    _db.close();
    return res.changes === 1;
}

_.DeleteRelation = id => {
    const query = `DELETE FROM RELATION WHERE id = ?`;
    const _db = db.GetConnection();
    const res = _db.prepare(query).run(id);
    _db.close();
    return res.changes === 1;
}

module.exports = _
