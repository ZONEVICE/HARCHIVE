const _ = {};

const db = require('../logic/db');
const Model = require('./model');
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../logic/constants');

_.CreateTable = () => {
    const query = `CREATE TABLE IF NOT EXISTS USER (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL
    )`;
    const _db = db.GetConnection();
    _db.exec(query);
    _db.close();
}

_.CreateAdminUser = () => {
    const _select = `SELECT * FROM USER WHERE username = '${ADMIN_USERNAME}'`;
    const _db = db.GetConnection();
    let res = _db.prepare(_select).all();
    if (res.length === 0) {
        const _insert = `INSERT INTO USER (id, username, password)
            VALUES ('1', '${ADMIN_USERNAME}', '${ADMIN_DEFAULT_PASSWORD}')`;
        _db.exec(_insert);
    }
    _db.close();
}

_.LoadUserById = id => {
    const query = `SELECT * FROM USER WHERE id = ?`;
    const _db = db.GetConnection();
    let res = _db.prepare(query).all(id);
    _db.close();
    if (res.length === 0) {
        return null;
    }
    let row = res[0];
    let user = new Model();
    user.id = row.id;
    user.username = row.username;
    user.password = row.password;
    return user;
}

_.SetPassword = (id, new_password) => {
    const query = `UPDATE USER SET password = ? WHERE id = ?`;
    const _db = db.GetConnection();
    _db.prepare(query).run(new_password, id);
    _db.close();
}

module.exports = _;
