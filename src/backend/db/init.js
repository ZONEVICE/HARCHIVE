const _ = {}

const Database = require('better-sqlite3')
const constants = require('../logical/constants')

const SettingsController = require('../controllers/settings');

_.create_database_file = () => {
    new Database(constants.DATABASE_FILE_PATH)
}

_.resolve_database_empty = () => {
    const _db = new Database(constants.DATABASE_FILE_PATH)
    let integrity = true
    try {
        _db.exec('SELECT * FROM SETTINGS')
    } catch (error) {
        integrity = false
    } finally {
        _db.close()
    }

    if (integrity === false) {
        console.warn('Warning: table SETTINGS does not exist. Recreating database...')
        SettingsController.create_table()
        SettingsController.insert_default_record()
        console.log('Database integrity restored.')
    }

    // todo user
    // todo profile
    // todo tags
    // todo element

}

module.exports = _
