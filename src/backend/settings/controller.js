const _ = {}

const constants = require('../logical/constants')
const SettingsModel = require('../models/settings')
const io = require('../helpers/io')
const db_init = require('../logical/db_init')
const json_helper = require('../helpers/json')

_.LoadData = () => {
    const json = io.read_json_file(constants.DATABASE_FILE_PATH_SETTINGS)
    let settings = new SettingsModel()
    settings = json_helper.JSONToClass(json, settings)
    return settings
}

_.SaveData = settings => {
    if (io.path_exists(constants.DATABASE_FILE_PATH_SETTINGS) === false)
        db_init.create_database_files();
    console.log(json_helper.ClassToJSON(settings))
    io.write_json_file(
        constants.DATABASE_FILE_PATH_SETTINGS,
        json_helper.ClassToJSON(settings)
    )
    return settings
}

module.exports = _
