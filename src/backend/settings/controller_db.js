const _ = {}

const db = require('../logic/db');
const Model = require('./model');

_.LoadData = () => {
    const _db = db.GetConnection();
    const res = _db.prepare('SELECT * FROM SETTINGS').all();
    return new Model(res[0]);
}

_.SaveData = s => {
    const _db = db.GetConnection();
    const query = `UPDATE SETTINGS
    SET allow_downloads = ?,
    allow_file_system_browser = ?,
    register_logs = ?
    WHERE id = 1`;
    const res = _db.prepare(query).run(s.allow_downloads, s.allow_file_system_browser, s.register_logs);
    return res.changes === 1;
}

_.DropTable = () => {
    const query = `DROP TABLE IF EXISTS SETTINGS`;
    const _db = db.GetConnection();
    _db.exec(query);
    _db.close();
}

_.CreateTable = () => {
    const query = `CREATE TABLE IF NOT EXISTS SETTINGS (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        allow_downloads INTEGER NOT NULL DEFAULT 1,
        allow_file_system_browser INTEGER NOT NULL DEFAULT 1,
        register_logs INTEGER NOT NULL DEFAULT 1
    )`;
    const _db = db.GetConnection();
    _db.exec(query);
    _db.close();
};

_.CreateDefaultRecord = () => {
    const _select = `SELECT * from SETTINGS`;
    const _db = db.GetConnection();
    let res = _db.prepare(_select).all();

    if (res.length === 0) {
        const _insert = `INSERT INTO SETTINGS
        (allow_downloads, allow_file_system_browser, register_logs)
        VALUES (1, 1, 1)`;
        _db.exec(_insert);
    }

    _db.close();
}

module.exports = _
