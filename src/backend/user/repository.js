const db = require('../core/db').getSharedConnection();

const _ = {};

const Model = require('./model');
const { ADMIN_USERNAME } = require('../core/constants');

// username is UNIQUE and case-insensitive. The collation sits on the column, so it decides two
//  things at once, both of them wanted: no second account may differ only in case, and every
//  `WHERE username = ?` in this file matches whatever the caller typed. That second half is the
//  login rule the owner asked for — `vice`, `ViCe` and `VICE` are one account, and signing in
//  works with any of them.
_.CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS user (
        id       INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password TEXT NOT NULL
    )
`;

_.createTable = () => db.prepare(_.CREATE_TABLE).run();

_.dropTable = () => db.prepare('DROP TABLE IF EXISTS user').run();

// A single-row read returns the model or null when there is no match, never undefined.
const readRow = (row) => {
    if (!row) return null;

    const user = new Model();
    user.setClass(row.id, row.username, row.password);
    return user;
}

_.post = (user) => db.prepare('INSERT INTO user (username, password) VALUES (?, ?)').run(user.username, user.password);

_.getByUsername = username => readRow(db.prepare('SELECT * FROM user WHERE username = ?').get(username));

_.getById = id => readRow(db.prepare('SELECT * FROM user WHERE id = ?').get(id));

// The admin user is just the user holding the name from constants.js.
_.getAdminUser = () => _.getByUsername(ADMIN_USERNAME);

_.setPassword = (id, new_password) => db.prepare('UPDATE user SET password = ? WHERE id = ?').run(new_password, id);

module.exports = _;
