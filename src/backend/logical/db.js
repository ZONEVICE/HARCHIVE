const _ = {}

const { DATA_DIRECTORY, DATABASE_FILE_PATH } = require('../logical/constants')
const { PathExists, CreateDirectory, CreateFile } = require('./io')

_.CreateDatabaseFile = () => {
    if (PathExists(DATA_DIRECTORY) === false) {
        CreateDirectory(DATA_DIRECTORY);
    }
    if (PathExists(DATABASE_FILE_PATH) === false) {
        CreateFile(DATABASE_FILE_PATH, '');
    }
}

_.GetConnection = () => {
    const { DATABASE_FILE_PATH } = require('./constants')
    return require('better-sqlite3')(DATABASE_FILE_PATH);
}

module.exports = _
