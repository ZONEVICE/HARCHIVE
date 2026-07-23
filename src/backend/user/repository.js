const _ = {};

const db = require('../core/db');
const Model = require('./model');
const { ADMIN_USERNAME } = require('../core/constants');

_.CreateTable = () => {
    const query = `CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY,
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

_.Post = (user) => {
    const query = `INSERT INTO user (username, password) VALUES (?, ?)`;
    const _db = db.GetConnection();
    _db.prepare(query).run(user.username, user.password);
    _db.close();
}

_.LoadUserByUsername = username => {
    const query = `SELECT * FROM user WHERE username = ?`;
    const _db = db.GetConnection();
    let res = _db.prepare(query).all(username);
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

// The admin user is just the user holding the name from constants.js.
_.LoadAdminUser = () => _.LoadUserByUsername(ADMIN_USERNAME);

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
