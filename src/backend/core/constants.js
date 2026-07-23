const { join } = require('path')

module.exports = {
    DATA_DIRECTORY: join(__dirname, '../../data/'),
    DATABASE_FILE_PATH: join(__dirname, '../../data/harchive.db'),
    ADMIN_USERNAME: 'VICE',
    ADMIN_DEFAULT_PASSWORD: 'changeme',
    SESSION_COOKIE_NAME: 'harchive_session',
    SYSTEM_ENTITIES: ['directory', 'file', 'metadata', 'profile', 'relation', 'tag', 'user']
}
