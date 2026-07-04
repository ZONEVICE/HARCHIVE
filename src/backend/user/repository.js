const _ = {};

const db = require('../core/db');
const Model = require('./model');
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../core/constants');

_.CreateTable = () => {
    const query = `CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL
    )`;
    const _db = db.GetConnection();
    _db.exec(query);
    _db.close();
}

_.DropTable = () => {
    const query = `DROP TABLE IF EXISTS user`;
    const _db = db.GetConnection();
    _db.exec(query);
    _db.close();
}

_.CreateAdminUser = () => {
    const _db = db.GetConnection();
    let res = _db.prepare(`SELECT * FROM user WHERE username = ?`).all(ADMIN_USERNAME);
    if (res.length === 0) {
        const user = new Model();
        user.username = ADMIN_USERNAME;
        user.password = ADMIN_DEFAULT_PASSWORD;
        _db.prepare(`INSERT INTO user (id, username, password) VALUES (?, ?, ?)`)
            .run(user.id, user.username, user.password);
    }
    _db.close();
}

_.LoadAdminUser = () => {
    const query = `SELECT * FROM user WHERE username = ?`;
    const _db = db.GetConnection();
    let res = _db.prepare(query).all(ADMIN_USERNAME);
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

_.LoadUserById = id => {
    const query = `SELECT * FROM user WHERE id = ?`;
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
    const query = `UPDATE user SET password = ? WHERE id = ?`;
    const _db = db.GetConnection();
    _db.prepare(query).run(new_password, id);
    _db.close();
}

module.exports = _;
