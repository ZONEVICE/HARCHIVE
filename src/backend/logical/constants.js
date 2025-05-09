const { join } = require('path')

module.exports = {
    DATA_DIRECTORY: join(__dirname, '../data/'),
    DATABASE_FILE_PATH_SETTINGS: join(__dirname, '../data/settings.json'),
}
