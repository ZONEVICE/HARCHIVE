const _ = {}

const constants = require('../logical/constants')
const io = require('../helpers/io')
const SettingsModel = require('../models/settings');

_.create_database_files = () => {
    // Settings.
    if (io.path_exists(constants.DATABASE_FILE_PATH_SETTINGS) === false) {
        console.warn('Warning: settings database file not found. Creating...')
        const settings = new SettingsModel()
        io.create_file(
            constants.DATABASE_FILE_PATH_SETTINGS,
            JSON.stringify(settings.GetJSON())
        )
        console.log('Settings database file created.')
    }
}

module.exports = _
