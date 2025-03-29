const { join } = require('path')

module.exports = {
    DATA_DIRECTORY: join(__dirname, '../data/'),
    DATABASE_FILE_PATH: join(__dirname, '../data/database.db'),
}
