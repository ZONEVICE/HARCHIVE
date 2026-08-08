const db = require('../core/db').getSharedConnection();

const _ = {};

const Model = require('./model');
const { ADMIN_USERNAME } = require('../core/constants');

// username is UNIQUE and case-insensitive: two accounts differing only in case would be two
//  logins a human reads as the same one, and login resolves an account by this column.
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
