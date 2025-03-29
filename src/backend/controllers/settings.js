const _ = {}

const Database = require('better-sqlite3')
const constants = require('../logical/constants')
const SettingsModel = require('../models/settings')
const ss = require('../db/settings')

_.create_table = () => {
    const db = new Database(constants.DATABASE_FILE_PATH)
    db.exec(ss.CREATE_TABLE)
    db.close()
}

_.insert_default_record = () => {
    const db = new Database(constants.DATABASE_FILE_PATH)
    db.exec(ss.INSERT_DEFAULT_RECORD)
    db.close()
}

_.load_data = () => {
    const db = new Database(constants.DATABASE_FILE_PATH)
    let res = db.prepare(ss.SELECT_ALL)
    res = res.get()
    db.close()
    sm = new SettingsModel(Object.values(res)[1], Object.values(res)[2])
    return sm
}

_.save_data = () => {

}

module.exports = _
